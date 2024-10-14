import { useEffect, useState } from "react";
import Masonry from "react-masonry-css";
import { getMediaItems, getMediaUrl, MediaItem } from "../api/firebaseService";
import { useAuth } from "../hooks/useAuth";

export default function ImageGrid() {
	const [mediaItems, setMediaItems] = useState<
		(MediaItem & { url: string })[]
	>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const { user, loading: authLoading } = useAuth();

	useEffect(() => {
		const fetchMediaItems = async () => {
			if (!user) {
				setError("ログインしてください。");
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				const fetchedItems = await getMediaItems();
				const itemsWithUrls = await Promise.all(
					fetchedItems.map(async (item) => ({
						...item,
						url: await getMediaUrl(item.mediaPath),
					}))
				);
				setMediaItems(itemsWithUrls);
				setError(null);
			} catch (err) {
				console.error("Error fetching media items:", err);
				if (err instanceof Error) {
					setError(
						err.message === "User not authenticated"
							? "ログインしてください。"
							: "メディアの読み込みに失敗しました。後でもう一度お試しください。"
					);
				} else {
					setError(
						"メディアの読み込みに失敗しました。後でもう一度お試しください。"
					);
				}
			} finally {
				setIsLoading(false);
			}
		};

		if (!authLoading) {
			fetchMediaItems();
		}
	}, [authLoading, user]);

	if (authLoading || isLoading) {
		return <div className="text-center py-4">読み込み中...</div>;
	}

	if (error) {
		return (
			<div className="text-red-500 text-center py-4">
				<p>{error}</p>
				{error === "ログインしてください。" ? (
					<button
						onClick={() => {
							/* ログイン処理を実装 */
						}}
						className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
					>
						ログイン
					</button>
				) : (
					<button
						onClick={() => window.location.reload()}
						className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
					>
						ページを再読み込み
					</button>
				)}
			</div>
		);
	}

	const breakpointColumnsObj = {
		default: 4,
		1100: 3,
		700: 2,
		500: 1,
	};

	return (
		<Masonry
			breakpointCols={breakpointColumnsObj}
			className="flex w-auto"
			columnClassName="bg-clip-padding px-2"
		>
			{mediaItems.map((item) => (
				<div
					key={item.id}
					className="mb-4 bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200"
				>
					{item.mediaType === "image" ? (
						<img
							src={item.url}
							alt={`Uploaded by ${item.displayName}`}
							className="w-full object-cover h-auto"
							loading="lazy"
							onError={() => {
								console.error(
									`Failed to load image: ${item.url}`
								);
							}}
						/>
					) : (
						<video
							src={item.url}
							className="w-full h-auto"
							controls
							onError={() => {
								console.error(
									`Failed to load video: ${item.url}`
								);
							}}
						/>
					)}
					<div className="p-4">
						<p className="font-bold">{item.displayName}</p>
						<p className="text-sm text-gray-600">
							{new Date(item.timestamp).toLocaleString()}
						</p>
					</div>
				</div>
			))}
		</Masonry>
	);
}
