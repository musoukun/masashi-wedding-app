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
	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	const isAndroid = /Android/.test(navigator.userAgent);

	const handleDownload = useCallback(async () => {
		if (isDownloading) return;
		setIsDownloading(true);

		try {
			if (isIOS && navigator.share) {
				// iOS向けの処理: Web Share APIを使用
				const response = await fetch(src);
				const blob = await response.blob();
				const extension = mediaType === "image" ? "jpg" : "mp4";
				const fileName = `${displayName}_${new Date(timestamp).toISOString()}.${extension}`;
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

			if (isAndroid) {
				// Android向けの処理
				const response = await fetch(src);
				const blob = await response.blob();
				const blobUrl = URL.createObjectURL(blob);
				const extension = mediaType === "image" ? "jpg" : "mp4";
				const fileName = `${displayName}_${new Date(timestamp).toISOString()}.${extension}`;

				const link = document.createElement("a");
				link.href = blobUrl;
				link.download = fileName;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
				return;
			}

			// PC向けの処理
			const response = await fetch(src);
			const blob = await response.blob();
			const extension = mediaType === "image" ? "jpg" : "mp4";
			const fileName = `${displayName}_${new Date(timestamp).toISOString()}.${extension}`;

			// file-saverを使用
			const { saveAs } = await import("file-saver");
			saveAs(blob, fileName);
		} catch (error) {
			console.error("Download error:", error);

			let errorMessage = "ダウンロードに失敗しました。";
			if (isIOS) {
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
			} else if (isAndroid) {
				errorMessage = "保存に失敗しました。もう一度お試しください。";
			}

			alert(errorMessage);
		} finally {
			setIsDownloading(false);
		}
	}, [id, displayName, mediaPath, mediaType, timestamp, src, isDownloading]);

	// デバイスに応じてボタンのラベルを取得
	const getButtonInfo = () => {
		if (isDownloading) return { label: "保存中...", hint: "" };
		if (isIOS)
			return {
				label: mediaType === "image" ? "写真を保存" : "動画を保存",
				hint: "",
			};
		if (isAndroid) return { label: "保存", hint: "" };
		return { label: "保存", hint: "" };
	};

	const buttonInfo = getButtonInfo();

	return (
		<div className="bg-white rounded-lg shadow-sm overflow-hidden">
			{mediaType === "image" ? (
				<div className="w-full">
					<img
						src={src}
						alt={alt}
						className="w-full h-auto"
						loading="lazy"
						onContextMenu={(e) => {
							if (!isIOS) {
								e.preventDefault();
							}
						}}
					/>
				</div>
			) : (
				<div className="w-full">
					<video
						src={src}
						className="w-full h-auto"
						controls
						playsInline
						preload="metadata"
					>
						Your browser does not support the video tag.
					</video>
				</div>
			)}

			<div className="p-2 bg-white border-t border-gray-100">
				<div className="flex items-center justify-between mb-1">
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium text-gray-900 truncate">
							{displayName}
						</p>
						<p className="text-xs text-gray-500 truncate">
							{new Date(timestamp).toLocaleString()}
						</p>
					</div>
				</div>
				<div className="flex gap-1">
					<button
						onClick={handleDownload}
						disabled={isDownloading}
						className={`flex-1 ${
							isDownloading
								? "bg-blue-400"
								: "bg-blue-500 hover:bg-blue-600"
						} text-white text-xs py-1 px-2 rounded flex items-center justify-center transition-colors`}
					>
						<Download className="w-3 h-3 mr-1" />
						{buttonInfo.label}
					</button>
					<button
						onClick={() => onDeleteRequest(id)}
						className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded transition-colors"
					>
						削除申請
					</button>
				</div>
			</div>
		</div>
	);
};

export default ImageCard;
