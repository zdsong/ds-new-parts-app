/**
 * 画面の高さ（CSS 変数 --app-vh）を実測値で補正する
 *
 * モバイルブラウザの 100vh は「アドレスバー・下部ツールバーが隠れた状態」の高さを
 * 指すため、そのまま使うと画面下端がツールバーに隠れる。
 * dvh（動的ビューポート）に対応した端末は index.html の CSS だけで正しく動くので、
 * ここでは非対応の端末（古い iOS／Android）だけを対象に、
 * 実際の表示領域の高さを px で --app-vh に代入する。
 */

let installed = false;

/** dvh に対応しているか（対応端末では CSS 側で解決済みのため何もしない） */
const supportsDynamicViewport = (): boolean => {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
    return CSS.supports('height', '100dvh');
};

export const applyViewportHeight = (): void => {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    if (supportsDynamicViewport()) return;

    const setHeight = (): void => {
        // キーボード表示中は innerHeight が縮む端末があるため、
        // 画面回転やツールバーの伸縮に追従できれば十分とする
        document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
    };

    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);
};
