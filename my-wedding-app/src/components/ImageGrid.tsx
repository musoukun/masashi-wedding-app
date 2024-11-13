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
		<div className="min-h-screen bg-gray-50">
			{/* 固定ヘッダー */}
			<header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-95 shadow-md">
				<div className="relative py-1">
					{/* 装飾的な要素（左） - lg:hidden を削除 */}
					<div className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2">
						<div className="text-4xl lg:text-6xl">🤵</div>
					</div>

					{/* タイトル */}
					<div className="text-center">
						<h1 className="text-3xl font-serif text-gray-800">
							まさし & めぐみ
						</h1>
						<p className="text-sm text-gray-600 mt-1 font-serif">
							Wedding Photo Gallery
						</p>
					</div>

					{/* 装飾的な要素（右） - lg:hidden を削除 */}
					<div className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2">
						<div className="text-4xl lg:text-6xl">👰</div>
					</div>
				</div>
			</header>

			{/* メインコンテンツ */}
			<main className="pt-28">
				{/* お知らせゾーン */}
				<div className="mb-8 px-4 space-y-2">
					{/* 注意事項 */}
					<div className="bg-white border-l-4 border-rose-300 p-3 mx-auto max-w-2xl shadow-sm">
						<div className="flex">
							<div className="ml-3">
								<h3 className="text-lg font-medium text-gray-800 font-serif">
									ご利用に関する注意事項
								</h3>
								<div className="mt-2 text-sm text-gray-700">
									<ul className="list-disc list-inside space-y-1">
										<li>
											アップロードした写真は主催者が確認後、不適切な場合は削除される可能性があります。
										</li>
										<li>
											システムの不具合や問題がございましたら、新郎までご連絡ください。
										</li>
									</ul>
								</div>
							</div>
						</div>
					</div>

					{/* 使い方説明 */}
					<div className="bg-white border-l-4 border-blue-300 p-3 mx-auto max-w-2xl shadow-sm">
						<div className="flex">
							<div className="ml-3">
								<h3 className="text-lg font-medium text-gray-800 font-serif">
									操作方法
								</h3>
								<div className="mt-2 text-sm text-gray-700">
									<p>
										画像の「投稿者情報バー」（投稿者名と投稿時間が表示されている部分）をタップすると保存・削除メニューが表示されます。メニュー以外の部分をタップするとメニューは閉じます。
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* モバイル用レイアウト */}
				<div className="px-4">
					<div className="columns-2 gap-4 lg:hidden">
						{mediaItems.map((item) => (
							<div
								key={item.id}
								className="break-inside-avoid mb-4"
							>
								<ImageCard
									id={item.id}
									src={item.url}
									alt={`Uploaded by ${item.displayName}`}
									displayName={item.displayName}
									timestamp={item.timestamp}
									onDeleteRequest={handleDeleteRequest}
									mediaType={item.mediaType}
									mediaPath={item.mediaPath}
								/>
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
									<ImageCard
										id={item.id}
										src={item.url}
										alt={`Uploaded by ${item.displayName}`}
										displayName={item.displayName}
										timestamp={item.timestamp}
										onDeleteRequest={handleDeleteRequest}
										mediaType={item.mediaType}
										mediaPath={item.mediaPath}
									/>
								</div>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
