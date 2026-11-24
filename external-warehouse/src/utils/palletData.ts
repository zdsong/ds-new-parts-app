/**
 * パレット番号管理（SP301〜SP305）共通のデータ定義と処理
 *
 * 設計書：①パレット番号管理
 *   3.1 製品・部品選択 / 3.2 品目検索 / 3.3 パレット番号発番 /
 *   3.4 パレット番号一覧 / 3.5 パレット情報詳細
 *
 * 画面で扱うデータ形式と、API（/api/pallet、/api/item）のデータ形式の変換をまとめる。
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
    /** 保管区分（ACTIVE / INACTIVE / DISPOSAL_CANDIDATE / SP） */
    storageCategory: string;
    /** 使用可否（0:使用可 / 1:使用不可） */
    usableFlag: string;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
}

/** 品目マスタ（品目検索の結果 1 件） */
export interface ItemMaster {
    itemCode: string;
    itemName: string;
    itemNameKana?: string;
    spec?: string;
    /** 品目区分（1:製品 / 3:部品） */
    itemCategory?: string;
}

/** パレットの基本情報 */
export interface PalletFormData {
    palletNo: string;
    /** 区分（1:製品 / 3:部品） */
    category: string;
    /** 保管場所（倉庫コード） */
    storageLocation: string;
    /** 保管エリア（ロケ番） */
    locationNo: string;
    /** 備考 */
    remark: string;
}

/** 一覧の 1 行分（＝パレット 1 枚と、その積載明細） */
export interface PalletRow {
    id: string;
    palletNo: string;
    category: string;
    storageLocation: string;
    /** 倉庫名（API の whNm） */
    storageLocationName: string;
    locationNo: string;
    inboundDate: string;
    storagePeriod: string;
    remark: string;
    version: number | null;
    details: PalletDetailItem[];
}

/** コンボボックスの選択肢（API の key-value） */
export interface OptionItem {
    key: string;
    value: string;
}

/** API の積載明細 */
export interface ApiPalletDetail {
    id?: string;
    itemCode: string;
    itemName?: string;
    productGroup?: string;
    arrangementNo?: string;
    storageQty?: number;
    storageCapacity?: number | null;
    storageType?: string;
    usableFlag?: string;
    remarks?: string;
    createTime?: string;
    createBy?: string;
    updateTime?: string;
    updateBy?: string;
}

/** API のパレット情報 */
export interface ApiPallet {
    id?: string;
    palletNo: string;
    barcode?: string;
    storagePeriod?: string;
    classification: string;
    inboundDate?: string;
    whCd: string;
    whNm?: string;
    zoneCd?: string;
    locCd: string;
    memo1?: string;
    memo2?: string;
    /** 印刷フラグ（0:未印刷 / 1:印刷済み） */
    printedFlg?: string;
    version?: number;
    createTime?: string;
    createBy?: string;
    updateTime?: string;
    updateBy?: string;
    details?: ApiPalletDetail[];
}

// 区分の選択肢（設計書の SP 画面表記に合わせて「製品／部品」とする）
export const CATEGORY_CHOICES = [
    { key: '1', value: '製品' },
    { key: '3', value: '部品' },
];

// コード→表示名の変換表
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    CATEGORY_CHOICES.map((choice) => [choice.key, choice.value])
);

/** 検索結果の数量入力の初期値（設計書の画面イメージに合わせて 10） */
export const DEFAULT_QUANTITY = 10;

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

/** 品目マスタから積載明細を作る（数量は既定値 10） */
export const createDetailFromItem = (item: ItemMaster): PalletDetailItem => {
    const now = formatDateTime(new Date());
    const loginUser = getLoginUserLabel();
    return {
        id: `${item.itemCode}-${Date.now()}`,
        itemCode: item.itemCode,
        itemName: item.itemName,
        productGroup: '',
        arrangementNo: '',
        storageCapacity: '',
        quantity: DEFAULT_QUANTITY,
        remark: '',
        storageCategory: 'ACTIVE',
        usableFlag: '0',
        createdAt: now,
        createdBy: loginUser,
        updatedAt: now,
        updatedBy: loginUser,
    };
};

/**
 * 数量が 0 以下、または数値でない明細があるか
 *
 * @param details 積載明細
 * @return 不正な数量がある場合は true
 */
export const hasNonPositiveQuantity = (details: { quantity: number }[]): boolean =>
    details.some((detail) => !Number.isFinite(Number(detail.quantity)) || Number(detail.quantity) <= 0);

/** 画面の積載明細を API の形式に変換する */
export const toApiDetail = (detail: PalletDetailItem) => ({
    itemCode: detail.itemCode,
    itemName: detail.itemName,
    productGroup: detail.productGroup || null,
    arrangementNo: detail.arrangementNo || null,
    storageQty: detail.quantity,
    storageCapacity: detail.storageCapacity === '' ? null : Number(detail.storageCapacity),
    storageType: detail.storageCategory || null,
    usableFlag: detail.usableFlag || '0',
    remarks: detail.remark || null,
});

