/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { getDatabase, ref, get, remove, update } from "firebase/database";
import {
	getStorage,
	ref as storageRef,
	deleteObject,
	getDownloadURL,
} from "firebase/storage";

interface MediaItem {
	id: string;
	deleteflag: boolean;
	mediaPath: string;
	thumbnailUrl?: string; // サムネイルURLを追加
}

const AdminPanel: React.FC = () => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [password, setPassword] = useState("");
	const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isAuthenticated) {
			fetchMediaItems();
		}
	}, [isAuthenticated]);

	const handleLogin = () => {
		if (password === "1500") {
			setIsAuthenticated(true);
		} else {
			alert("パスワードが間違っています。");
		}
	};

	const fetchMediaItems = async () => {
		setIsLoading(true);
		setError(null);
		const db = getDatabase();
		const mediaRef = ref(db, "media");
		const storage = getStorage();

		try {
			const snapshot = await get(mediaRef);
			const items: MediaItem[] = await Promise.all(
				Object.entries(snapshot.val() || {}).map(
					async ([key, value]) => {
						const item = value as any;
						const id = key;

						// サムネイルURLを取得
						const fileRef = storageRef(storage, item.mediaPath);
						const thumbnailUrl = await getDownloadURL(fileRef);

						return { id, ...item, thumbnailUrl };
					}
				)
			);
			setMediaItems(items.filter((item) => item.deleteflag));
		} catch (err) {
			setError("データの取得に失敗しました。");
			console.error(err);
		}
		setIsLoading(false);
	};

	const handleDelete = async (item: MediaItem) => {
		if (window.confirm("本当に削除しますか？")) {
			setIsLoading(true);
			setError(null);
			try {
				const db = getDatabase();
				const storage = getStorage();

				// Storageからファイルを削除
				const fileRef = storageRef(storage, item.mediaPath);
				await deleteObject(fileRef);

				// Realtime Databaseからデータを削除
				const itemRef = ref(db, `media/${item.id}`);
				await remove(itemRef);

				// 成功したら、ローカルの状態を更新
				setMediaItems((prevItems) =>
					prevItems.filter((i) => i.id !== item.id)
				);
				alert("削除が完了しました。");
			} catch (err) {
				setError("削除に失敗しました。");
				console.error(err);
			}
			setIsLoading(false);
		}
	};

	// 復元機能
	const handleRestore = async (item: MediaItem) => {
		try {
			const db = getDatabase();
			const itemRef = ref(db, `media/${item.id}`);
			await update(itemRef, { deleteflag: false });

			// ローカル状態を更新
			setMediaItems((prevItems) =>
				prevItems.filter((i) => i.id !== item.id)
			);
			alert("復元が完了しました。");
		} catch (err) {
			setError("復元に失敗しました。");
			console.error(err);
		}
	};

	if (!isAuthenticated) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
				<div className="p-6 bg-white rounded shadow-md">
					<h2 className="text-2xl mb-4">管理者ログイン</h2>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="border p-2 mb-4 w-full"
						placeholder="パスワードを入力"
					/>
					<button
						onClick={handleLogin}
						className="bg-blue-500 text-white p-2 rounded w-full"
					>
						ログイン
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl mb-4">管理画面</h1>
			{isLoading && <p>読み込み中...</p>}
			{error && <p className="text-red-500">{error}</p>}
			<ul>
				{mediaItems.map((item) => (
					<li
						key={item.id}
						className="mb-2 p-2 border rounded flex items-center"
					>
						{/* サムネイル画像を表示 */}
						{item.thumbnailUrl && (
							<img
								src={item.thumbnailUrl}
								alt="サムネイル"
								className="w-16 h-16 mr-4 object-cover"
							/>
						)}

						{/* ファイル名の末尾10文字を表示 */}
						<span className="flex-grow">
							{item.mediaPath.slice(-10)}
						</span>

						{/* 削除ボタン */}
						<button
							onClick={() => handleDelete(item)}
							className="ml-4 bg-red-500 text-white p-1 rounded"
						>
							削除
						</button>

						{/* 復元ボタン */}
						<button
							onClick={() => handleRestore(item)}
							className="ml-2 bg-green-500 text-white p-1 rounded"
						>
							復元
						</button>
					</li>
				))}
			</ul>
			{mediaItems.length === 0 && !isLoading && (
				<p>削除申請されたデータはありません。</p>
			)}
		</div>
	);
};

export default AdminPanel;
