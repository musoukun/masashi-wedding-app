import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Upload } from "lucide-react";

interface LayoutProps {
	children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	const location = useLocation();

	return (
		<div className="flex flex-col min-h-screen">
			<main className="flex-grow pb-16">{children}</main>
			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
				<div className="flex justify-around items-center h-16">
					<Link
						to="/"
						className={`flex flex-col items-center ${location.pathname === "/" ? "text-blue-500" : "text-gray-500"}`}
					>
						<Home size={24} />
						<span className="text-xs mt-1">ギャラリー</span>
					</Link>
					<Link
						to="/upload"
						className={`flex flex-col items-center ${location.pathname === "/upload" ? "text-blue-500" : "text-gray-500"}`}
					>
						<Upload size={24} />
						<span className="text-xs mt-1">アップロード</span>
					</Link>
					{/* <Link
						to="/profile"
						className={`flex flex-col items-center ${location.pathname === "/profile" ? "text-blue-500" : "text-gray-500"}`}
					>
						<User size={24} />
						<span className="text-xs mt-1">プロフィール</span>
					</Link> */}
				</div>
			</nav>
		</div>
	);
}
