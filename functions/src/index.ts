import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as line from "@line/bot-sdk";
import { ImageProcessor } from "./images";

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

const imageProcessor = new ImageProcessor(admin.app(), client, config);

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
			await Promise.all(events.map(handleEvent));
			res.status(200).send("OK");
		} catch (err) {
			console.error("Error processing events:", err);
			res.status(500).send("Internal Server Error");
		}
	});

async function handleEvent(event: line.WebhookEvent): Promise<void> {
	if (event.type !== "message") {
		return;
	}

	const { replyToken } = event;
	let message: line.Message = {
		type: "text",
		text: "デフォルトメッセージ",
	};

	console.log("Received message:", event.message);
	console.log("Received message type:", event.message.type);

	if (event.message.type === "text") {
		if (event.message.text.toLowerCase() === "ハロー") {
			message = { type: "text", text: "ハローワールド" };
		}
	} else if (
		event.message.type === "image" ||
		event.message.type === "video" ||
		event.message.type === "audio" ||
		event.message.type === "file"
	) {
		await imageProcessor.handleImageMessage(event);
		message = {
			type: "text",
			text: "素敵な写真をありがとうございます！結婚式の思い出として大切に保存させていただきます。",
		};
	} else {
		message = {
			type: "text",
			text: "サポートされていないメッセージタイプです。",
		};
	}

	try {
		await client.replyMessage({
			replyToken: replyToken,
			messages: [message],
		});
		console.log("Reply sent successfully");
	} catch (err) {
		console.error("Error sending reply:", err);
	}
}
