import { FirebaseError, initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, push } from "firebase/database";
import { Image, User } from "../types";
import { getAuth } from "firebase/auth";
import {
	getStorage,
	ref as storageRef,
	getDownloadURL,
	uploadBytes,
} from "firebase/storage";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

console.log(
	"Firebase initialized with config:",
	JSON.stringify(firebaseConfig, null, 2)
);
console.log("Realtime Database instance:", db);
console.log("Auth instance:", auth);
console.log("Storage instance:", storage);

export const getImages = async (): Promise<Image[]> => {
	try {
		const imagesRef = ref(db, "images");
		const snapshot = await get(imagesRef);
		if (snapshot.exists()) {
			const imagesData = snapshot.val();
			const images = await Promise.all(
				Object.entries(imagesData).map(async ([id, data]) => {
					const imageRef = storageRef(storage, `images/${id}`);
					const url = await getDownloadURL(imageRef);
					return {
						id,
						imageUrl: url,
						...(data as Omit<Image, "id" | "imageUrl">),
					};
				})
			);
			console.log(`Retrieved ${images.length} images`);
			return images;
		} else {
			console.log("No images found");
			return [];
		}
	} catch (error) {
		console.error("Error fetching images:", error);
		if (error instanceof FirebaseError) {
			console.error("Firebase error code:", error.code);
			console.error("Firebase error message:", error.message);
		}
		throw error;
	}
};

export const toggleLike = async (
	imageId: string,
	userId: string
): Promise<void> => {
	try {
		const imageRef = ref(db, `images/${imageId}`);
		const snapshot = await get(imageRef);
		if (snapshot.exists()) {
			const image = snapshot.val() as Image;
			let updatedLikes = image.likes || [];
			if (updatedLikes.includes(userId)) {
				updatedLikes = updatedLikes.filter((id) => id !== userId);
				console.log(
					`Removed like for image ${imageId} by user ${userId}`
				);
			} else {
				updatedLikes.push(userId);
				console.log(
					`Added like for image ${imageId} by user ${userId}`
				);
			}
			await update(imageRef, { likes: updatedLikes });
		} else {
			console.error(`Image with id ${imageId} not found`);
		}
	} catch (error) {
		console.error("Error toggling like:", error);
		throw error;
	}
};

export const getUser = async (userId: string): Promise<User> => {
	try {
		const userRef = ref(db, `users/${userId}`);
		const snapshot = await get(userRef);
		if (snapshot.exists()) {
			const userData = snapshot.val();
			console.log(`Retrieved user data for ${userId}:`, userData);
			return {
				id: userId,
				...userData,
			} as User;
		} else {
			console.error(`User with id ${userId} not found`);
			throw new Error(`User not found: ${userId}`);
		}
	} catch (error) {
		console.error("Error fetching user:", error);
		if (error instanceof FirebaseError) {
			console.error("Firebase error code:", error.code);
			console.error("Firebase error message:", error.message);
		}
		throw error;
	}
};

export const uploadImage = async (
	file: File,
	userId: string,
	displayName: string
): Promise<string> => {
	try {
		const imageRef = push(ref(db, "images"));
		const imageId = imageRef.key;
		if (!imageId) throw new Error("Failed to generate image ID");

		const storageReference = storageRef(storage, `images/${imageId}`);
		await uploadBytes(storageReference, file);
		const downloadURL = await getDownloadURL(storageReference);

		const imageData = {
			userId,
			displayName,
			imageUrl: downloadURL,
			timestamp: Date.now(),
			likes: [],
		};

		await update(imageRef, imageData);

		console.log(`Image uploaded successfully. ID: ${imageId}`);
		return imageId;
	} catch (error) {
		console.error("Error uploading image:", error);
		throw error;
	}
};
