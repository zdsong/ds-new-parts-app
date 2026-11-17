/**
 * パレット番号管理（SP301〜SP305）共通のデータ定義と処理
 *
 * 設計書：①パレット番号管理
 *   3.1 製品・部品選択 / 3.2 品目検索 / 3.3 パレット番号発番 /
 *   3.4 パレット番号一覧 / 3.5 パレット情報詳細
 *
 * 補足：現時点ではバックエンドにパレット系の API が無いため、PC 画面（P303〜P305）と
 *       同じくフロント側の仮データで動作する。API 連携時は本ファイルの
 *       「API 連携箇所」を差し替えれば、SP 側の各画面はそのまま利用できる。
 */
import { printPalletNumberSheet } from './palletNumberSheet';
import type { PalletNumberSheetLabel } from './palletNumberSheet';

/** 積載明細（パレットに積載する部品／製品） */
export interface PalletDetailItem {
    id: string;
    itemCode: string;
    itemName: string;
    productGroup: string;
    arrangementNo: string;
    storageCapacity: string;
    quantity: number;
    remark: string;
    /** 保管区分（製品のみ） */
    storageCategory: string;
    /** 使用可否（製品のみ） */
    usableFlag: string;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
}

/** 品目マスタ（品目検索の対象） */
export interface ItemMaster {
    id: string;
    /** 区分（1:製品 / 2:部品） */
    category: string;
    itemCode: string;
    itemName: string;
    productGroup: string;
    arrangementNo: string;
    capacity: string;
}

/** パレットの基本情報 */
export interface PalletFormData {
    palletNo: string;
    /** 区分（1:製品 / 2:部品） */
    category: string;
    /** 保管倉庫（1:行田工場 / 2:外部倉庫） */
    storageLocation: string;
    /** 保管エリア（ロケ番） */
    locationNo: string;
    remark: string;
}

/** 一覧の 1 行分（＝パレット 1 枚と、その積載明細） */
export interface PalletRow {
    id: string;
    palletNo: string;
    category: string;
    storageLocation: string;
    locationNo: string;
    inboundDate: string;
    storagePeriod: string;
    remark: string;
    details: PalletDetailItem[];
}

// 区分の選択肢（設計書の SP 画面表記に合わせて「製品／部品」とする）
export const CATEGORY_CHOICES = [
    { key: '1', value: '製品' },
    { key: '2', value: '部品' },
];

// 保管倉庫の選択肢
export const STORAGE_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

// 保管エリア（ロケ番）の選択肢
export const LOCATION_CHOICES = [
    { key: 'A-01-03-02', value: 'A-01-03-02' },
    { key: 'A-01-03-03', value: 'A-01-03-03' },
    { key: 'B-02-01-01', value: 'B-02-01-01' },
    { key: 'B-02-01-02', value: 'B-02-01-02' },
    { key: 'C-01-01-01', value: 'C-01-01-01' },
];

// 保管区分の選択肢（明細カードで使用する）
export const STORAGE_CATEGORY_CHOICES = [
    { key: '1', value: '稼働' },
    { key: '2', value: '不稼働' },
    { key: '3', value: '廃棄候補' },
    { key: '4', value: 'SP' },
];

// 使用可否の選択肢（明細カードで使用する）
export const USABLE_CHOICES = [
    { key: '1', value: '使用可' },
    { key: '2', value: '使用不可' },
];

// コード→表示名の変換表
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    CATEGORY_CHOICES.map((choice) => [choice.key, choice.value])
);
export const STORAGE_LABELS: Record<string, string> = Object.fromEntries(
    STORAGE_CHOICES.map((choice) => [choice.key, choice.value])
);

/** 品目マスタの仮データ（API 連携箇所） */
export const ITEM_MASTER: ItemMaster[] = [
    { id: '1', category: '2', itemCode: 'GP20A-101-RN-NAV3-00', itemName: 'アルミ支柱 A', productGroup: '門柱', arrangementNo: '3130300285', capacity: '1.655' },
    { id: '2', category: '2', itemCode: 'GP20A-101-RN-DB5-00', itemName: 'アルミ支柱 A', productGroup: '門柱', arrangementNo: '3130301000', capacity: '1.655' },
    { id: '3', category: '2', itemCode: 'GP20A-102-RN-NAV3-00', itemName: 'アルミ支柱 B', productGroup: '門柱', arrangementNo: '3130300286', capacity: '1.720' },
    { id: '4', category: '2', itemCode: 'TLR560LB-S400-200-00', itemName: '横桟 B', productGroup: '横桟', arrangementNo: '3130300512', capacity: '2.100' },
    { id: '5', category: '2', itemCode: 'TL07-P-2L-SK-00', itemName: 'Nasta Box FRONT ポスト（2戸用）', productGroup: '付属品', arrangementNo: '3130300777', capacity: '0.320' },
    { id: '6', category: '2', itemCode: 'TLR280LB-S400-401-BK-00', itemName: 'H400 背面化粧扉（ブラック）', productGroup: '横桟', arrangementNo: '3130300513', capacity: '1.655' },
    { id: '7', category: '1', itemCode: 'V15FSM-100-00', itemName: '本体ASSY', productGroup: '門柱', arrangementNo: '3130300901', capacity: '1.900' },
    { id: '8', category: '1', itemCode: 'V15FSM-110-00', itemName: '本体ASSY A', productGroup: '門柱', arrangementNo: '3130300902', capacity: '1.900' },
    { id: '9', category: '1', itemCode: 'V15FSM-200-00', itemName: '本体ASSY B', productGroup: '横桟', arrangementNo: '3130300910', capacity: '2.100' },
];

