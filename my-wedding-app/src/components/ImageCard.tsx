import React, { useState } from "react";

interface ImageCardProps {
	src: string;
	alt: string;
}

const ImageCard: React.FC<ImageCardProps> = ({ src, alt }) => {
	const [likes, setLikes] = useState(0);
	const [height] = useState(Math.floor(Math.random() * 200) + 200); // Random height between 200-400px

	const handleLike = () => {
		setLikes(likes + 1);
	};

	return (
		<div className="border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden">
			<img
				src={src}
				alt={alt}
				className="w-full object-cover"
				style={{ height: `${height}px` }}
			/>
			<div className="p-2 flex items-center">
				<button
					onClick={handleLike}
					className="bg-transparent border-none cursor-pointer text-2xl mr-2"
				>
					❤️
				</button>
				<span className="text-sm">{likes}</span>
			</div>
		</div>
	);
};

export default ImageCard;
