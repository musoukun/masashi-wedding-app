import * as admin from "firebase-admin";
import * as line from "@line/bot-sdk";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

class ImageProcessor {
	private firebaseAdmin: admin.app.App;
	private MessagingApiClient: line.messagingApi.MessagingApiClient;
	private MessagingApiBlobClient: line.messagingApi.MessagingApiBlobClient;
	private db: admin.database.Database;
	private storage: admin.storage.Storage;

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

		for (const event of mediaEvents) {
			const mediaPath = await this.getLineMediaContent(event.message.id);
			const uploadedFile = await this.uploadMediaContent(
				mediaPath,
				event.message.id,
				event.message.type
			);
			await this.saveMessageInfo(event, uploadedFile, userId);
		}

		// 一度だけメッセージを返信
		await this.MessagingApiClient.replyMessage({
			replyToken: mediaEvents[0].replyToken,
			messages: [
				{
					type: "text",
					text: `${mediaEvents.length}件のメディアが正常にアップロードされました。ありがとうございます！`,
				},
			],
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
