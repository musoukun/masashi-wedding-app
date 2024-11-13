import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ImageGrid from "./components/ImageGrid";
import UploadMedia from "./components/UploadMedia";
import DownloadMedia from "./components/DownloadMedia";
import AdminPanel from "./components/AdminPanel";
import MonacoLayout from "./components/MonacoLayout";
import MonacoPage from "./components/MonacoPage";
import MonacoUpload from "./components/MonacoUpload";

const App: React.FC = () => {
	return (
		<Router>
			<Routes>
				{/* メインアプリのルート */}
				<Route element={<Layout />}>
					<Route path="/" element={<ImageGrid />} />
					<Route path="/upload" element={<UploadMedia />} />
					<Route path="/download" element={<DownloadMedia />} />
					<Route path="/admin" element={<AdminPanel />} />
				</Route>

				{/* Monacoアプリのルート */}
				<Route element={<MonacoLayout />}>
					<Route path="/monaco" element={<MonacoPage />} />
					<Route path="/monaco/upload" element={<MonacoUpload />} />
				</Route>
			</Routes>
		</Router>
	);
};

export default App;
