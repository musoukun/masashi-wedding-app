import { FirebaseError, initializeApp } from "firebase/app";
import {
	getDatabase,
	ref,
	get,
	update,
	push,
	query,
	orderByChild,
	limitToLast,
} from "firebase/database";
import {
	getStorage,
	getMetadata,
	ref as storageRef,
	getDownloadURL,
	listAll,
	uploadBytesResumable,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { SHA256 } from "crypto-js";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
	databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
	appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
console.log("Firebase auth:", auth);
const storage = getStorage(app);

export interface MediaItem {
	id: string;
	displayName: string;
	mediaPath: string;
	mediaType: string;
	timestamp: number;
	userId: string;
	deleteflag?: boolean;
}

export interface User {
	id: string;
	displayName: string;
	profileImageUrl: string;
}

export const getMediaItems = async (
	limit: number = 20
): Promise<MediaItem[]> => {
	try {
		const mediaRef = ref(db, "media");
		const mediaQuery = query(
			mediaRef,
			orderByChild("timestamp"),
			limitToLast(limit)
		);
		const snapshot = await get(mediaQuery);
		if (snapshot.exists()) {
			const mediaData = snapshot.val();
			const mediaItems = Object.entries(mediaData).map(([id, data]) => ({
				id,
				...(data as Omit<MediaItem, "id">),
			}));
			return mediaItems.reverse(); // 最新のアイテムを先頭に
		} else {
			console.log("No media items found");
			return [];
		}
	} catch (error) {
		console.error("Error fetching media items:", error);
		if (error instanceof FirebaseError) {
			console.error(`Firebase error (${error.code}): ${error.message}`);
		}
		throw error;
	}
};

export const getUser = async (userId: string): Promise<User> => {
	try {
		const userRef = ref(db, `users/${userId}`);
		const snapshot = await get(userRef);
		if (snapshot.exists()) {
			const userData = snapshot.val();
			return {
				id: userId,
				...userData,
			};
		} else {
			throw new Error(`User with id ${userId} not found`);
		}
	} catch (error) {
		console.error("Error fetching user:", error);
		if (error instanceof FirebaseError) {
			console.error(`Firebase error (${error.code}): ${error.message}`);
		}
		throw error;
	}
};

export const checkFileExists = async (
	fileHash: string,
	fileSize: number
): Promise<string | null> => {
	try {
		const mediaRef = storageRef(storage, "media");
		const fileList = await listAll(mediaRef);

		for (const item of fileList.items) {
			const metadata = await getMetadata(item);
			if (item.name.startsWith(fileHash) && metadata.size === fileSize) {
				return item.fullPath;
			}
		}
		return null;
	} catch (error) {
		console.error("ファイルの存在確認中にエラーが発生しました:", error);
		throw error;
	}
};

export const getFileHash = async (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const binary = e.target?.result;
			if (binary) {
				const hash = SHA256(binary as string).toString();
				resolve(hash);
			} else {
				reject(new Error("ファイルの読み込みに失敗しました"));
			}
		};
		reader.onerror = (error) => reject(error);
		reader.readAsBinaryString(file);
	});
};

// プログレスコールバックの型定義
export type UploadProgressCallback = (progress: number) => void;

