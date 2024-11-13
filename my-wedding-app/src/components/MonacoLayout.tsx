import { Link, useLocation, Outlet } from "react-router-dom";
import { Home, Upload } from "lucide-react";

export default function MonacoLayout() {
	const location = useLocation();

	return (
		<div className="flex flex-col min-h-screen">
			<main className="flex-grow pb-16">
				<Outlet /> {/* childrenの代わりにOutletを使用 */}
			</main>
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
				<div className="flex justify-around items-center h-16">
					<Link
						to="/monaco"
						className={`flex flex-col items-center ${
							location.pathname === "/monaco"
								? "text-blue-500"
								: "text-gray-500"
						}`}
					>
						<Home size={24} />
						<span className="text-xs mt-1">ギャラリー</span>
					</Link>
					<Link
						to="/monaco/upload"
						className={`flex flex-col items-center ${
							location.pathname === "/monaco/upload"
								? "text-blue-500"
								: "text-gray-500"
						}`}
					>
						<Upload size={24} />
						<span className="text-xs mt-1">投稿</span>
					</Link>
				</div>
			</nav>
		</div>
	);
}
