import React, { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { downloadSingleMedia } from "../api/firebaseService";

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
			if (isIOS) {
				// iOS の場合は新しいタブで開く
				window.open(src, "_blank");
				alert("画像を長押しして「写真に追加」を選択してください。");
				return;
			}

			if (isAndroid) {
				try {
					// Android の場合は Blob URL を使用
					const response = await fetch(src);
					const blob = await response.blob();
					const blobUrl = URL.createObjectURL(blob);

					const extension = mediaType === "image" ? "jpg" : "mp4";
					const fileName = `${displayName}_${new Date(
						timestamp
					).toISOString()}.${extension}`;

					const link = document.createElement("a");
					link.href = blobUrl;
					link.download = fileName;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);

					// Cleanup
					setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
					return;
				} catch (error) {
					console.error("Android download error:", error);
					// フォールバック: 直接リンクを開く
					window.open(src, "_blank");
					throw error;
				}
			}

			// PC の場合は通常のダウンロード処理
			await downloadSingleMedia({
				id,
				displayName,
				mediaPath,
				mediaType,
				timestamp,
				userId: "",
			});
		} catch (error) {
			console.error("Download error:", error);

			let errorMessage = "ダウンロードに失敗しました。";
			if (isIOS) {
				errorMessage =
					"「写真に追加」を選択するか、画面を長押しして保存してください。";
			} else if (isAndroid) {
				errorMessage =
					"「ダウンロード」または「画像を保存」を選択してください。";
			}

			alert(errorMessage);

			// エラー時はソースを直接開く
			if (!window.open(src, "_blank")) {
				// ポップアップがブロックされた場合の処理
				alert(
					"新しいタブでの表示がブロックされました。ブラウザの設定を確認してください。"
				);
			}
		} finally {
			setIsDownloading(false);
		}
	}, [
		id,
		displayName,
		mediaPath,
		mediaType,
		timestamp,
		src,
		isDownloading,
		isIOS,
		isAndroid,
	]);

	// デバイスに応じてボタンのラベルとヒントを取得
	const getButtonInfo = () => {
		if (isDownloading) return { label: "保存中...", hint: "" };
		if (isIOS)
			return {
				label: "写真に追加",
				hint: "タップして開いた後、長押しで保存",
			};
		if (isAndroid) return { label: "保存", hint: "タップしてダウンロード" };
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
							// iOSの場合はコンテキストメニューを許可
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
				<div className="flex flex-col gap-1">
					{buttonInfo.hint && (
						<p className="text-xs text-gray-500 text-center">
							{buttonInfo.hint}
						</p>
					)}
					<div className="flex gap-1">
						<button
							onClick={handleDownload}
							disabled={isDownloading}
							className={`flex-1 ${
								isDownloading
									? "bg-blue-400"
									: "bg-blue-500 hover:bg-blue-600"
							} text-white text-xs py-1 px-2 rounded flex items-center justify-center`}
						>
							<Download className="w-3 h-3 mr-1" />
							{buttonInfo.label}
						</button>
						<button
							onClick={() => onDeleteRequest(id)}
							className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
						>
							削除申請
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ImageCard;
