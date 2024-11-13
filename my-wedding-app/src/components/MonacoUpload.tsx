import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadMonacoMedia } from "../api/monacoService";
import { Upload, ImagePlus, X } from "lucide-react";

const MonacoUpload: React.FC = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];
			setSelectedFile(file);

			// プレビューの生成
			const fileUrl = URL.createObjectURL(file);
			setPreviewUrl(fileUrl);

			// ファイル名からタイトルを自動設定（拡張子を除く）
			if (!title) {
				const fileName = file.name.replace(/\.[^/.]+$/, "");
				setTitle(fileName);
			}
		}
	};

	const handleRemoveFile = () => {
		setSelectedFile(null);
		setPreviewUrl(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleUpload = async () => {
		if (!selectedFile) return;

		setIsUploading(true);

		try {
			await uploadMonacoMedia(
				selectedFile,
				"userId",
				displayName || "(名前なし)",
				title.trim(), // 空白を削除
				description.trim(), // 空白を削除
				(progress) => setUploadProgress(progress)
			);

			// アップロード成功後、ギャラリーページに戻る
			navigate("/monaco");
		} catch (error) {
			console.error("Upload error:", error);
			alert("アップロードに失敗しました。もう一度お試しください。");
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			setSelectedFile(null);
			setTitle("");
			setDescription("");
		}
	};
	return (
		<div className="max-w-2xl mx-auto px-4 py-8">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">新しい投稿を作成</h1>
				<button
					onClick={() => navigate("/monaco")}
					className="text-gray-600 hover:text-gray-800"
				>
					キャンセル
				</button>
			</div>

			<div className="space-y-6">
				{/* メディア選択エリア */}
				<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
					{previewUrl ? (
						<div className="relative">
							{selectedFile?.type.startsWith("video/") ? (
								<video
									src={previewUrl}
									className="max-h-96 mx-auto rounded"
									controls
								/>
							) : (
								<img
									src={previewUrl}
									alt="Preview"
									className="max-h-96 mx-auto rounded"
								/>
							)}
							<button
								onClick={handleRemoveFile}
								className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					) : (
						<div
							className="cursor-pointer"
							onClick={() => fileInputRef.current?.click()}
						>
							<ImagePlus className="w-12 h-12 mx-auto text-gray-400" />
							<p className="mt-2 text-sm text-gray-500">
								クリックして写真または動画を選択
							</p>
							{/* 対応形式の表示を更新 */}
							<p className="text-xs text-gray-400">
								対応形式: JPG, PNG, MP4, MOV, MTS
							</p>
						</div>
					)}
					<input
						type="file"
						onChange={handleFileChange}
						accept="image/*,video/*,.mov,.mts"
						ref={fileInputRef}
						className="hidden"
					/>
				</div>

				{/* 投稿情報フォーム */}
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							投稿者名
						</label>
						<input
							type="text"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							placeholder="あなたの名前（任意）"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							タイトル
						</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="タイトル（任意）"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							説明
							<span className="text-xs text-gray-500 ml-2">
								({description.length}/140文字)
							</span>
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="説明（任意）"
							maxLength={140}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
							rows={3}
						/>
					</div>
				</div>

				{/* アップロードボタンとプログレスバー */}
				<div className="space-y-4">
					<button
						onClick={handleUpload}
						disabled={!selectedFile || isUploading}
						className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
					>
						{isUploading ? (
							<>
								アップロード中...
								<span className="ml-2">{uploadProgress}%</span>
							</>
						) : (
							<>
								投稿する
								<Upload className="ml-2 h-4 w-4" />
							</>
						)}
					</button>

					{isUploading && (
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style={{ width: `${uploadProgress}%` }}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default MonacoUpload;
