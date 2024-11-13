import {
	getDatabase,
	ref,
	get,
	update,
	push,
	query,
	orderByChild,
	remove,
	set,
	equalTo,
} from "firebase/database";
import {
	getDownloadURL,
	getMetadata,
	// getMetadata,
	getStorage,
	ref as storageRef,
	updateMetadata,
	// updateMetadata,
	uploadBytesResumable,
} from "firebase/storage";
import { checkFileExists, getFileHash } from "./firebaseService";

const db = getDatabase();
const storage = getStorage();

// インターフェース定義
export interface MonacoMediaItem {
	id: string;
	displayName: string;
	mediaPath: string;
	mediaType: string;
	timestamp: number;
	userId: string;
	deleteflag?: boolean;
	title?: string;
	description?: string;
	folder: string;
}

export interface Comment {
	id: string;
	mediaId: string;
	userId: string;
	displayName: string;
	text: string;
	timestamp: number;
}

// ファイルタイプ判定を行うヘルパー関数
const getMediaType = (file: File): { type: string; extension: string } => {
	const fileName = file.name.toLowerCase();

	// 動画ファイルの判定
	if (file.type.startsWith("video/") || fileName.endsWith(".mts")) {
		// MTSファイルの場合はMP4として保存
		const extension = fileName.endsWith(".mts") ? "mp4" : "mp4";
		return { type: "video", extension };
	}

	// 画像ファイルの判定
	if (file.type.startsWith("image/")) {
		return { type: "image", extension: "jpg" };
	}

	throw new Error("未対応のファイル形式です");
};

// Monaco用のメディア取得
export const getMonacoMediaItems = async (): Promise<MonacoMediaItem[]> => {
	try {
		const mediaRef = ref(db, "media");
		const mediaQuery = query(
			mediaRef,
			orderByChild("folder"),
			equalTo("monaco")
		);

		const snapshot = await get(mediaQuery);
		if (snapshot.exists()) {
			const mediaData = snapshot.val();
			const mediaItems = Object.entries(mediaData)
				.map(([id, data]) => ({
					id,
					...(data as Omit<MonacoMediaItem, "id">),
				}))
				.filter((item) => !item.deleteflag)
				.sort((a, b) => b.timestamp - a.timestamp);
			return mediaItems;
		}
		return [];
	} catch (error) {
		console.error("Error fetching Monaco media items:", error);
		throw error;
	}
};

