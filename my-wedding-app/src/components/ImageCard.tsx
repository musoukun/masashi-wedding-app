import React from "react";

interface ImageCardProps {
	src: string;
	alt: string;
	id: string;
	displayName: string;
	timestamp: number;
	onDeleteRequest: (id: string) => void;
	mediaType: string;
}

const ImageCard: React.FC<ImageCardProps> = ({
	src,
	alt,
	id,
	displayName,
	timestamp,
	onDeleteRequest,
	mediaType,
}) => {
	const handleDeleteRequest = () => {
		if (window.confirm("削除申請しますか？（はい/いいえ）")) {
			onDeleteRequest(id);
		}
	};

	return (
		<div className="border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden">
			{mediaType === "image" ? (
				<img
					src={src}
					alt={alt}
					className="w-full object-cover h-auto"
				/>
			) : (
				<video
					src={src}
					className="w-full h-auto"
					controls
					playsInline
					preload="metadata"
				>
					Your browser does not support the video tag.
				</video>
			)}
			<div className="p-4">
				<p className="font-bold">{displayName}</p>
				<p className="text-sm text-gray-600">
					{new Date(timestamp).toLocaleString()}
				</p>
				<button
					onClick={handleDeleteRequest}
					className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-sm"
				>
					削除申請
				</button>
			</div>
		</div>
	);
};

export default ImageCard;
