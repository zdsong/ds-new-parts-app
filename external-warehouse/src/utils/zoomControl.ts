/**
 * モバイル端末での画面拡大を無効化する
 *
 * index.html の viewport（user-scalable=no / maximum-scale=1）だけでは、
 * iOS Safari 10 以降がアクセシビリティ目的でこの指定を無視するため、
 * iOS 独自の gesture イベントと 2 本指以上の touchmove をここで止める。
 *
 * 入力欄へのフォーカス時の自動拡大は、input の文字サイズを 16px 以上に
 * することで防ぐ（index.html の CSS でモバイル幅に適用）。
 *
 * 1 本指のスクロールやタップは妨げない（拡大操作のみを対象とする）。
 */

let installed = false;

export const disableMobileZoom = (): void => {
    if (installed || typeof document === 'undefined') return;
    installed = true;

    const prevent = (event: Event): void => {
        if (event.cancelable) {
            event.preventDefault();
        }
    };

    // iOS Safari 独自のピンチ操作イベント
    document.addEventListener('gesturestart', prevent, { passive: false });
    document.addEventListener('gesturechange', prevent, { passive: false });
    document.addEventListener('gestureend', prevent, { passive: false });

    // 2 本指以上でのタッチ移動（ピンチ）を止める
    document.addEventListener(
        'touchmove',
        (event: TouchEvent) => {
            if (event.touches.length > 1) {
                prevent(event);
            }
        },
        { passive: false },
    );
};
