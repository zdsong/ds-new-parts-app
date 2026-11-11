// 管理メニューAPI クライアント
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8082';

// 管理メニュー型定義
export interface AdminMenu {
  menuId: string;
  menuName: string;
  parentId: string;
  orderNum: number;
  path: string;
  component: string;
  routeName: string;
  menuType: string;
  visible: string;
  status: string;
  perms: string;
  icon: string;
}

// API レスポンス型定義
interface ApiResponse<T> {
  code: number;
  message?: string;
  data?: T;
  rows?: T;
  [key: string]: any;
}

// 管理メニュー一覧を取得する
export const fetchAdminMenus = async (): Promise<AdminMenu[]> => {
  const response = await fetch(`${apiUrl}/api/system/menu/adminMenus`);
  const body = (await response.json()) as ApiResponse<AdminMenu[]>;
  return body.data || [];
};

// 指定したメニューに対応する一覧データを取得する
export const fetchMenuData = async (endpoint: string): Promise<any> => {
  const response = await fetch(`${apiUrl}${endpoint}`);
  const body = (await response.json()) as ApiResponse<any>;
  if (body.rows !== undefined) {
    return body.rows;
  }
  return body.data ?? body;
};

// メニューパスと取得先・表示列の対応表
export interface MenuColumn {
  key: string;
  label: string;
}

export interface MenuEndpointConfig {
  endpoint: string;
  columns?: MenuColumn[];
}

export const menuEndpointMap: Record<string, MenuEndpointConfig> = {
  'system/user': {
    endpoint: '/api/system/user/list',
    columns: [
      { key: 'userId', label: 'ユーザーID' },
      { key: 'userName', label: 'ログイン名' },
      { key: 'nickName', label: 'ユーザー名' },
      { key: 'phonenumber', label: '電話番号' },
      { key: 'status', label: '状態' },
    ],
  },
  'system/role': {
    endpoint: '/api/system/role/list',
    columns: [
      { key: 'roleId', label: 'ロールID' },
      { key: 'roleName', label: 'ロール名' },
      { key: 'roleKey', label: '権限キー' },
      { key: 'roleSort', label: '表示順' },
      { key: 'status', label: '状態' },
    ],
  },
  'system/menu': {
    endpoint: '/api/system/menu/adminMenus',
    columns: [
      { key: 'menuId', label: 'メニューID' },
      { key: 'menuName', label: 'メニュー名' },
      { key: 'path', label: 'パス' },
      { key: 'component', label: 'コンポーネント' },
      { key: 'menuType', label: '種別' },
      { key: 'orderNum', label: '表示順' },
    ],
  },
  'system/dict': {
    endpoint: '/api/system/dict/type/list',
    columns: [
      { key: 'dictId', label: 'コードID' },
      { key: 'dictName', label: 'コード名' },
      { key: 'dictType', label: 'コード種別' },
      { key: 'status', label: '状態' },
    ],
  },
  'system/config': {
    endpoint: '/api/system/config/list',
    columns: [
      { key: 'configId', label: '設定ID' },
      { key: 'configName', label: '設定名' },
      { key: 'configKey', label: '設定キー' },
      { key: 'configValue', label: '設定値' },
    ],
  },
  'monitor/operlog': {
    endpoint: '/api/monitor/operlog/list',
    columns: [
      { key: 'operId', label: '操作ID' },
      { key: 'title', label: '操作内容' },
      { key: 'businessType', label: '種別' },
      { key: 'operName', label: '操作者' },
      { key: 'operTime', label: '操作日時' },
      { key: 'status', label: '状態' },
    ],
  },
  'monitor/logininfor': {
    endpoint: '/api/monitor/logininfor/list',
    columns: [
      { key: 'infoId', label: '情報ID' },
      { key: 'userName', label: 'ユーザー名' },
      { key: 'ipaddr', label: 'IPアドレス' },
      { key: 'status', label: '状態' },
      { key: 'loginTime', label: 'ログイン日時' },
    ],
  },
  'monitor/job': {
    endpoint: '/api/monitor/job/list',
    columns: [
      { key: 'job_id', label: 'ジョブID' },
      { key: 'job_name', label: 'ジョブ名' },
      { key: 'job_group', label: 'グループ' },
      { key: 'cron_expression', label: '実行周期' },
      { key: 'status', label: '状態' },
    ],
  },
  'system/category': {
    endpoint: '/api/system/category/list',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'category_id', label: 'カテゴリID' },
      { key: 'category_name', label: 'カテゴリ名' },
      { key: 'category_type', label: 'カテゴリ種別' },
      { key: 'discontinued_flg', label: '廃止フラグ' },
    ],
  },
  'crm/farmer/message': {
    endpoint: '/api/system/message/list',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'farmer_id', label: '農家ID' },
      { key: 'messages', label: 'メッセージ' },
      { key: 'send_time', label: '送信日時' },
      { key: 'read_status', label: '既読状態' },
    ],
  },
  'system/version': {
    endpoint: '/api/system/version',
  },
};
