import { useMediaQuery } from '@mui/material';

/**
 * モバイル／PC の判定ユーティリティ
 *
 * 判定基準は画面幅（ビューポート）のみとする。
 * User-Agent による判定は、タブレットや PC のウィンドウ縮小を誤判定するうえ、
 * 実行環境によって結果が変わるため採用しない。
 * 画面幅であれば、ウィンドウのリサイズや端末の回転にもそのまま追従できる。
 */

// モバイルとみなす上限幅（MUI の sm ブレークポイントと同じ 600px）
export const MOBILE_MAX_WIDTH = 600;

// モバイル判定用メディアクエリ（600px 未満をモバイルとする）
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH - 0.1}px)`;

export type DeviceType = 'mobile' | 'pc';

/**
 * 現在の画面幅がモバイルかどうかを同期的に判定する
 * React の外（イベントハンドラ・印刷処理・ユーティリティ関数など）で使う場合はこちらを使う
 */
export const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  }
  return window.innerWidth < MOBILE_MAX_WIDTH;
};

// 現在の画面幅が PC かどうか
export const isPcViewport = (): boolean => !isMobileViewport();

/**
 * 印刷は「今の画面でダイアログを出す」方式にすべき端末か。
 *
 * 画面幅だけでは足りない。スマホを横にすると幅が 600px を超え、
 * PC と同じ非表示 iframe で print() される。
 * その経路は setTimeout 後に印刷するため、クリックの操作が途切れ、
 * Android などではダイアログを出さずに既定のプリンタへ直接送ることがある。
 * タッチ操作でホバーできない端末は、向きに関係なくダイアログ方式にする。
 */
export const prefersHandheldPrint = (): boolean => {
  if (isMobileViewport()) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
};

/**
 * iOS かどうか（印刷 API の出し分け専用）。
 * iOS は表示中の画面の print() でシステムプレビューが出る。
 * Android は幅 0 の iframe を遅らせて print() すると、プレビューを出さず直接印刷する。
 */
export const isIosDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  const nav = navigator as Navigator & { platform?: string; maxTouchPoints?: number };
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1;
};

/**
 * 画面幅の変化（ウィンドウのリサイズ・端末の回転）に追従するモバイル判定フック
 * コンポーネント内で使う場合はこちらを使う
 *
 * noSsr: true により初回描画から実際の画面幅で判定する。
 * これが無いと初回だけ PC と判定され、直後にモバイルへ変わるため、
 * 端末切り替えを監視する処理（useAutoSwitchDeviceRoute）が誤動作する。
 */
export const useIsMobile = (): boolean => useMediaQuery(MOBILE_MEDIA_QUERY, { noSsr: true });

// 'mobile' / 'pc' の文字列で受け取りたい場合のフック
export const useDeviceType = (): DeviceType => (useIsMobile() ? 'mobile' : 'pc');
