import type { DeviceType } from './deviceUtil';

/**
 * PC 画面と SP 画面の対応表
 *
 * 同じ機能を PC 向け／モバイル向けに作り分けている画面を [PC, SP] の組で定義する。
 * 画面を追加した場合は、この表に 1 行追加するだけで端末切り替え時の自動遷移が有効になる。
 * 例：['P303', 'SP303'] は、PC のパレット番号発番と SP のパレット番号発番が同じ機能であることを示す。
 */
export const DEVICE_ROUTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['P303', 'SP303'],
  ['P304', 'SP304'],
  ['P305', 'SP305'],
];

/**
 * 指定した端末で表示すべきルートを返す
 *
 * ・対応表に無い画面（システム管理など PC 専用の画面）は null を返し、切り替え対象外とする
 * ・既に指定した端末向けの画面であれば、そのルートをそのまま返す（遷移不要の判定に使う）
 *
 * @param routeName 現在表示中のルート名（例：'SP305'）
 * @param device 切り替え先の端末種別
 * @returns 表示すべきルート名。対応が無い場合は null
 */
export const resolveDeviceRoute = (
  routeName: string,
  device: DeviceType
): string | null => {
  if (!routeName) return null;

  const pair = DEVICE_ROUTE_PAIRS.find(
    ([pcRoute, spRoute]) => pcRoute === routeName || spRoute === routeName
  );
  if (!pair) return null;

  const [pcRoute, spRoute] = pair;
  return device === 'mobile' ? spRoute : pcRoute;
};

// 指定したルートが対応表に含まれるか（端末切り替えの対象画面か）を判定する
export const isDeviceSwitchRoute = (routeName: string): boolean =>
  DEVICE_ROUTE_PAIRS.some(
    ([pcRoute, spRoute]) => pcRoute === routeName || spRoute === routeName
  );
