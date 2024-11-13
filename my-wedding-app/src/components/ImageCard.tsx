import React, { useCallback, useState } from "react";
import { Download } from "lucide-react";

interface ImageCardProps {
	src: string;
	alt: string;
	id: string;
	displayName: string;
	timestamp: number;
	onDeleteRequest: (id: string) => void;
	mediaType: string;
	mediaPath: string;
}

const ImageCard: React.FC<ImageCardProps> = ({
	src,
	alt,
	id,
	displayName,
	timestamp,
	onDeleteRequest,
	mediaType,
	mediaPath,
}) => {
	const [isDownloading, setIsDownloading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [isControlsHovered, setIsControlsHovered] = useState(false);

	const handleDeleteRequest = useCallback(() => {
		const confirmed = window.confirm("本当にこの画像を削除申請しますか？");
		if (confirmed) {
			setIsDeleting(true);
			try {
				onDeleteRequest(id);
			} catch (error) {
				console.error("Delete request error:", error);
				alert("削除申請に失敗しました。もう一度お試しください。");
			} finally {
				setIsDeleting(false);
			}
		}
	}, [id, onDeleteRequest]);

	const handleDownload = useCallback(async () => {
		if (isDownloading) return;
		setIsDownloading(true);

		try {
			if (
				/iPad|iPhone|iPod/.test(navigator.userAgent) &&
				navigator.share
			) {
				const response = await fetch(src);
				const blob = await response.blob();
				const fileName = `${mediaPath.slice(-12)}`;
				const file = new File([blob], fileName, {
					type: mediaType === "image" ? "image/jpeg" : "video/mp4",
				});

				const shareData = {
					files: [file],
					title: "写真を保存",
					text: mediaType === "image" ? "写真を保存" : "動画を保存",
				};

				if (navigator.canShare && navigator.canShare(shareData)) {
					await navigator.share(shareData);
				} else {
					throw new Error("共有機能がサポートされていません");
				}
				return;
			}

			if (/Android/.test(navigator.userAgent)) {
				const response = await fetch(src);
				const blob = await response.blob();
				const blobUrl = URL.createObjectURL(blob);
				const fileName = `${mediaPath.slice(-12)}`;

				const link = document.createElement("a");
				link.href = blobUrl;
				link.download = fileName;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
				return;
			}

			const response = await fetch(src);
			const blob = await response.blob();
			const fileName = `${mediaPath.slice(-12)}`;

			const { saveAs } = await import("file-saver");
			saveAs(blob, fileName);
		} catch (error) {
			console.error("Download error:", error);

			let errorMessage = "ダウンロードに失敗しました。";
			if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
				if (
					error instanceof Error &&
					error.message === "共有機能がサポートされていません"
				) {
					errorMessage =
						"お使いのデバイスは共有機能をサポートしていません。";
				} else {
					errorMessage =
						"保存に失敗しました。もう一度お試しください。";
				}
			} else if (/Android/.test(navigator.userAgent)) {
				errorMessage = "保存に失敗しました。もう一度お試しください。";
			}

			alert(errorMessage);
		} finally {
			setIsDownloading(false);
		}
	}, [id, displayName, mediaPath, mediaType, timestamp, src, isDownloading]);

	const handleOverlayClick = (e: React.MouseEvent) => {
		// オーバーレイ自体がクリックされた場合のみホバー状態を解除
		if (e.target === e.currentTarget) {
			setIsHovered(false);
		}
	};

	return (
		<div className="relative rounded-lg overflow-hidden shadow-sm transition-transform transform hover:scale-105">
			<div className="w-full">
				{mediaType === "image" ? (
					<img
						src={src}
						alt={alt}
						className="w-full h-auto rounded-lg"
						loading="lazy"
					/>
				) : (
					<div className="relative">
						<video
							src={src}
							className="w-full h-auto rounded-lg"
							controls
							playsInline
							preload="metadata"
							onMouseEnter={() => setIsControlsHovered(true)}
							onMouseLeave={() => setIsControlsHovered(false)}
						>
							Your browser does not support the video tag.
						</video>
					</div>
				)}
			</div>

			{/* オーバーレイ - クリックイベントを追加 */}
			{isHovered && !isControlsHovered && (
				<div
					className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-evenly"
					onClick={handleOverlayClick}
				>
					<button
						onClick={handleDownload}
						disabled={isDownloading}
						className="flex mb-6 bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-2 rounded transition-colors"
					>
						<Download className="w-6 h-3 mr-1" />
						{isDownloading ? "保存中..." : "保存"}
					</button>
					<button
						onClick={handleDeleteRequest}
						disabled={isDeleting}
						className="bg-red-500 hover:bg-red-600 text-white text-xs py-2 px-4 rounded transition-colors"
					>
						{isDeleting ? "削除申請中..." : "削除申請"}
					</button>
				</div>
			)}

			{/* 投稿者情報バー - クリックでホバー状態を切り替え */}
			<div
				className="p-2 bg-white border-t border-gray-100 flex items-center justify-between cursor-pointer"
				onClick={() => setIsHovered(!isHovered)}
			>
				<div className="flex-1">
					<p className="text-sm font-medium text-gray-900 truncate">
						{displayName}
					</p>
					<p className="text-xs text-gray-500 truncate">
						{new Date(timestamp).toLocaleString()}
					</p>
				</div>
			</div>
		</div>
	);
};

export default ImageCard;
