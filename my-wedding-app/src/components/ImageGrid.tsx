import { useEffect, useState } from "react";
import {
	getMediaItems,
	getMediaUrl,
	MediaItem,
	setDeleteFlag,
} from "../api/firebaseService";
// import Masonry from "react-masonry-css";
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

			{/* お知らせゾーン */}
			<div className="mb-8">
				<div className="bg-red-100 border-l-4 border-red-700 p-4 mx-auto max-w-2xl">
					<div className="flex">
						<div className="flex-shrink-0">
							<svg
								className="h-5 w-5 text-orange-400"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<h3 className="text-sm font-medium text-orange-800">
								ご利用に関する注意事項
							</h3>
							<div className="mt-2 text-sm text-orange-700">
								<ul className="list-disc list-inside space-y-1">
									<li>
										現在、保存機能に関して不具合が報告されています。修正中ですのでしばらくお待ちください。
										<br />
										ご迷惑をおかけして申し訳ございません。
									</li>

									<li>
										アップロードした写真は主催者が確認後、不適切な場合は削除される可能性があります。
									</li>
									<li>
										他にシステムの不具合や問題がございましたら、新郎までご連絡ください。
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* モバイル用レイアウト */}
			<div className="columns-2 gap-4 lg:hidden">
				{mediaItems.map((item) => (
					<div key={item.id} className="break-inside-avoid mb-4">
						<ImageCard
							id={item.id}
							src={item.url}
							alt={`Uploaded by ${item.displayName}`}
							displayName={item.displayName}
							timestamp={item.timestamp}
							onDeleteRequest={handleDeleteRequest}
							mediaType={item.mediaType}
							mediaPath={item.mediaPath} // 追加: mediaPathを渡す
						/>
					</div>
				))}
			</div>

			{/* デスクトップ用レイアウト */}
			<div className="hidden lg:block">
				<div className="columns-5 gap-4">
					{mediaItems.map((item) => (
						<div key={item.id} className="break-inside-avoid mb-4">
							<ImageCard
								id={item.id}
								src={item.url}
								alt={`Uploaded by ${item.displayName}`}
								displayName={item.displayName}
								timestamp={item.timestamp}
								onDeleteRequest={handleDeleteRequest}
								mediaType={item.mediaType}
								mediaPath={item.mediaPath} // 追加: mediaPathを渡す
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
