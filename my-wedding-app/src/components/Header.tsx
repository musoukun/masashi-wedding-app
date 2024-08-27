import React from "react";

interface HeaderProps {
	isScrolling: boolean;
	setIsScrolling: (value: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isScrolling, setIsScrolling }) => {
	return (
		<header className="fixed top-0 left-0 right-0 bg-white p-4 flex justify-between items-center shadow-md z-50">
			<h1 className="text-2xl font-bold">Pinterest Clone</h1>
			<label className="flex items-center cursor-pointer">
				<input
					type="checkbox"
					checked={isScrolling}
					onChange={(e) => setIsScrolling(e.target.checked)}
					className="mr-2"
				/>
				Auto Scroll
			</label>
		</header>
	);
};

export default Header;
