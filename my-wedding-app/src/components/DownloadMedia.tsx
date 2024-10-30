// DownloadMedia.tsx
import { useState } from "react";
import { Download } from "lucide-react";
import { downloadAllMediaAsZip } from "../api/firebaseService";

export default function DownloadMedia() {
	const [isDownloading, setIsDownloading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const handleDownload = async () => {
		setIsDownloading(true);
		setError(null);
		setProgress(0);

		try {
			await downloadAllMediaAsZip((progress) => {
				setProgress(Math.round(progress));
			});
		} catch (err) {
			setError("ダウンロード中にエラーが発生しました。");
			console.error(err);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6">
				メディア一括ダウンロード
			</h1>

			<div className="bg-white rounded-lg shadow-md p-6">
				<p className="mb-4 text-gray-600">
					アップロードされた全ての写真と動画をZIPファイルとしてダウンロードできます。
				</p>

				<button
					onClick={handleDownload}
					disabled={isDownloading}
					className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isDownloading ? (
						<>
							ダウンロード中...
							<span className="ml-2">{progress}%</span>
						</>
					) : (
						<>
							ZIPでダウンロード
							<Download className="ml-2 h-4 w-4" />
						</>
					)}
				</button>

				{isDownloading && (
					<div className="mb-4">
						<div className="w-full bg-gray-200 rounded-full h-2.5">
							<div
								className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>
				)}

				{error && <div className="text-red-500 mt-2">{error}</div>}

				<div className="text-sm text-gray-500 mt-4">
					<h3 className="font-bold mb-2">注意事項:</h3>
					<ul className="list-disc list-inside space-y-1">
						<li>ダウンロードには時間がかかる場合があります</li>
						<li>安定したネットワーク環境での実行をお勧めします</li>
						<li>削除済みのメディアは含まれません</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