// Monaco用のメディアアップロード
export const uploadMonacoMedia = async (
	file: File,
	userId: string,
	displayName: string,
	title: string,
	description: string,
	onProgress?: (progress: number) => void,
	abortController?: AbortController
): Promise<string> => {
	try {
		const fileHash = await getFileHash(file);
		const { type, extension } = getMediaType(file);
		const fileName = `monaco/${fileHash}.${extension}`;

		const existingFilePath = await checkFileExists(fileHash, file.size);
		if (existingFilePath) {
			if (onProgress) {
				onProgress(100);
			}

			const mediaRef = ref(db, "media");
			const mediaQuery = query(mediaRef, orderByChild("mediaPath"));
			const snapshot = await get(mediaQuery);

			if (snapshot.exists()) {
				const mediaData = Object.values(
					snapshot.val()
				)[0] as MonacoMediaItem;
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

		// メタデータを設定 (MTSファイルの場合はvideo/mp4として設定)
		const metadata = {
			contentType: type === "video" ? "video/mp4" : file.type,
			customMetadata: {
				uploadedBy: displayName,
				originalName: file.name,
			},
		};

		const uploadTask = uploadBytesResumable(
			storageReference,
			file,
			metadata
		);

		if (abortController) {
			abortController.signal.addEventListener("abort", () => {
				uploadTask.cancel();
			});
		}

		await new Promise<void>((resolve, reject) => {
			uploadTask.on(
				"state_changed",
				(snapshot) => {
					const progress =
						(snapshot.bytesTransferred / snapshot.totalBytes) * 100;
					if (onProgress) {
						onProgress(progress);
					}
				},
				(error) => {
					console.error(
						"アップロード中にエラーが発生しました:",
						error
					);
					reject(error);
				},
				() => {
					resolve();
				}
			);
		});

		const mediaPath = `media/${fileName}`;
		const mediaData: Partial<MonacoMediaItem> = {
			id: mediaId,
			displayName,
			mediaPath,
			mediaType: type,
			timestamp: Date.now(),
			userId,
			folder: "monaco",
		};

		if (title.trim()) {
			mediaData.title = title;
		}
		if (description.trim()) {
			mediaData.description = description;
		}

		await update(mediaRef, mediaData);
		return mediaId;
	} catch (error) {
		console.error("メディアのアップロード中にエラーが発生しました:", error);
		throw error;
	}
};

// コメント関連の機能
export const addComment = async (
	mediaId: string,
	userId: string,
	displayName: string,
	text: string
): Promise<Comment> => {
	try {
		const commentRef = push(ref(db, `comments/${mediaId}`));
		const commentId = commentRef.key;
		if (!commentId) throw new Error("コメントIDの生成に失敗しました");

		const comment: Comment = {
			id: commentId,
			mediaId,
			userId,
			displayName,
			text,
			timestamp: Date.now(),
		};

		await set(commentRef, comment);
		return comment;
	} catch (error) {
		console.error("Error adding comment:", error);
		throw error;
	}
};

export const getComments = async (mediaId: string): Promise<Comment[]> => {
	try {
		const commentsRef = ref(db, `comments/${mediaId}`);
		const snapshot = await get(commentsRef);
		if (snapshot.exists()) {
			const commentsData = snapshot.val();
			return Object.values(commentsData) as Comment[];
		}
		return [];
	} catch (error) {
		console.error("Error fetching comments:", error);
		throw error;
	}
};

export const deleteComment = async (
	mediaId: string,
	commentId: string
): Promise<void> => {
	try {
		await remove(ref(db, `comments/${mediaId}/${commentId}`));
	} catch (error) {
		console.error("Error deleting comment:", error);
		throw error;
	}
};

// メディアの完全削除（管理者用）
export const deleteMonacoMedia = async (mediaId: string): Promise<void> => {
	try {
		// メディアの削除
		await remove(ref(db, `media/${mediaId}`));
		// 関連コメントの削除
		await remove(ref(db, `comments/${mediaId}`));
	} catch (error) {
		console.error("Error deleting media:", error);
		throw error;
	}
};

// メディア情報の更新
export const updateMonacoMedia = async (
	mediaId: string,
	updates: Partial<MonacoMediaItem>
): Promise<void> => {
	try {
		const mediaRef = ref(db, `media/${mediaId}`);
		await update(mediaRef, updates);
	} catch (error) {
		console.error("Error updating media:", error);
		throw error;
	}
};

// メディアURLの取得をラップ
export const getMonacoMediaUrl = async (mediaPath: string): Promise<string> => {
	try {
		const mediaRef = storageRef(storage, mediaPath);

		// 動画ファイルの場合、メタデータを確認して修正
		if (mediaPath.toLowerCase().endsWith(".mp4")) {
			const metadata = await getMetadata(mediaRef);

			// Content-Typeが正しくない場合は更新
			if (metadata.contentType !== "video/mp4") {
				await updateMetadata(mediaRef, {
					contentType: "video/mp4",
					customMetadata: {
						...metadata.customMetadata,
						audioEnabled: "true", // 音声フラグを追加
					},
				});
			}
		}

		const url = await getDownloadURL(mediaRef);
		console.log("Media URL Content-Type:", mediaPath, url); // URLをログ出力
		return url;
	} catch (error) {
		console.error("Error getting media URL:", error);
		throw error;
	}
};
