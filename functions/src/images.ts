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

	async handleImageMessage(event: line.MessageEvent): Promise<void> {
		if (event.message.type !== "image") {
			return;
		}

		const userId = event.source.userId;
		if (!userId) {
			console.error("User ID not found in the event source");
			return;
		}

		const imagePath = await this.getLineImageContent(event.message.id);
		const uploadedFile = await this.uploadImageContent(
			imagePath,
			event.message.id
		);
		await this.saveMessageInfo(event, uploadedFile, userId);

		await this.MessagingApiClient.replyMessage({
			replyToken: event.replyToken,
			messages: [
				{
					type: "text",
					text: "画像が正常にアップロードされました。ありがとうございます！",
				},
			],
		});
	}

	private async getLineImageContent(messageId: string): Promise<string> {
		const stream =
			await this.MessagingApiBlobClient.getMessageContent(messageId);
		const tempFilePath = path.join(os.tmpdir(), `${messageId}.jpg`);

		return new Promise((resolve, reject) => {
			const writable = fs.createWriteStream(tempFilePath);
			stream.pipe(writable);
			stream.on("end", () => resolve(tempFilePath));
			stream.on("error", reject);
		});
	}

	private async uploadImageContent(imagePath: string, messageId: string) {
		const bucket = this.storage.bucket();
		const destination = `images/${messageId}.jpg`;
		const [file] = await bucket.upload(imagePath, {
			destination: destination,
			metadata: {
				contentType: "image/jpeg",
			},
		});

		// 一時ファイルを削除
		fs.unlinkSync(imagePath);

		return file;
	}

	private async saveMessageInfo(
		event: line.MessageEvent,
		file: any,
		userId: string
	): Promise<void> {
		const [url] = await file.getSignedUrl({
			action: "read",
			expires: "03-01-2500",
		});

		const userProfile = await this.MessagingApiClient.getProfile(userId);

		const imageRef = this.db.ref("images").push();
		await imageRef.set({
			userId: userId,
			displayName: userProfile.displayName,
			imageUrl: url,
			timestamp: admin.database.ServerValue.TIMESTAMP,
			likes: [],
		});

		await this.db.ref(`users/${userId}`).update({
			displayName: userProfile.displayName,
			profileImageUrl: userProfile.pictureUrl,
		});

		console.log(`Image info saved with ID: ${imageRef.key}`);
	}
}

export { ImageProcessor };
