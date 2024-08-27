import { initializeApp } from "firebase/app";
import {
	getFirestore,
	collection,
	getDocs,
	getDoc,
	doc,
	updateDoc,
	arrayUnion,
	arrayRemove,
} from "firebase/firestore";
import { Image, User } from "../types";

const firebaseConfig = {
	apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
	authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
	databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
	projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
	storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.REACT_APP_FIREBASE_APP_ID,
	measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const getImages = async (): Promise<Image[]> => {
	const imagesCol = collection(db, "images");
	const imageSnapshot = await getDocs(imagesCol);
	return imageSnapshot.docs.map(
		(doc) =>
			({
				id: doc.id,
				...doc.data(),
			}) as Image
	);
};

export const toggleLike = async (
	imageId: string,
	userId: string
): Promise<void> => {
	const imageRef = doc(db, "images", imageId);
	const imageDoc = await getDoc(imageRef);
	const image = imageDoc.data() as Image;

	if (image.likes.includes(userId)) {
		await updateDoc(imageRef, {
			likes: arrayRemove(userId),
		});
	} else {
		await updateDoc(imageRef, {
			likes: arrayUnion(userId),
		});
	}
};

export const getUser = async (userId: string): Promise<User> => {
	const userRef = doc(db, "users", userId);
	const userDoc = await getDoc(userRef);
	return {
		id: userDoc.id,
		...userDoc.data(),
	} as User;
};
