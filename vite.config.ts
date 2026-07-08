import { defineConfig } from "vite";

// GitHub Pages 用: サブパス公開 (`/arclight-cylinder/`) の場合は VITE_BASE=/arclight-cylinder/ を渡す
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
	root: "src",
	publicDir: "../public",
	base,
	build: {
		outDir: "../dist",
		emptyOutDir: true,
	},
});
