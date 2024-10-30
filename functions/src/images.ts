import * as admin from "firebase-admin";
import * as line from "@line/bot-sdk";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as crypto from "crypto";

class ImageProcessor {
	private firebaseAdmin: admin.app.App;
	private MessagingApiClient: line.messagingApi.MessagingApiClient;
	private MessagingApiBlobClient: line.messagingApi.MessagingApiBlobClient;
	private db: admin.database.Database;
	private storage: admin.storage.Storage;
	private uploadResults: {
		success: boolean;
		index: number;
		alreadyExists: boolean;
	}[] = [];

	constructor(
		firebaseAdmin: admin.app.App,
		MessagingApiClient: line.messagingApi.MessagingApiClient,
		config: { channelSecret: string; channelAccessToken: string }
	) {
		this.firebaseAdmin = firebaseAdmin;
		this.MessagingApiClient = MessagingApiClient;
		this.MessagingApiBlobClient =
			new line.messagingApi.MessagingApiBlobClient({
				channelAccessToken: config.channelAccessToken,
			});
		this.db = this.firebaseAdmin.database();
		this.storage = this.firebaseAdmin.storage();
	}

	// 新しく追加するメソッド
	private async getFileHash(filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const hash = crypto.createHash("sha256");
			const stream = fs.createReadStream(filePath);
			stream.on("data", (data) => hash.update(data));
			stream.on("end", () => resolve(hash.digest("hex")));
			stream.on("error", reject);
		});
	}

	private async checkFileExists(
		fileName: string,
		fileSize: number
	): Promise<boolean> {
		const bucket = this.storage.bucket();
		const file = bucket.file(`media/${fileName}`);
		try {
			const [exists] = await file.exists();
			if (exists) {
				const [metadata] = await file.getMetadata();
				return metadata.size === fileSize.toString();
			}
			return false;
		} catch (error) {
			console.error(`Error checking file existence: ${error}`);
			return false;
		}
	}

	async handleMediaMessages(events: line.WebhookEvent[]): Promise<void> {
		const mediaEvents = events.filter(
			(event): event is line.MessageEvent =>
				event.type === "message" &&
				(event.message.type === "image" ||
					event.message.type === "video")
		);

		if (mediaEvents.length === 0) {
			return;
		}

		const userId = mediaEvents[0].source.userId;
		if (!userId) {
			console.error("User ID not found in the event source");
			return;
		}

		this.uploadResults = [];

		for (const event of mediaEvents) {
			try {
				const mediaPath = await this.getLineMediaContent(
					event.message.id
				);
				const fileHash = await this.getFileHash(mediaPath);
				const fileSize = fs.statSync(mediaPath).size;
				const extension =
					event.message.type === "image" ? "jpg" : "mp4";
				const fileName = `${fileHash}.${extension}`;

				const exists = await this.checkFileExists(fileName, fileSize);

				if (exists) {
					this.uploadResults.push({
						success: true,
						index: this.uploadResults.length + 1,
						alreadyExists: true,
					});
				} else {
					const uploadedFile = await this.uploadMediaContent(
						mediaPath,
						fileName,
						event.message.type
					);
					await this.saveMessageInfo(event, uploadedFile, userId);
					this.uploadResults.push({
						success: true,
						index: this.uploadResults.length + 1,
						alreadyExists: false,
					});
				}
			} catch (error) {
				console.error(`Error processing media: ${error}`);
				this.uploadResults.push({
					success: false,
					index: this.uploadResults.length + 1,
					alreadyExists: false,
				});
			}
		}

		// 全ての処理が完了した後に1回だけ返信メッセージを送信
		await this.sendReplyMessage(mediaEvents[0].replyToken);
	}

	private async sendReplyMessage(replyToken: string) {
		const successfulUploads = this.uploadResults.filter(
			(result) => result.success && !result.alreadyExists
		).length;
		const alreadyExisted = this.uploadResults.filter(
			(result) => result.alreadyExists
		).length;
		const failedUploads = this.uploadResults.filter(
			(result) => !result.success
		);

		let replyMessage = "";

		if (successfulUploads === 0 && alreadyExisted === 0) {
			replyMessage =
				"メディアのアップロードに失敗しました。もう一度お試しください。";
		} else {
			replyMessage = `${successfulUploads}件のファイルが正常にアップロードされました`;
			if (alreadyExisted > 0) {
				replyMessage += `（${alreadyExisted}件はすでにアップロード済でした）`;
			}
			replyMessage += "ありがとうございます。";

			if (failedUploads.length > 0) {
				const failedIndices = failedUploads
					.map((result) => result.index)
					.join(", ");
				replyMessage += `\n${failedUploads.length}件のアップロードに失敗しました。失敗した画像: ${failedIndices}枚目`;
			}
		}

		await this.MessagingApiClient.replyMessage({
			replyToken: replyToken,
			messages: [{ type: "text", text: replyMessage }],
		});
	}

	private async getLineMediaContent(messageId: string): Promise<string> {
		const stream =
			await this.MessagingApiBlobClient.getMessageContent(messageId);
		const tempFilePath = path.join(os.tmpdir(), messageId);

		return new Promise((resolve, reject) => {
			const writable = fs.createWriteStream(tempFilePath);
			stream.pipe(writable);
			stream.on("end", () => resolve(tempFilePath));
			stream.on("error", reject);
		});
	}

	private async uploadMediaContent(
		mediaPath: string,
		messageId: string,
		mediaType: string
	) {
		const bucket = this.storage.bucket();
		const extension = mediaType === "image" ? "jpg" : "mp4";
		const destination = `media/${messageId}.${extension}`;
		const contentType = mediaType === "image" ? "image/jpeg" : "video/mp4";

		const [file] = await bucket.upload(mediaPath, {
			destination: destination,
			metadata: {
				contentType: contentType,
			},
		});

		// 一時ファイルを削除
		fs.unlinkSync(mediaPath);

		return file;
	}

	private async saveMessageInfo(
		event: line.MessageEvent,
		file: any,
		userId: string
	): Promise<void> {
		const userProfile = await this.MessagingApiClient.getProfile(userId);

		const mediaRef = this.db.ref("media").push();
		await mediaRef.set({
			userId: userId,
			displayName: userProfile.displayName,
			mediaPath: file.name, // Storageのファイルパスを保存
			mediaType: event.message.type,
			timestamp: admin.database.ServerValue.TIMESTAMP,
			likes: [],
		});

		await this.db.ref(`users/${userId}`).update({
			displayName: userProfile.displayName,
			profileImageUrl: userProfile.pictureUrl,
		});

		console.log(`Media info saved with ID: ${mediaRef.key}`);
	}
}

export { ImageProcessor };
