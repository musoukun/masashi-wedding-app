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
		const uploadUrlWithName = `${UPLOAD_URL}?name=${userName}&openExternalBrowser=1`;

		if (event.message.type === "text") {
			// テキストメッセージの内容に基づいて処理を分岐
			switch (event.message.text) {
				case "写真アップロード":
					message = {
						type: "text",
						text: `${uploadUrlWithName}\n上記URLからみんながアップロードした結婚式の写真を見ることができます。\nアップロードしていただけるとうれしいです。\nアプリについて、不具合もあるかもしれないですが、お手柔らかに見てほしいです。\n何かあれば、新郎にお問い合わせください。`,
					};
					break;

				case "当日の式場の情報":
					message = {
						type: "text",
						text: "式場：アルモニーアンブラッセ　イットハウス\nアクセス：https://www.tgn.co.jp/wedding/osaka/hi/access/\nTel：06-7711-0081\n人前式10:00\n披露宴開宴11:00\n担当プランナー **吉原　久美子**",
					};
					break;

				case "アレルギー情報の入力":
					message = {
						type: "text",
						text: "当日のコース料理について、アレルギーのある方は\nお手数をおかけしますが、急ぎ新郎または新婦までご連絡ください。",
					};
					break;

				case "おしらせ":
					message = {
						type: "text",
						text: "お知らせ用文面",
					};
					break;

				case "座席表":
					message = {
						type: "text",
						text: "工事中",
					};
					break;

				case "ハロー":
					message = { type: "text", text: "ハローワールド" };
					break;

				default:
					message = { type: "text", text: "デフォルトメッセージ" };
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
