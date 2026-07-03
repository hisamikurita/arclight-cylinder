import "./style.css";
import {
	createGallery,
	handleResize,
	initRenderer,
	renderWithReflection,
	resizeReflection,
	setupGalleryRotation,
	setupGUI,
	setupHelpers,
	setupInteractions,
	setupLights,
	setupReflection,
	startAnimationLoop,
	updateGalleryRotation,
	updateParallax,
} from "./webgl";

// レンダラーを初期化
initRenderer();

// ライトとヘルパーをセットアップ
setupLights();
setupHelpers();

// ギャラリーを作成
const imagePaths = Array.from(
	{ length: 6 },
	(_, i) => `/sample-img-0${i + 1}.jpg`,
);
const planes = createGallery(imagePaths);

// インタラクションをセットアップ
setupInteractions(planes);

// ギャラリー回転をセットアップ
setupGalleryRotation();

// 鏡面反射をセットアップ
setupReflection();

// GUIをセットアップ
setupGUI();

// リサイズ対応
handleResize(resizeReflection);

// アニメーション開始
startAnimationLoop(
	() => {
		updateGalleryRotation();
		updateParallax(planes);
	},
	() => renderWithReflection(),
);
