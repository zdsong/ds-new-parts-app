import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '../utils/deviceUtil';
import type { DeviceType } from '../utils/deviceUtil';
import { resolveDeviceRoute } from '../utils/deviceRoute';

/**
 * 端末（PC／SP）の切り替えに合わせて、表示中の画面を対応する画面へ自動で切り替える
 *
 * ・ウィンドウのリサイズや端末の回転で PC／SP の判定が変わったときに実行する
 * ・切り替え対象は utils/deviceRoute.ts の DEVICE_ROUTE_PAIRS に定義した画面のみ
 *   例：PC で P305 を表示中にモバイル幅へ変わると SP305 へ切り替える（逆も同様）
 * ・パレット番号などの画面間パラメータ（location.state）とクエリはそのまま引き継ぐ
 * ・replace で遷移するため、ブラウザの戻る操作で元の端末向け画面には戻らない
 * ・初回表示（URL を直接開いた場合）は切り替えない。表示中の URL を勝手に変えないため
 */
const useAutoSwitchDeviceRoute = (): void => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // 直前の端末種別。初回表示では切り替えないため null で初期化する
  const previousDevice = useRef<DeviceType | null>(null);

  useEffect(() => {
    const device: DeviceType = isMobile ? 'mobile' : 'pc';
    const previous = previousDevice.current;
    previousDevice.current = device;

    // 初回表示、または端末種別が変わっていない場合は何もしない
    if (previous === null || previous === device) return;

    const routeName = location.pathname.replace(/^\/+/, '').split('/')[0];
    const targetRoute = resolveDeviceRoute(routeName, device);
    // 対応する画面が無い（PC 専用の画面など）、または既に切り替え先の画面の場合は何もしない
    if (!targetRoute || targetRoute === routeName) return;

    navigate(
      { pathname: `/${targetRoute}`, search: location.search },
      { replace: true, state: location.state }
    );
  }, [isMobile, location.pathname, location.search, location.state, navigate]);
};

export default useAutoSwitchDeviceRoute;