/** API の積載明細を画面の形式に変換する */
export const fromApiDetail = (detail: ApiPalletDetail, index: number): PalletDetailItem => ({
    id: detail.id || `${detail.itemCode}-${index}`,
    itemCode: detail.itemCode,
    itemName: detail.itemName || '',
    productGroup: detail.productGroup || '',
    arrangementNo: detail.arrangementNo || '',
    storageCapacity:
        detail.storageCapacity === null || detail.storageCapacity === undefined
            ? ''
            : String(detail.storageCapacity),
    quantity: detail.storageQty ?? 0,
    remark: detail.remarks || '',
    storageCategory: detail.storageType || 'ACTIVE',
    usableFlag: detail.usableFlag || '0',
    createdAt: detail.createTime || '',
    createdBy: detail.createBy || '',
    updatedAt: detail.updateTime || '',
    updatedBy: detail.updateBy || '',
});

/** API のパレット情報を画面の形式に変換する */
export const fromApiPallet = (pallet: ApiPallet): {
    form: PalletFormData;
    details: PalletDetailItem[];
    row: PalletRow;
} => {
    const form: PalletFormData = {
        palletNo: pallet.palletNo || '',
        category: pallet.classification || '',
        storageLocation: pallet.whCd || '',
        locationNo: pallet.locCd || '',
        remark: pallet.memo1 || '',
    };
    const details = (pallet.details || []).map(fromApiDetail);
    const row: PalletRow = {
        id: pallet.id || pallet.palletNo,
        palletNo: pallet.palletNo || '',
        category: pallet.classification || '',
        storageLocation: pallet.whCd || '',
        storageLocationName: pallet.whNm || '',
        locationNo: pallet.locCd || '',
        inboundDate: pallet.inboundDate || '',
        storagePeriod: pallet.storagePeriod || '',
        remark: pallet.memo1 || '',
        version: pallet.version ?? null,
        details,
    };
    return { form, details, row };
};

/**
 * 数量の合計を文字列にする（小数第 2 位で丸め、不要な 0 は落とす）
 */
const formatTotalQuantity = (details: PalletDetailItem[]): string => {
    if (details.length === 0) return '';
    const total = details.reduce((sum, detail) => {
        const value = Number(detail.quantity);
        return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    return String(Math.round(total * 100) / 100);
};

/**
 * パレット番号表の印刷ラベルを組み立てる
 *
 * パレット番号 1 件につき 1 枚（A4）を出力する。
 * 積載明細が複数ある場合は、品番・品名・備考２を改行で並べ、数量は合計を印字する
 * （1 枚の用紙に 1 パレット分をまとめる）。
 */
export const buildPalletLabels = (
    pallets: {
        palletNo: string;
        category: string;
        storageLocation?: string;
        storageLocationName?: string;
        details: PalletDetailItem[];
    }[]
): PalletNumberSheetLabel[] =>
    pallets.map((pallet) => {
        const details = pallet.details ?? [];
        return {
            category: pallet.category,
            palletNo: pallet.palletNo,
            // 品番と品名は明細の順に行を対応させるため、空欄もそのまま 1 行として残す
            itemCode: details.map((detail) => detail.itemCode || '').join('\n'),
            itemName: details.map((detail) => detail.itemName || '').join('\n'),
            quantity: formatTotalQuantity(details),
            // 備考１は保管場所（倉庫名）を印字する
            remark1: pallet.storageLocationName || pallet.storageLocation || '',
            remark2: Array.from(
                new Set(
                    details
                        .map((detail) => (detail.remark || '').trim())
                        .filter((remark) => remark !== '')
                )
            ).join('\n'),
        };
    });

/**
 * パレット番号表を印刷する（印刷した枚数を返す。開けなかった場合は 0）
 *
 * @param pallets 印刷対象のパレット
 * @param targetWindow 呼び出し側で開いておいた印刷用ウィンドウ（省略時は内部で開く）
 * @param onUnsupported 印刷できなかった場合の通知（スマホの確認表示では使わない）
 * @param onPrinted スマホで「印刷する」のあと、確認を閉じたときに呼ぶ
 */
export const printPalletLabels = (
    pallets: {
        palletNo: string;
        category: string;
        storageLocation?: string;
        storageLocationName?: string;
        details: PalletDetailItem[];
    }[],
    targetWindow?: Window | null,
    onUnsupported?: () => void,
    onPrinted?: () => void
): number => {
    const labels = buildPalletLabels(pallets);
    if (labels.length === 0) {
        targetWindow?.close();
        return 0;
    }
    const printed = printPalletNumberSheet(labels, targetWindow, onUnsupported, onPrinted);
    return printed ? labels.length : 0;
};
