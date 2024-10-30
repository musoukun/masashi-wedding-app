import React, { useState, useEffect } from "react";
import { getDatabase, ref, get, remove, DataSnapshot } from "firebase/database";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";

interface MediaItem {
	id: string;
	deleteflag: boolean;
	mediaPath: string;
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
		try {
			const snapshot = await get(mediaRef);
			const items: MediaItem[] = [];
			snapshot.forEach((childSnapshot: DataSnapshot) => {
				const item = childSnapshot.val();
				items.push({ id: childSnapshot.key as string, ...item });
			});
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
					<li key={item.id} className="mb-2 p-2 border rounded">
						{item.mediaPath}
						<button
							onClick={() => handleDelete(item)}
							className="ml-4 bg-red-500 text-white p-1 rounded"
						>
							削除
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
