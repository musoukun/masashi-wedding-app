import React, { useEffect, useState } from "react";
import { Image } from "../types";
import { getImages, toggleLike } from "../api/firebaseService";
import { useAuth } from "../hooks/useAuth";

const ImageGrid: React.FC = () => {
	const [images, setImages] = useState<Image[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const { user, loading: authLoading } = useAuth();

	useEffect(() => {
		const fetchImages = async () => {
			try {
				setIsLoading(true);
				const fetchedImages = await getImages();
				console.log("Fetched images:", fetchedImages);
				setImages(fetchedImages);
			} catch (err) {
				console.error("Error fetching images:", err);
				setError("Failed to load images. Please try again later.");
			} finally {
				setIsLoading(false);
			}
		};

		if (!authLoading) {
			fetchImages();
		}
	}, [authLoading]);

	const handleLike = async (imageId: string) => {
		if (!user) {
			console.warn("Cannot like: No current user");
			setError("Please log in to like images.");
			return;
		}

		try {
			await toggleLike(imageId, user.id);
			const updatedImages = await getImages();
			setImages(updatedImages);
			console.log("Like toggled and images updated");
		} catch (err) {
			console.error("Error toggling like:", err);
			setError("Failed to update like. Please try again.");
		}
	};

	if (authLoading || isLoading) {
		return <div className="text-center py-4">Loading...</div>;
	}

	if (error) {
		return <div className="text-red-500 text-center py-4">{error}</div>;
	}

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
							{typeof image.timestamp === "number"
								? new Date(image.timestamp).toLocaleString()
								: "Invalid Date"}
						</p>
						<button
							onClick={() => handleLike(image.id)}
							className={`mt-2 px-4 py-2 rounded ${
								user &&
								image.likes &&
								image.likes.includes(user.id)
									? "bg-red-500 text-white"
									: "bg-gray-200 text-gray-800"
							}`}
							disabled={!user}
						>
							❤️ {image.likes ? image.likes.length : 0}
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

export default ImageGrid;
