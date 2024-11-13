import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
	Upload,
	Trash2,
	Send,
	User,
	Check,
	X,
	Pencil,
	Download,
} from "lucide-react";
import {
	MonacoMediaItem,
	Comment,
	getMonacoMediaItems,
	getMonacoMediaUrl,
	addComment as addCommentService,
	deleteComment as deleteCommentService,
	getComments as getCommentsService,
	deleteMonacoMedia,
	updateMonacoMedia,
} from "../api/monacoService";
import VideoPlayer from "./VideoPlayer";

interface MonacoMediaItemWithExtra extends MonacoMediaItem {
	url: string;
	comments: Comment[];
}

const MonacoPage: React.FC = () => {
	const [mediaItems, setMediaItems] = useState<MonacoMediaItemWithExtra[]>(
		[]
	);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [newComment, setNewComment] = useState<string>("");
	const [activeCommentItem, setActiveCommentItem] = useState<string | null>(
		null
	);
	const [isSubmittingComment, setIsSubmittingComment] = useState(false);
	const [commenterName, setCommenterName] = useState<string>("");

	// 編集用のstate追加
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");

	// 保存処理用のstate追加
	const [isDownloading, setIsDownloading] = useState(false);

	// 保存処理のハンドラーを追加
	const handleDownload = useCallback(
		async (item: MonacoMediaItemWithExtra) => {
			if (isDownloading) return;
			setIsDownloading(true);

			try {
				if (
					/iPad|iPhone|iPod/.test(navigator.userAgent) &&
					navigator.share
				) {
					const response = await fetch(item.url);
					const blob = await response.blob();
					const fileName = `${item.mediaPath.slice(-12)}`;
					const file = new File([blob], fileName, {
						type:
							item.mediaType === "image"
								? "image/jpeg"
								: "video/mp4",
					});

					const shareData = {
						files: [file],
						title: "写真を保存", // ImageCardと同じタイトルに変更
						text:
							item.mediaType === "image"
								? "写真を保存"
								: "動画を保存",
					};

					if (navigator.canShare && navigator.canShare(shareData)) {
						await navigator.share(shareData);
					} else {
						throw new Error("共有機能がサポートされていません");
					}
					return;
				}

				if (/Android/.test(navigator.userAgent)) {
					const response = await fetch(item.url);
					const blob = await response.blob();
					const blobUrl = URL.createObjectURL(blob);
					const fileName = `${item.mediaPath.slice(-12)}`;

					const link = document.createElement("a");
					link.href = blobUrl;
					link.download = fileName;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
					return;
				}

				const response = await fetch(item.url);
				const blob = await response.blob();
				const fileName = `${item.mediaPath.slice(-12)}`;

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
					errorMessage =
						"保存に失敗しました。もう一度お試しください。";
				}

				alert(errorMessage);
			} finally {
				setIsDownloading(false);
			}
		},
		[isDownloading] // 依存配列もImageCardと同じに修正
	);

	// 編集開始ハンドラ
	const handleStartEdit = (item: MonacoMediaItemWithExtra) => {
		setEditingItemId(item.id);
		setEditTitle(item.title || "");
		setEditDescription(item.description || "");
	};

	// 編集キャンセルハンドラ
	const handleCancelEdit = () => {
		setEditingItemId(null);
		setEditTitle("");
		setEditDescription("");
	};

	// 編集保存ハンドラ
	const handleSaveEdit = async (itemId: string) => {
		try {
			await updateMonacoMedia(itemId, {
				title: editTitle.trim() || undefined,
				description: editDescription.trim() || undefined,
			});

			setMediaItems((prev) =>
				prev.map((item) => {
					if (item.id === itemId) {
						return {
							...item,
							title: editTitle.trim() || undefined,
							description: editDescription.trim() || undefined,
						};
					}
					return item;
				})
			);

			handleCancelEdit();
		} catch (error) {
			console.error("Error updating media:", error);
			alert("更新に失敗しました。");
		}
	};

	const location = useLocation();

	// URLパラメータから名前を取得して設定
	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const nameFromUrl = params.get("name");
		if (nameFromUrl) {
			setCommenterName(nameFromUrl);
		}
	}, [location.search]);

	// コメント関連の関数
	const addComment = useCallback(
		async (
			mediaId: string,
			userId: string,
			displayName: string,
			text: string
		): Promise<Comment> => {
			return await addCommentService(mediaId, userId, displayName, text);
		},
		[]
	);

	const getComments = useCallback(
		async (mediaId: string): Promise<Comment[]> => {
			return await getCommentsService(mediaId);
		},
		[]
	);

	const deleteComment = useCallback(
		async (mediaId: string, commentId: string): Promise<void> => {
			await deleteCommentService(mediaId, commentId);
		},
		[]
	);

	const fetchMediaItems = useCallback(async () => {
		try {
			setIsLoading(true);
			const fetchedItems = await getMonacoMediaItems();
			const itemsWithUrls = await Promise.all(
				fetchedItems.map(async (item) => ({
					...item,
					url: await getMonacoMediaUrl(item.mediaPath),
					comments: await getComments(item.id),
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
	}, [getComments]);

	useEffect(() => {
		fetchMediaItems();
	}, [fetchMediaItems]);

	const handleAddComment = async (mediaId: string) => {
		if (!newComment.trim() || isSubmittingComment) return;
		if (!commenterName.trim()) {
			alert("名前を入力してください");
			return;
		}

		setIsSubmittingComment(true);
		try {
			const comment = await addComment(
				mediaId,
				"userId",
				commenterName.trim(), // 名前欄から取得した名前を使用
				newComment
			);

			setMediaItems((prev) =>
				prev.map((item) => {
					if (item.id === mediaId) {
						return {
							...item,
							comments: [...item.comments, comment],
						};
					}
					return item;
				})
			);

			setNewComment("");
			setActiveCommentItem(null);
		} catch (error) {
			console.error("Error adding comment:", error);
			alert("コメントの投稿に失敗しました。");
		} finally {
			setIsSubmittingComment(false);
		}
	};

	const handleDeleteComment = async (mediaId: string, commentId: string) => {
		const confirmed = window.confirm(
			"このコメントを削除してもよろしいですか？"
		);
		if (!confirmed) return;

		try {
			await deleteComment(mediaId, commentId);

			setMediaItems((prev) =>
				prev.map((item) => {
					if (item.id === mediaId) {
						return {
							...item,
							comments: item.comments.filter(
								(c) => c.id !== commentId
							),
						};
					}
					return item;
				})
			);
		} catch (error) {
			console.error("Error deleting comment:", error);
			alert("コメントの削除に失敗しました。");
		}
	};

	const handleDeleteMedia = async (mediaId: string) => {
		// 1回目の確認
		const firstConfirm = window.confirm("この投稿を削除しますか？");
		if (!firstConfirm) return;

		// 2回目の確認
		const secondConfirm = window.confirm("本当に削除しますね？");
		if (!secondConfirm) return;

		try {
			await deleteMonacoMedia(mediaId);
			setMediaItems((prev) => prev.filter((item) => item.id !== mediaId));
		} catch (error) {
			console.error("Error deleting media:", error);
			alert("削除に失敗しました。");
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
		<div className="w-full max-w-[640px] mx-auto bg-gray-50 min-h-screen">
			{/* ヘッダーの高さを調整 */}
			<header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
				<div className="w-full max-w-[640px] mx-auto px-4 py-1">
					{" "}
					{/* py-2 から py-1 に変更 */}
					<div className="flex justify-between items-center h-10">
						{" "}
						{/* h-10 を追加 */}
						<h1 className="text-lg font-semibold">
							{" "}
							{/* text-xl から text-lg に変更 */}
							Monaco Dance Team
						</h1>
						<div className="flex items-center space-x-2">
							<div className="flex items-center">
								<User className="w-4 h-4 text-gray-400 mr-1" />{" "}
								{/* サイズを調整 */}
								<input
									type="text"
									value={commenterName}
									onChange={(e) =>
										setCommenterName(e.target.value)
									}
									placeholder="あなたの名前を入力"
									className="w-36 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mr-1" /* サイズを調整 */
									maxLength={30}
								/>
							</div>
							<Link
								to="/monaco/upload"
								className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm rounded-lg flex items-center" /* サイズを調整 */
							>
								<Upload className="w-3 h-3 mr-1" />{" "}
								{/* サイズを調整 */}
								投稿
							</Link>
						</div>
					</div>
				</div>
			</header>
			{/* Main Content */}
			<main className="pt-[60px] px-4">
				{" "}
				{/* pt-16 から pt-[60px] に変更 */}
				<div className="space-y-6">
					{mediaItems.map((item) => (
						<div
							key={item.id}
							className="bg-white rounded-lg shadow-sm overflow-hidden"
						>
							{" "}
							<div className="relative">
								{item.mediaType === "video" ? (
									<VideoPlayer item={item} />
								) : (
									<img
										src={item.url}
										alt={item.title || ""}
										className="w-full h-auto"
									/>
								)}
							</div>
							<div className="p-2 flex  items-center">
								<button
									onClick={() => handleStartEdit(item)}
									className="bg-blue-500 text-white p-2 mx-2 rounded-full opacity-70 hover:opacity-100 transition-opacity"
									title="編集"
								>
									<Pencil className="w-5 h-5" />
								</button>
								<button
									onClick={() => handleDownload(item)}
									disabled={isDownloading}
									className="bg-blue-500 text-white p-2 mx-2 rounded-full opacity-70 hover:opacity-100 transition-opacity flex items-center"
									title="保存"
								>
									<Download className="w-5 h-5" />
								</button>
								<button
									onClick={() => handleDeleteMedia(item.id)}
									className="bg-red-500 text-white p-2 rounded-full mx-2 opacity-70 hover:opacity-100 transition-opacity"
									title="削除"
								>
									<Trash2 className="w-5 h-5" />
								</button>
							</div>
							<div className="p-2">
								{editingItemId === item.id ? (
									// 編集モード
									<div className="mb-3 space-y-3">
										<div>
											<input
												type="text"
												value={editTitle}
												onChange={(e) =>
													setEditTitle(e.target.value)
												}
												placeholder="タイトル"
												className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<div>
											<textarea
												value={editDescription}
												onChange={(e) =>
													setEditDescription(
														e.target.value
													)
												}
												placeholder="説明"
												maxLength={140}
												rows={3}
												className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<div className="flex justify-end space-x-2">
											<button
												onClick={handleCancelEdit}
												className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg flex items-center hover:bg-gray-300"
											>
												<X className="w-4 h-4 mr-1" />
												キャンセル
											</button>
											<button
												onClick={() =>
													handleSaveEdit(item.id)
												}
												className="px-3 py-1 bg-blue-500 text-white rounded-lg flex items-center hover:bg-blue-600"
											>
												<Check className="w-4 h-4 mr-1" />
												保存
											</button>
										</div>
									</div>
								) : (
									// 表示モード
									(item.title || item.description) && (
										<div className="mb-3">
											{item.title && (
												<h2 className="font-semibold text-lg">
													{item.title}
												</h2>
											)}
											{item.description && (
												<p className="text-gray-600 text-sm mt-1">
													{item.description}
												</p>
											)}
										</div>
									)
								)}
								<div className="text-xs text-gray-500 mb-3">
									{new Date(item.timestamp).toLocaleString()}
								</div>

								<div className="space-y-2">
									{item.comments.map((comment) => (
										<div
											key={comment.id}
											className="flex justify-between items-start group"
										>
											<div className="text-sm flex-1">
												<span className="font-semibold">
													{comment.displayName}
												</span>
												<span className="ml-2">
													{comment.text}
												</span>
												<div className="text-xs text-gray-500">
													{new Date(
														comment.timestamp
													).toLocaleString()}
												</div>
											</div>
											{comment.userId === "userId" && (
												<button
													onClick={() =>
														handleDeleteComment(
															item.id,
															comment.id
														)
													}
													className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											)}
										</div>
									))}
								</div>

								{activeCommentItem === item.id ? (
									<div className="mt-3 flex gap-2">
										<input
											type="text"
											value={newComment}
											onChange={(e) =>
												setNewComment(e.target.value)
											}
											placeholder="コメントを入力..."
											className="flex-1 px-3 py-1 border rounded-lg"
											maxLength={140}
										/>
										<button
											onClick={() =>
												handleAddComment(item.id)
											}
											disabled={isSubmittingComment}
											className="px-4 py-1 bg-blue-500 text-white rounded-lg flex items-center disabled:opacity-50"
										>
											{isSubmittingComment ? (
												"投稿中..."
											) : (
												<>
													投稿
													<Send className="w-4 h-4 ml-2" />
												</>
											)}
										</button>
									</div>
								) : (
									<button
										onClick={() =>
											setActiveCommentItem(item.id)
										}
										className="mt-3 text-blue-500 text-sm hover:text-blue-600"
									>
										コメントを追加
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			</main>
		</div>
	);
};

export default MonacoPage;
