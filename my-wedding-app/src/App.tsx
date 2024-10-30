import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ImageGrid from "./components/ImageGrid";
import UploadMedia from "./components/UploadMedia";

const App: React.FC = () => {
	return (
		<Router>
			<Layout>
				<Routes>
					<Route path="/" element={<ImageGrid />} />
					<Route path="/upload" element={<UploadMedia />} />
				</Routes>
			</Layout>
		</Router>
	);
};

export default App;
