import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ImageGrid from "./components/ImageGrid";
import UploadMedia from "./components/UploadMedia";
import DownloadMedia from "./components/DownloadMedia";

const App: React.FC = () => {
	return (
		<Router>
			<Layout>
				<Routes>
					<Route path="/" element={<ImageGrid />} />
					<Route path="/upload" element={<UploadMedia />} />
					<Route path="/download" element={<DownloadMedia />} />
				</Routes>
			</Layout>
		</Router>
	);
};

export default App;
