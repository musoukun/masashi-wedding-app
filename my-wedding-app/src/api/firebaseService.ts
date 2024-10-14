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
	ref as storageRef,
	getDownloadURL,
	uploadBytes,
} from "firebase/storage";
import { getAuth } from "firebase/auth";

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

export const uploadMedia = async (
	file: File,
	userId: string,
	displayName: string
): Promise<string> => {
	try {
		const mediaRef = push(ref(db, "media"));
		const mediaId = mediaRef.key;
		if (!mediaId) throw new Error("Failed to generate media ID");

		const storageReference = storageRef(storage, `media/${file.name}`);
		await uploadBytes(storageReference, file);
		const mediaPath = `media/${file.name}`;

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
		console.error("Error uploading media:", error);
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