/**
 * 品目を検索する（区分・品目コード・品目名の部分一致）
 * API 連携箇所：品目マスタ検索 API に置き換える
 */
export const searchItems = (category: string, itemCode: string, itemName: string): ItemMaster[] => {
    const code = (itemCode || '').trim();
    const name = (itemName || '').trim();
    return ITEM_MASTER.filter(
        (item) =>
            (!category || item.category === category) &&
            (!code || item.itemCode.toLowerCase().includes(code.toLowerCase())) &&
            (!name || item.itemName.includes(name))
    );
};

/** 明細を組み立てる（仮データ用） */
const buildDetail = (
    id: string,
    itemCode: string,
    itemName: string,
    productGroup: string,
    arrangementNo: string,
    quantity: number,
    capacity = '1.655'
): PalletDetailItem => ({
    id,
    itemCode,
    itemName,
    productGroup,
    arrangementNo,
    storageCapacity: capacity,
    quantity,
    remark: '',
    storageCategory: '1',
    usableFlag: '1',
    createdAt: '2026/09/04 09:15',
    createdBy: '山田 太郎（123456）',
    updatedAt: '2026/09/04 09:15',
    updatedBy: '山田 太郎（123456）',
});

/** パレット一覧の仮データ（API 連携箇所） */
export const PALLETS: PalletRow[] = [
    {
        id: '1', palletNo: 'B260904-026', category: '2', storageLocation: '1',
        locationNo: 'A-01-03-02', inboundDate: '2026/09/04', storagePeriod: '9ヶ月', remark: '',
        details: [
            buildDetail('1-1', 'TLR280LB-S400-401-BK-00', 'H400 背面化粧扉（ブラック）', '横桟', '3130300513', 10),
            buildDetail('1-2', 'TLP280LB-S400N-301-BK-01', 'H400 捺印扉（ブラック）', '横桟', '3130300514', 10),
        ],
    },
    {
        id: '2', palletNo: 'B260904-021', category: '2', storageLocation: '1',
        locationNo: 'A-01-03-02', inboundDate: '2026/09/04', storagePeriod: '9ヶ月', remark: '',
        details: [buildDetail('2-1', 'TLR280LB-S400-401-BK-00', 'H400 背面化粧扉（ブラック）', '横桟', '3130300513', 10)],
    },
    {
        id: '3', palletNo: 'B260904-018', category: '2', storageLocation: '1',
        locationNo: 'A-01-03-03', inboundDate: '2026/09/03', storagePeriod: '9ヶ月', remark: '仕入先 A 便',
        details: [
            buildDetail('3-1', 'GP20A-101-RN-NAV3-00', 'アルミ支柱 A', '門柱', '3130300285', 20),
            buildDetail('3-2', 'GP20A-102-RN-NAV3-00', 'アルミ支柱 B', '門柱', '3130300286', 20),
            buildDetail('3-3', 'HP30C-310-RN-NBV2-01', '化粧キャップ C', '付属品', '3130300777', 40),
        ],
    },
    {
        id: '4', palletNo: 'B260903-012', category: '1', storageLocation: '2',
        locationNo: 'B-02-01-01', inboundDate: '2026/09/03', storagePeriod: '6ヶ月', remark: '',
        details: [
            buildDetail('4-1', 'V15FSM-100-00', '本体ASSY', '門柱', '3130300901', 8, '1.900'),
            buildDetail('4-2', 'V15FSM-200-00', '本体ASSY B', '横桟', '3130300910', 6, '2.100'),
        ],
    },
    {
        id: '5', palletNo: 'B260902-009', category: '1', storageLocation: '2',
        locationNo: 'B-02-01-02', inboundDate: '2026/09/02', storagePeriod: '6ヶ月', remark: '',
        details: [buildDetail('5-1', 'V15FSM-110-00', '本体ASSY A', '門柱', '3130300902', 12, '1.900')],
    },
    {
        id: '6', palletNo: 'B260902-005', category: '2', storageLocation: '1',
        locationNo: 'C-01-01-01', inboundDate: '2026/09/02', storagePeriod: '9ヶ月', remark: '',
        details: [buildDetail('6-1', 'TLR560LB-S400-200-00', '横桟 B', '横桟', '3130300512', 30, '2.100')],
    },
    {
        id: '7', palletNo: 'B260901-034', category: '2', storageLocation: '1',
        locationNo: 'A-01-03-02', inboundDate: '2026/09/01', storagePeriod: '9ヶ月', remark: '',
        details: [
            buildDetail('7-1', 'GP20A-101-RN-NAV3-00', 'アルミ支柱 A', '門柱', '3130300285', 15),
            buildDetail('7-2', 'TLR280LB-S400-401-BK-00', 'H400 背面化粧扉（ブラック）', '横桟', '3130300513', 5),
        ],
    },
    {
        id: '8', palletNo: 'B260901-030', category: '1', storageLocation: '2',
        locationNo: 'B-02-01-01', inboundDate: '2026/09/01', storagePeriod: '6ヶ月', remark: '出荷待ち',
        details: [buildDetail('8-1', 'V15FSM-100-00', '本体ASSY', '門柱', '3130300901', 4, '1.900')],
    },
];

