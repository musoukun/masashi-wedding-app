import { useEffect, useState } from "react";
import { getMediaItems, getMediaUrl, MediaItem } from "../api/firebaseService";

export default function ViewOnlyImageGrid() {
	const [mediaItems, setMediaItems] = useState<
		(MediaItem & { url: string })[]
	>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchMediaItems = async () => {
			try {
				setIsLoading(true);
				const fetchedItems = await getMediaItems(1000); // より多くのアイテムを取得
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
		<div className="min-h-screen bg-gray-50">
			<header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-95 shadow-md">
				<div className="relative py-1">
					<div className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2">
						<div className="text-4xl lg:text-6xl">🤵</div>
					</div>

					<div className="text-center">
						<h1 className="text-3xl font-serif text-gray-800">
							まさし & めぐみ
						</h1>
						<p className="text-sm text-gray-600 mt-1 font-serif">
							Wedding Photo Gallery
						</p>
					</div>

					<div className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2">
						<div className="text-4xl lg:text-6xl">👰</div>
					</div>
				</div>
			</header>

			<main className="pt-28">
				<div className="px-4">
					{/* モバイル用レイアウト */}
					<div className="columns-2 gap-4 lg:hidden">
						{mediaItems.map((item) => (
							<div
								key={item.id}
								className="break-inside-avoid mb-4"
							>
								<img
									src={item.url}
									alt={`Uploaded by ${item.displayName}`}
									className="w-full h-auto rounded-lg shadow-md"
									loading="lazy"
								/>
								<div className="mt-2 text-sm text-gray-600">
									<p className="font-medium">
										{item.displayName}
									</p>
									<p>
										{new Date(
											item.timestamp
										).toLocaleDateString()}
									</p>
								</div>
							</div>
						))}
					</div>

					{/* デスクトップ用レイアウト */}
					<div className="hidden lg:block">
						<div className="columns-5 gap-4">
							{mediaItems.map((item) => (
								<div
									key={item.id}
									className="break-inside-avoid mb-4"
								>
									<img
										src={item.url}
										alt={`Uploaded by ${item.displayName}`}
										className="w-full h-auto rounded-lg shadow-md"
										loading="lazy"
									/>
									<div className="mt-2 text-sm text-gray-600">
										<p className="font-medium">
											{item.displayName}
										</p>
										<p>
											{new Date(
												item.timestamp
											).toLocaleDateString()}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