// uploadMedia関数を修正
export const uploadMedia = async (
	file: File,
	userId: string,
	displayName: string,
	onProgress?: UploadProgressCallback, // プログレスコールバックを追加
	abortController?: AbortController // キャンセル用のコントローラーを追加
): Promise<string> => {
	try {
		const fileHash = await getFileHash(file);
		const extension = file.type.startsWith("image/") ? "jpg" : "mp4";
		const fileName = `${fileHash}.${extension}`;

		const existingFilePath = await checkFileExists(fileHash, file.size);
		if (existingFilePath) {
			console.log("同じファイルが既に存在します:", existingFilePath);

			// 既存のファイルの場合は100%進捗を通知
			if (onProgress) {
				onProgress(100);
			}

			const mediaRef = ref(db, "media");
			const mediaQuery = query(
				mediaRef,
				orderByChild("mediaPath"),
				limitToLast(1)
			);
			const snapshot = await get(mediaQuery);

			if (snapshot.exists()) {
				const mediaData = Object.values(snapshot.val())[0] as MediaItem;
				return mediaData.id;
			} else {
				throw new Error(
					"既存のファイルに関連するメディアデータが見つかりません"
				);
			}
		}

		const mediaRef = push(ref(db, "media"));
		const mediaId = mediaRef.key;
		if (!mediaId) throw new Error("メディアIDの生成に失敗しました");

		const storageReference = storageRef(storage, `media/${fileName}`);

		// uploadBytesResumableを使用してアップロード
		const uploadTask = uploadBytesResumable(storageReference, file);

		// キャンセル処理の設定
		if (abortController) {
			abortController.signal.addEventListener("abort", () => {
				uploadTask.cancel();
			});
		}

		// プログレス監視を設定
		await new Promise<void>((resolve, reject) => {
			uploadTask.on(
				"state_changed",
				(snapshot) => {
					// プログレスの計算と通知
					const progress =
						(snapshot.bytesTransferred / snapshot.totalBytes) * 100;
					if (onProgress) {
						onProgress(progress);
					}
				},
				(error) => {
					// エラーハンドリング
					console.error(
						"アップロード中にエラーが発生しました:",
						error
					);
					reject(error);
				},
				() => {
					// 完了時
					resolve();
				}
			);
		});

		const mediaPath = `media/${fileName}`;
		const mediaData = {
			displayName,
			mediaPath,
			mediaType: file.type.startsWith("image/") ? "image" : "video",
			timestamp: Date.now(),
			userId,
		};

		await update(mediaRef, mediaData);
		return mediaId;
	} catch (error) {
		console.error("メディアのアップロード中にエラーが発生しました:", error);
		throw error;
	}
};

export const getMediaUrl = async (mediaPath: string): Promise<string> => {
	try {
		const mediaRef = storageRef(storage, mediaPath);
		return await getDownloadURL(mediaRef);
	} catch (error) {
		console.error("Error getting media URL:", error);
		throw error;
	}
};

export const setDeleteFlag = async (imageId: string): Promise<void> => {
	const mediaRef = ref(db, `media/${imageId}`);
	await update(mediaRef, { deleteflag: true });
};

// 全メディアアイテムをZIPでダウンロードする関数
export const downloadAllMediaAsZip = async (
	onProgress?: (progress: number) => void
): Promise<void> => {
	try {
		// 全メディアアイテムを取得
		const mediaItems = await getMediaItems(1000); // 上限を設定
		const zip = new JSZip();
		let downloadedCount = 0;

		// フィルタリング（削除フラグがないものだけ）
		const activeItems = mediaItems.filter((item) => !item.deleteflag);

		for (const item of activeItems) {
			try {
				const url = await getMediaUrl(item.mediaPath);
				const response = await fetch(url);
				const blob = await response.blob();

				// ファイル名を生成（タイムスタンプと元の拡張子を使用）
				const extension = item.mediaType === "image" ? "jpg" : "mp4";
				const fileName = `${new Date(item.timestamp).toISOString()}_${item.displayName}.${extension}`;

				zip.file(fileName, blob);

				downloadedCount++;
				if (onProgress) {
					onProgress((downloadedCount / activeItems.length) * 100);
				}
			} catch (error) {
				console.error(
					`Error downloading file: ${item.mediaPath}`,
					error
				);
			}
		}

		// ZIPファイルを生成してダウンロード
		const content = await zip.generateAsync({
			type: "blob",
			compression: "DEFLATE",
			compressionOptions: {
				level: 6,
			},
		});

		saveAs(content, "wedding-media.zip");
	} catch (error) {
		console.error("Error creating ZIP file:", error);
		throw error;
	}
};
