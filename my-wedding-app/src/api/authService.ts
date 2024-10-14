import { getAuth, signOut } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";

const auth = getAuth();
const db = getDatabase();

export interface User {
	id: string;
	displayName: string;
}

export const login = async (
	username: string,
	password: string
): Promise<User | null> => {
	if (password !== "1116") {
		throw new Error("Invalid password");
	}

	const userRef = ref(db, `users/${username}`);
	const snapshot = await get(userRef);

	if (snapshot.exists()) {
		const userData = snapshot.val();
		return { id: username, displayName: userData.displayName };
	} else {
		const newUser = { id: username, displayName: username };
		await set(userRef, newUser);
		return newUser;
	}
};

export const getCurrentUser = (): User | null => {
	const user = auth.currentUser;
	return user ? { id: user.uid, displayName: user.displayName || "" } : null;
};

export const logout = async (): Promise<void> => {
	try {
		await signOut(auth);
	} catch (error) {
		console.error("Error signing out:", error);
		throw error;
	}
};
