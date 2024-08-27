export interface ImageData {
	src: string;
	height: number;
	likes: number;
}

export interface Image {
	id: string;
	userId: string;
	displayName: string;
	imageUrl: string;
	timestamp: Date;
	likes: string[];
}

export interface User {
	id: string;
	displayName: string;
	profileImageUrl: string;
}