/** 詳細画面を直接開いた場合に表示するサンプル（P305 と同じ考え方） */
export const SAMPLE_PALLET: PalletFormData = {
    palletNo: 'B260904-026',
    category: '2',
    storageLocation: '1',
    locationNo: 'A-01-03-02',
    remark: '',
};

/** 採番済みの連番を保持するキー（画面を跨いだ暫定の採番用） */
const ISSUE_SEQ_KEY = 'SP-pallet-issue-seq';

/**
 * パレット番号を採番する（暫定実装）
 * 正式仕様ではサーバ側で採番するため、API 連携時に置き換える。
 */
export const generatePalletNo = (): string => {
    const now = new Date();
    const date =
        String(now.getFullYear()).slice(-2) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    const prefix = 'B';
    const seq = Number(sessionStorage.getItem(ISSUE_SEQ_KEY) || '0') + 1;
    sessionStorage.setItem(ISSUE_SEQ_KEY, String(seq));
    return `${prefix}${date}-${String(seq).padStart(3, '0')}`;
};

/** 日時を「YYYY/MM/DD HH:mm」形式に整形する */
export const formatDateTime = (date: Date): string => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** ログインユーザーの表示名を取得する（追加者・最終更新者の表示用） */
export const getLoginUserLabel = (): string => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const name = user.userName || user.username || user.name || '';
        if (!name) return '－';
        return user.id ? `${name}（${user.id}）` : name;
    } catch {
        return '－';
    }
};

/** 選択値を取り出す（選択肢オブジェクトを key に正規化する） */
export const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/**
 * 品目マスタから積載明細を作る
 * 設計書の画面イメージに合わせて、既定の数量は 10 とする。
 */
export const createDetailFromItem = (item: ItemMaster): PalletDetailItem => {
    const now = formatDateTime(new Date());
    const loginUser = getLoginUserLabel();
    return {
        id: `${item.id}-${Date.now()}`,
        itemCode: item.itemCode,
        itemName: item.itemName,
        productGroup: item.productGroup,
        arrangementNo: item.arrangementNo,
        storageCapacity: item.capacity,
        quantity: 10,
        remark: '',
        storageCategory: '1',
        usableFlag: '1',
        createdAt: now,
        createdBy: loginUser,
        updatedAt: now,
        updatedBy: loginUser,
    };
};

/**
 * パレット番号表の印刷ラベルを組み立てる
 * 明細 1 件につき 1 枚（A4）を出力する。
 */
export const buildPalletLabels = (
    pallets: { palletNo: string; category: string; storageLocation: string; details: PalletDetailItem[] }[]
): PalletNumberSheetLabel[] =>
    pallets.flatMap((pallet) =>
        pallet.details.map((detail) => ({
            category: pallet.category,
            palletNo: pallet.palletNo,
            itemCode: detail.itemCode,
            itemName: detail.itemName,
            quantity: detail.quantity,
            remark1: STORAGE_LABELS[pallet.storageLocation] || '',
            remark2: detail.remark || '',
        }))
    );

/** パレット番号表を印刷する（ポップアップが開けなかった場合は false） */
export const printPalletLabels = (
    pallets: { palletNo: string; category: string; storageLocation: string; details: PalletDetailItem[] }[]
): number => {
    const labels = buildPalletLabels(pallets);
    if (labels.length === 0) return 0;
    const printed = printPalletNumberSheet(labels);
    return printed ? labels.length : 0;
};
