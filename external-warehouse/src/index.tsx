import { createRoot } from 'react-dom/client';
import App from './App';
import { disableMobileZoom } from './utils/zoomControl';
import { applyViewportHeight } from './utils/viewportHeight';

// スマートフォンでの画面拡大（ピンチ・ダブルタップ）を無効化する
// ログイン画面より前に有効にしたいため、描画前に 1 度だけ設定する
disableMobileZoom();

// ブラウザの下部ツールバーに画面下端が隠れないよう、画面の高さを補正する
applyViewportHeight();

const container = document.getElementById('root');
if (!container) {
    throw new Error('No container found');
}

const root = createRoot(container);
root.render(<App />);

