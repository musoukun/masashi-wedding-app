import { useEffect, useState } from "react";
import {
	getMediaItems,
	getMediaUrl,
	MediaItem,
	setDeleteFlag,
} from "../api/firebaseService";
import ImageCard from "./ImageCard";

export default function ImageGrid() {
	const [mediaItems, setMediaItems] = useState<
		(MediaItem & { url: string })[]
	>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchMediaItems = async () => {
			try {
				setIsLoading(true);
				const fetchedItems = await getMediaItems();
				const itemsWithUrls = await Promise.all(
					fetchedItems
						.filter((item) => !item.deleteflag)
						.map(async (item) => ({
							...item,
							url: await getMediaUrl(item.mediaPath),
						}))
				);
				setMediaItems(itemsWithUrls);
				setError(null);
			} catch (err) {
				console.error("Error fetching media items:", err);
				setError(
					"メディアの読み込みに失敗しました。後でもう一度お試しください。"
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMediaItems();
	}, []);

	const handleDeleteRequest = async (imageId: string) => {
		try {
			await setDeleteFlag(imageId);
			setMediaItems((prevItems) =>
				prevItems.filter((item) => item.id !== imageId)
			);
		} catch (err) {
			console.error("Error setting delete flag:", err);
			alert("削除申請に失敗しました。もう一度お試しください。");
		}
	};

	if (isLoading) {
		return <div className="text-center py-4">読み込み中...</div>;
	}

	if (error) {
		return (
			<div className="text-red-500 text-center py-4">
				<p>{error}</p>
				<button
					onClick={() => window.location.reload()}
					className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
				>
					ページを再読み込み
				</button>
			</div>
		);
	}

	return (
		<div className="bg-gray-100 min-h-screen p-4">
			<h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
				まさし & めぐみ イメージギャラリー
			</h1>

			{/* モバイル用レイアウト（2列） */}
			<div className="grid grid-cols-2 gap-4 lg:hidden">
				{mediaItems.map((item) => (
					<ImageCard
						key={item.id}
						id={item.id}
						src={item.url}
						alt={`Uploaded by ${item.displayName}`}
						displayName={item.displayName}
						timestamp={item.timestamp}
						onDeleteRequest={handleDeleteRequest}
						mediaType={item.mediaType}
					/>
				))}
			</div>

			{/* デスクトップ用レイアウト（5列） */}
			<div className="hidden lg:grid lg:grid-cols-5 lg:gap-4">
				{mediaItems.map((item) => (
					<ImageCard
						key={item.id}
						id={item.id}
						src={item.url}
						alt={`Uploaded by ${item.displayName}`}
						displayName={item.displayName}
						timestamp={item.timestamp}
						onDeleteRequest={handleDeleteRequest}
						mediaType={item.mediaType}
					/>
				))}
			</div>
		</div>
	);
}
