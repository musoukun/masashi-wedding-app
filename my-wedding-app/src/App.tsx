import React from "react";
import ImageGrid from "./components/ImageGrid";

const App: React.FC = () => {
	return (
		<div className="container mx-auto">
			<h1 className="text-3xl font-bold text-center my-8">
				Image Gallery
			</h1>
			<ImageGrid />
		</div>
	);
};

export default App;
