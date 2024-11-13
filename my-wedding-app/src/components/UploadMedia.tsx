/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { uploadMedia, checkFileExists } from "../api/firebaseService";
import { Upload, AlertCircle, ExternalLink } from "lucide-react";

interface UploadResult {
	success: boolean;
	fileName: string;
	alreadyExists: boolean;
}

// インターフェースに進捗状態を追加
interface UploadProgress {
	fileName: string;
	progress: number;
}

export default function UploadMedia() {
	const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
	const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [displayName, setDisplayName] = useState("");

	const location = useLocation();

	// 現在のURLパラメータを保持
	const queryParams = location.search;

	// プログレス状態の追加
	const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
	// キャンセルコントローラーの追加
	const [abortController, setAbortController] =
		useState<AbortController | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// 組み込みブラウザ警告の表示状態
	const [showInAppWarning, setShowInAppWarning] = useState(false);

	// 組み込みブラウザを検出する関数
	const isInAppBrowser = () => {
		const ua = navigator.userAgent.toLowerCase();

		// 一般的なスタンドアロンブラウザパターン
		const standardBrowsers = [
			"chrome",
			"safari",
			"firefox",
			"edge",
			"opera",
		];

		// ユーザーエージェントが標準的なブラウザパターンにマッチする場合は組み込みブラウザではない
		if (standardBrowsers.some((browser) => ua.includes(browser))) {
			// Line内のChromeなどの場合も考慮
			if (!ua.includes("line")) {
				return false;
			}
		}

		// 組み込みブラウザのパターン
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

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedFiles(event.target.files);
	};

	// ファイル名の生成を簡略化
	const generateFileName = (file: File): string => {
		const timestamp = Date.now();
		const randomStr = Math.random().toString(36).substring(7);
		const extension = file.type.startsWith("image/") ? "jpg" : "mp4";
		return `${timestamp}-${randomStr}.${extension}`;
	};

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
						// ファイルサイズのみでチェック
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
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			setSelectedFiles(null);
		}
	};

	// キャンセル処理も修正
	const handleCancelUpload = () => {
		if (abortController) {
			abortController.abort();
			setIsUploading(false);
			setUploadProgress([]);
			setUploadResults([]);
			setAbortController(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			setSelectedFiles(null);
		}
	};

	const successCount = uploadResults.filter(
		(result) => result.success && !result.alreadyExists
	).length;
	const alreadyExistedCount = uploadResults.filter(
		(result) => result.alreadyExists
	).length;
	const failedCount = uploadResults.filter(
		(result) => !result.success
	).length;

	// 外部ブラウザを開く関数
	const openInExternalBrowser = () => {
		const currentUrl = new URL(window.location.href);

		// openExternalBrowser=1 パラメータを追加
		currentUrl.searchParams.set("openExternalBrowser", "1");
		const urlWithParam = currentUrl.toString();

		try {
			// 現在のURLを更新
			window.location.href = urlWithParam;

			// フォールバック用のエラーハンドリング
			setTimeout(() => {
				// 1秒後にまだLINEブラウザ内にいる場合は警告を表示
				if (navigator.userAgent.toLowerCase().includes("line")) {
					console.log("Failed to open external browser");
				}
			}, 1000);
		} catch (error) {
			console.error("Error opening external browser:", error);
		}
	};

	// コンポーネントのreturn部分
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

			<input
				type="text"
				value={displayName}
				onChange={(e) => setDisplayName(e.target.value)}
				placeholder="あなたの名前（任意）"
				className="mb-4 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
			/>
			<input
				type="file"
				onChange={handleFileChange}
				multiple
				accept="image/*,video/*,.mov"
				ref={fileInputRef}
				className="mb-4 block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700
          hover:file:bg-violet-100"
			/>
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
							アップロードをキャンセル
							<ExternalLink className="ml-2 h-4 w-4" />
						</>
					) : (
						<>
							アップロード
							<Upload className="ml-2 h-4 w-4" />
						</>
					)}
				</button>
			</div>

			{/* プログレスバーの追加 */}
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
							{/* すべてのファイルがアップロード済みの場合 */}
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
										のファイルのアップロードに失敗しました。
									</p>
								))}
						</div>
					</div>
				</div>
			)}

			{/* スペースを追加したギャラリーへ戻るボタン */}
			<div className="mt-8">
				<Link
					to={`/${queryParams}`} // URLパラメータを付けてギャラリーへ戻るリンク
					className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
				>
					ギャラリーを表示
				</Link>
			</div>
		</div>
	);
}
