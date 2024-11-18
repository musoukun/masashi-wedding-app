import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		host: true, // 全てのアドレスでリッスン
		port: 5173, // デフォルトポート
		// もしくは特定のIPアドレスを指定する場合
		// host: "192.168.1.100", // あなたのローカルIPアドレス
	},
});
