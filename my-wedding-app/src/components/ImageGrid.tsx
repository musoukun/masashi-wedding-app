import React, { useEffect, useState } from "react";
import { Image, User } from "../types";
import { getImages, toggleLike, getUser } from "../api/firebaseService";

const ImageGrid: React.FC = () => {
	const [images, setImages] = useState<Image[]>([]);
	const [currentUser, setCurrentUser] = useState<User | null>(null);

	useEffect(() => {
		const fetchImages = async () => {
			const fetchedImages = await getImages();
			setImages(fetchedImages);
		};

		const fetchCurrentUser = async () => {
			// Assume we have the current user's ID from somewhere (e.g., authentication)
			const userId = "current-user-id";
			const user = await getUser(userId);
			setCurrentUser(user);
		};

		fetchImages();
		fetchCurrentUser();
	}, []);

	const handleLike = async (imageId: string) => {
		if (!currentUser) return;

		await toggleLike(imageId, currentUser.id);
		const updatedImages = await getImages();
		setImages(updatedImages);
	};

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
			{images.map((image) => (
				<div
					key={image.id}
					className="border rounded-lg overflow-hidden shadow-lg"
				>
					<img
						src={image.imageUrl}
						alt={`Uploaded by ${image.displayName}`}
						className="w-full h-64 object-cover"
					/>
					<div className="p-4">
						<p className="font-bold">{image.displayName}</p>
						<p className="text-sm text-gray-600">
							{image.timestamp.toLocaleString()}
						</p>
						<button
							onClick={() => handleLike(image.id)}
							className={`mt-2 px-4 py-2 rounded ${
								currentUser &&
								image.likes.includes(currentUser.id)
									? "bg-red-500 text-white"
									: "bg-gray-200 text-gray-800"
							}`}
						>
							❤️ {image.likes.length}
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

export default ImageGrid;
