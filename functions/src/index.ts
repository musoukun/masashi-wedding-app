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

// アップロードURL（環境変数から取得するか、適切な値に置き換えてください）
const UPLOAD_URL = "https://my-wedding-2c03c.web.app/upload";

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

		let message: line.Message = {
			type: "text",
			text: "デフォルトメッセージ",
		};

		console.log("Received message:", event.message);
		console.log("Received message type:", event.message.type);

		// ユーザープロフィールを取得
		const profile = await client.getProfile(event.source.userId);
		const userName = encodeURIComponent(profile.displayName);
		const uploadUrlWithName = `${UPLOAD_URL}?name=${userName}`;

		if (event.message.type === "text") {
			if (event.message.text.toLowerCase() === "ハロー") {
				message = { type: "text", text: "ハローワールド" };
			}
		} else if (
			event.message.type === "image" ||
			event.message.type === "video"
		) {
			message = {
				type: "text",
				text: `対応していないメッセージです。結婚式の画像または動画をアップロードしたい場合は、下記のURLからアップロードしてください。\n${uploadUrlWithName}`,
			};
		} else if (
			event.message.type === "audio" ||
			event.message.type === "file"
		) {
			message = {
				type: "text",
				text: "サポートされていないメッセージタイプです。",
			};
		}

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
