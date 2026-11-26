/**
 * メニューやダイアログが参照する --app-vh を、今見えているウィンドウの高さにする。
 * 画面の外枠自体はレイアウト側でウィンドウの四辺に固定している。
 */

let installed = false;

export const applyViewportHeight = (): void => {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    const setHeight = (): void => {
        const viewport = window.visualViewport;
        const height = Math.round(viewport?.height ?? window.innerHeight);
        document.documentElement.style.setProperty('--app-vh', `${height}px`);
    };

    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);
    window.visualViewport?.addEventListener('resize', setHeight);
};
