import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as line from "@line/bot-sdk";

admin.initializeApp();

// create LINE SDK config from env variables
const config = {
	channelSecret: functions.config().line.channel_secret,
	channelAccessToken: functions.config().line.channel_access_token,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
	channelAccessToken: functions.config().line.channel_access_token,
});

// アップロードとギャラリーのベースURL
const BASE_URL = "https://my-wedding-2c03c.web.app";
const UPLOAD_URL = `${BASE_URL}/upload`;
const GALLERY_URL = BASE_URL;

export const lineWebhook = functions
	.region("asia-northeast2")
	.https.onRequest(async (req, res) => {
		const signature = req.headers["x-line-signature"] as string;

		if (
			!line.validateSignature(
				req.rawBody,
				config.channelSecret,
				signature
			)
		) {
			res.status(400).send("Invalid signature");
			return;
		}

		try {
			const events: line.WebhookEvent[] = req.body.events;
			await handleEvents(events);
			res.status(200).send("OK");
		} catch (err) {
			console.error("Error processing events:", err);
			res.status(500).send("Internal Server Error");
		}
	});

async function handleEvents(events: line.WebhookEvent[]): Promise<void> {
	for (const event of events) {
		if (event.type !== "message" || event.source.type !== "user") {
			continue;
		}

		let message: line.Message | null = null; // nullで初期化

		console.log("Received message:", event.message);
		console.log("Received message type:", event.message.type);

		// ユーザープロフィールを取得
		const profile = await client.getProfile(event.source.userId);
		const userName = encodeURIComponent(profile.displayName);
		const uploadUrlWithName = `${UPLOAD_URL}?name=${userName}&openExternalBrowser=1`;
		const gyalleryUrlWithName = `${GALLERY_URL}?name=${userName}&openExternalBrowser=1`;

		if (event.message.type === "text") {
			// テキストメッセージの内容に基づいて処理を分岐
			switch (event.message.text) {
				case "写真アップロード":
					message = {
						type: "text",
						text: `${uploadUrlWithName}\n上記URLから写真を共有できます。\n写真をアップロードしてもらえると嬉しいです。\n\nまた下記のURLから結婚式の写真を見ることができます。\n${gyalleryUrlWithName}\nアプリについて何かあれば、新郎にお問い合わせください。`,
					};
					break;

				default:
					break;
			}
		} else if (
			event.message.type === "image" ||
			event.message.type === "video"
		) {
			// 既存の画像・動画メッセージ処理
			message = {
				type: "text",
				text: `対応していないメッセージです。結婚式の画像または動画をアップロードしたい場合は、下記のURLからアップロードしてください。\n${uploadUrlWithName}`,
			};
		} else if (
			event.message.type === "audio" ||
			event.message.type === "file"
		) {
			// 既存のその他メッセージ処理
			message = {
				type: "text",
				text: "サポートされていないメッセージタイプです。",
			};
		}

		if (message !== null) {
			try {
				await client.replyMessage({
					replyToken: event.replyToken,
					messages: [message],
				});
				console.log("Reply sent successfully");
			} catch (err) {
				console.error("Error sending reply:", err);
			}
		}
	}
}
