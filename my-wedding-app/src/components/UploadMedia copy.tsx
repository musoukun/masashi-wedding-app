import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { uploadMedia, checkFileExists } from "../api/firebaseService";
import { Upload, AlertCircle, ExternalLink } from "lucide-react";

interface UploadResult {
	success: boolean;
	fileName: string;
	alreadyExists: boolean;
}

interface UploadProgress {
	fileName: string;
	progress: number;
}

export default function UploadMedia() {
	const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
	const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
	const [abortController, setAbortController] =
		useState<AbortController | null>(null);
	const [showInAppWarning, setShowInAppWarning] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const location = useLocation();
	const queryParams = location.search;

	// 組み込みブラウザ検出
	const isInAppBrowser = () => {
		const ua = navigator.userAgent.toLowerCase();
		const standardBrowsers = [
			"chrome",
			"safari",
			"firefox",
			"edge",
			"opera",
		];

		if (standardBrowsers.some((browser) => ua.includes(browser))) {
			if (!ua.includes("line")) {
				return false;
			}
		}

		const inAppPatterns = [
			"line/",
			"fbav/",
			"instagram",
			"twitter",
			"wechat",
			"micromessenger",
			"kakaotalk",
			"line",
			"Line",
		];

		return inAppPatterns.some((pattern) => ua.includes(pattern));
	};

	useEffect(() => {
		setShowInAppWarning(isInAppBrowser());
	}, []);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const nameFromUrl = params.get("name");
		if (nameFromUrl) {
			setDisplayName(nameFromUrl);
		}
	}, [location]);

	// ファイル選択のハンドラー
	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files) return;

		// FileListを直接使用せず、必要な情報だけを保持
		const dt = new DataTransfer();
		Array.from(files).forEach((file) => {
			// ファイルサイズチェックなど、必要な検証をここで行う
			if (file.size > 0) {
				dt.items.add(file);
			}
		});

		setSelectedFiles(dt.files);

		// 入力をリセットしないことで、同じファイルの再選択を可能にする
		// event.target.value = '';
	};

	// ファイル選択UIコンポーネント
	const FileInput = () => (
		<div className="mb-4">
			<input
				ref={fileInputRef}
				type="file"
				onChange={handleFileChange}
				multiple
				accept="image/*,video/*,.mov"
				className="hidden"
				id="file-input"
			/>
			<label
				htmlFor="file-input"
				className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400 transition-colors"
			>
				<Upload className="mx-auto h-12 w-12 text-gray-400" />
				<div className="mt-2">
					<p className="text-sm text-gray-600">
						タップして写真・動画を選択
					</p>
					<p className="text-xs text-gray-500 mt-1">
						※ 端末のギャラリーから選択できます
					</p>
				</div>
				{selectedFiles && selectedFiles.length > 0 && (
					<div className="mt-2">
						<p className="text-sm text-gray-600">
							{selectedFiles.length}個のファイルが選択されています
						</p>
						<button
							onClick={(e) => {
								e.preventDefault();
								setSelectedFiles(null);
								if (fileInputRef.current) {
									fileInputRef.current.value = "";
								}
							}}
							className="mt-2 text-xs text-red-500 hover:text-red-700"
						>
							選択をクリア
						</button>
					</div>
				)}
			</label>
		</div>
	);

	// const handleCustomFileSelect = () => {
	// 	const input = document.createElement("input");
	// 	input.type = "file";
	// 	input.multiple = true;
	// 	input.accept = "image/*,video/*,.mov";

	// 	// captureを削除してギャラリー選択を可能にする
	// 	input.style.display = "none";

	// 	input.onchange = (e: Event) => {
	// 		const files = (e.target as HTMLInputElement).files;
	// 		if (files && files.length > 0) {
	// 			// FileListをコピーして保持（FileListは読み取り専用なため）
	// 			const fileArray = Array.from(files);
	// 			const dt = new DataTransfer();
	// 			fileArray.forEach((file) => dt.items.add(file));
	// 			setSelectedFiles(dt.files);
	// 		}
	// 	};

	// 	input.click();
	// };

	// ファイル名生成
	const generateFileName = (file: File): string => {
		const timestamp = Date.now();
		const randomStr = Math.random().toString(36).substring(7);
		const extension = file.type.startsWith("image/") ? "jpg" : "mp4";
		return `${timestamp}-${randomStr}.${extension}`;
	};

	// アップロード処理
	const handleUpload = async () => {
		if (!selectedFiles) return;

		setIsUploading(true);
		setUploadProgress([]);
		setUploadResults([]);

		const controller = new AbortController();
		setAbortController(controller);

		const initialProgress = Array.from(selectedFiles).map((file) => ({
			fileName: file.name,
			progress: 0,
		}));
		setUploadProgress(initialProgress);

		try {
			const uploadPromises = Array.from(selectedFiles).map(
				async (file) => {
					try {
						const fileName = generateFileName(file);
						const exists = await checkFileExists(
							fileName,
							file.size
						);

						if (exists) {
							setUploadProgress((prev) =>
								prev.map((p) =>
									p.fileName === file.name
										? { ...p, progress: 100 }
										: p
								)
							);
							return {
								success: true,
								fileName: file.name,
								alreadyExists: true,
							};
						}

						await uploadMedia(
							file,
							"userId",
							displayName || "(名前なし)",
							(progress) => {
								setUploadProgress((prev) =>
									prev.map((p) =>
										p.fileName === file.name
											? { ...p, progress }
											: p
									)
								);
							},
							controller
						);

						return {
							success: true,
							fileName: file.name,
							alreadyExists: false,
						};
					} catch (error) {
						console.error(`Error uploading ${file.name}:`, error);
						return {
							success: false,
							fileName: file.name,
							alreadyExists: false,
						};
					}
				}
			);

			const results = await Promise.all(uploadPromises);
			setUploadResults(results);
		} catch (error) {
			console.error("Upload error:", error);
		} finally {
			setIsUploading(false);
			setAbortController(null);
			setSelectedFiles(null);
		}
	};

	// アップロードキャンセル
	const handleCancelUpload = () => {
		if (abortController) {
			abortController.abort();
			setIsUploading(false);
			setUploadProgress([]);
			setUploadResults([]);
			setAbortController(null);
			setSelectedFiles(null);
		}
	};

	// 外部ブラウザを開く
	const openInExternalBrowser = () => {
		const currentUrl = new URL(window.location.href);
		currentUrl.searchParams.set("openExternalBrowser", "1");
		window.location.href = currentUrl.toString();
	};

	// 結果のカウント計算
	const successCount = uploadResults.filter(
		(result) => result.success && !result.alreadyExists
	).length;
	const alreadyExistedCount = uploadResults.filter(
		(result) => result.alreadyExists
	).length;
	const failedCount = uploadResults.filter(
		(result) => !result.success
	).length;

	// // カスタムファイル選択UI
	// const FileSelectArea = () => (
	// 	<div
	// 		className="mb-4 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400 transition-colors"
	// 		onClick={handleCustomFileSelect}
	// 	>
	// 		<Upload className="mx-auto h-12 w-12 text-gray-400" />
	// 		<div className="mt-2">
	// 			<p className="text-sm text-gray-600">
	// 				タップして写真や動画を選択
	// 			</p>
	// 			<p className="text-xs text-gray-500 mt-1">
	// 				※ 端末のギャラリーから選択できます
	// 			</p>
	// 		</div>
	// 		{selectedFiles && selectedFiles.length > 0 && (
	// 			<div className="mt-2">
	// 				<p className="text-sm text-gray-600">
	// 					{selectedFiles.length}個のファイルが選択されています
	// 				</p>
	// 				<button
	// 					onClick={(e) => {
	// 						e.stopPropagation();
	// 						setSelectedFiles(null);
	// 					}}
	// 					className="mt-2 text-xs text-red-500 hover:text-red-700"
	// 				>
	// 					選択をクリア
	// 				</button>
	// 			</div>
	// 		)}
	// 	</div>
	// );

	// // Alternative File Input
	// const AlternativeFileInput = () => (
	// 	<div className="mb-4">
	// 		<label className="block text-sm font-medium text-gray-700 mb-2">
	// 			ファイルを選択
	// 		</label>
	// 		<input
	// 			type="file"
	// 			onChange={(e) => {
	// 				const files = e.target.files;
	// 				if (files && files.length > 0) {
	// 					const dt = new DataTransfer();
	// 					Array.from(files).forEach((file) => dt.items.add(file));
	// 					setSelectedFiles(dt.files);
	// 				}
	// 			}}
	// 			multiple
	// 			accept="image/*,video/*,.mov"
	// 			className="block w-full text-sm text-gray-500
	// 								file:mr-4 file:py-2 file:px-4
	// 								file:rounded-full file:border-0
	// 								file:text-sm file:font-semibold
	// 								file:bg-violet-50 file:text-violet-700
	// 								hover:file:bg-violet-100"
	// 		/>
	// 	</div>
	// );

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6">メディアアップロード</h1>

			{/* 組み込みブラウザ警告 */}
			{showInAppWarning && (
				<div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
					<h3 className="font-bold mb-2">ご注意</h3>
					<div className="space-y-3">
						<p>
							現在、LINEアプリ内のブラウザをご使用中です。
							画像や動画のアップロードには外部ブラウザでの表示が必要です。
						</p>

						<div className="flex flex-col space-y-2">
							<button
								onClick={openInExternalBrowser}
								className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center justify-center"
							>
								<ExternalLink className="mr-2 h-4 w-4" />
								外部ブラウザで開く
							</button>
						</div>

						<div className="text-sm bg-white bg-opacity-50 p-3 rounded">
							<p className="font-bold mb-1">
								うまく開かない場合の手順:
							</p>
							<ol className="list-decimal list-inside space-y-1">
								<li>画面右上の「︙」をタップ</li>
								<li>「他のブラウザで開く」を選択</li>
								<li>使用するブラウザを選択</li>
							</ol>
						</div>
					</div>
				</div>
			)}

			{/* 名前入力フィールド */}
			<input
				type="text"
				value={displayName}
				onChange={(e) => setDisplayName(e.target.value)}
				placeholder="あなたの名前（任意）"
				className="mb-4 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
			/>

			{/* ファイル選択UIを両方表示 */}
			<FileInput />

			{/* アップロードボタン */}
			<div className="flex space-x-4 mb-4">
				<button
					onClick={isUploading ? handleCancelUpload : handleUpload}
					disabled={!selectedFiles && !isUploading}
					className={`${
						isUploading
							? "bg-red-500 hover:bg-red-700"
							: "bg-blue-500 hover:bg-blue-700"
					} text-white font-bold py-2 px-4 rounded inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
				>
					{isUploading ? (
						<>
							キャンセル
							<ExternalLink className="ml-2 h-4 w-4" />
						</>
					) : (
						<>
							アップロード開始
							<Upload className="ml-2 h-4 w-4" />
						</>
					)}
				</button>
			</div>

			{/* アップロードプログレス */}
			{isUploading && uploadProgress.length > 0 && (
				<div className="mb-8">
					{uploadProgress.map((progress, index) => (
						<div key={index} className="mb-4">
							<div className="flex justify-between items-center mb-1">
								<span className="text-sm font-medium text-gray-700">
									{progress.fileName}
								</span>
								<span className="text-sm font-medium text-gray-700">
									{Math.round(progress.progress)}%
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
								<div
									className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
									style={{ width: `${progress.progress}%` }}
								/>
							</div>
						</div>
					))}
				</div>
			)}

			{/* アップロード結果表示 */}
			{uploadResults.length > 0 && (
				<div
					className="mb-8 bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4"
					role="alert"
				>
					<div className="flex">
						<div className="py-1">
							<AlertCircle className="h-4 w-4 mr-2" />
						</div>
						<div>
							<p className="font-bold">アップロード結果</p>
							{successCount > 0 && (
								<p className="text-sm">
									{successCount}
									件のファイルが正常にアップロードされました
									{alreadyExistedCount > 0 &&
										`（${alreadyExistedCount}件はすでにアップロード済でした）`}
									。 ありがとうございます。
								</p>
							)}
							{successCount === 0 &&
								alreadyExistedCount > 0 &&
								failedCount === 0 && (
									<p className="text-sm">
										選択されたファイル（
										{alreadyExistedCount}
										件）はすべてアップロード済でした。
									</p>
								)}
							{failedCount > 0 && (
								<p className="text-sm">
									{failedCount}
									件のアップロードに失敗しました。
								</p>
							)}
							{uploadResults
								.filter((result) => !result.success)
								.map((result, index) => (
									<p className="text-sm" key={index}>
										{result.fileName}
										のアップロードに失敗しました。
									</p>
								))}
						</div>
					</div>
				</div>
			)}

			{/* ギャラリーへ戻るリンク */}
			<div className="mt-8">
				<Link
					to={`/${queryParams}`}
					className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
				>
					ギャラリーを表示
				</Link>
			</div>
		</div>
	);
}
