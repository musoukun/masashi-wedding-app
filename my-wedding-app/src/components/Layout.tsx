import { Link, useLocation, Outlet } from "react-router-dom";
import { Home, Upload } from "lucide-react";

export default function Layout() {
	const location = useLocation();
	const queryParams = location.search;

	// パスとモードのチェック
	const isMonacoPath = location.pathname.startsWith("/monaco");
	const isViewOnlyMode =
		location.pathname === "/view" ||
		new URLSearchParams(queryParams).get("mode") === "view-only";

	// Monacoパスの場合はレイアウトを表示しない
	if (isMonacoPath) {
		return <Outlet />;
	}

	return (
		<div className="flex flex-col min-h-screen">
			<main className="flex-grow pb-16">
				<Outlet />
			</main>

			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
				<div className="flex justify-around items-center h-16">
					<Link
						to={isViewOnlyMode ? "/view" : `/${queryParams}`}
						className={`flex flex-col items-center ${
							location.pathname === "/" ||
							location.pathname === "/view"
								? "text-blue-500"
								: "text-gray-500"
						}`}
					>
						<Home size={24} />
						<span className="text-xs mt-1">ギャラリー</span>
					</Link>
					{!isViewOnlyMode && (
						<Link
							to={`/upload${queryParams}`}
							className={`flex flex-col items-center ${
								location.pathname === "/upload"
									? "text-blue-500"
									: "text-gray-500"
							}`}
						>
							<Upload size={24} />
							<span className="text-xs mt-1">アップロード</span>
						</Link>
					)}
					{/* {!isViewOnlyMode && (
						<Link
							to={`/download${queryParams}`}
							className={`flex flex-col items-center ${
								location.pathname === "/download"
									? "text-blue-500"
									: "text-gray-500"
							}`}
						>
							<Download size={24} />
							<span className="text-xs mt-1">一括DL</span>
						</Link>
					)} */}
				</div>
			</nav>
		</div>
	);
}
