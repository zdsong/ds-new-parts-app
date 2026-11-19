/**
 * 移動管理（SP401／SP402）の画面用データ
 *
 * 設計書：③移動管理（スマホ）
 *   4.1 バーコード読み取り（移動／入庫）
 *   4.2 移動登録・移動登録完了・移動依頼検索
 *   4.3 在庫検索は SP403
 *
 * 移動専用の API はまだ使わない。画面イメージの例をフロント側に置く。
 */

/** 品目区分（1:製品 / 3:部品）。製品と部品は混載できない */
export type MoveCategory = '1' | '3';

/** 移動登録の作り方（新規発番 / パレットをそのまま移動） */
export type MoveRegisterMode = 'issue' | 'whole';

/** 移動依頼の表示内容 */
export interface MoveRequestDetail {
    requestNo: string;
    destinationLabel: string;
    requester: string;
    desiredDate: string;
    remark: string;
}

/** 移動候補の品目 1 件 */
export interface MoveLine {
    id: string;
    itemCode: string;
    itemName: string;
    category: MoveCategory;
    /** 移動数量 */
    moveQty: number;
    /** 保管数量 */
    storageQty: number;
    /** 移動元のパレット番号 */
    palletNo: string;
    /** 保管場所（倉庫/ロケ番） */
    storagePlace: string;
    /** 移動依頼がある品目だけ入る */
    request: MoveRequestDetail | null;
}

/** バーコードで読み取ったパレット */
export interface ScannedPallet {
    palletNo: string;
    lines: MoveLine[];
    /** 入庫側で移動番号がある場合だけ入る */
    inbound: {
        moveNo: string;
        destinationWh: string;
        destinationLoc: string;
        remark: string;
        registrar: string;
    } | null;
}

/** 品目検索の 1 件 */
export interface MoveItemMaster {
    itemCode: string;
    itemName: string;
    category: MoveCategory;
    storageQty: number;
    palletNo: string;
    storagePlace: string;
}

/** 移動登録画面へ渡す内容 */
export interface MoveRegisterState {
    view: 'register';
    mode: MoveRegisterMode;
    palletNo: string;
    lines: MoveLine[];
}

/** 移動登録完了画面へ渡す内容 */
export interface MoveCompleteState {
    view: 'complete';
    mode: MoveRegisterMode;
    moveNo: string;
    palletNo: string;
    destinationWh: string;
    destinationLoc: string;
    remark: string;
    registrar: string;
    lines: MoveLine[];
}

/** 移動先倉庫 */
export const MOVE_WAREHOUSE_CHOICES = [
    { key: 'gyoda', value: '行田工場' },
    { key: 'external', value: '外部倉庫' },
];

/** 倉庫ごとのロケ番 */
export const MOVE_LOCATION_CHOICES: Record<string, { key: string; value: string }[]> = {
    gyoda: [
        { key: 'A-1-2-3-4', value: 'A-1-2-3-4' },
        { key: 'A-1-2-3-5', value: 'A-1-2-3-5' },
    ],
    external: [
        { key: 'A-1-2-3-4', value: 'A-1-2-3-4' },
        { key: 'A-1-2-3-5', value: 'A-1-2-3-5' },
        { key: 'B-1-2-3-5', value: 'B-1-2-3-5' },
    ],
};

/** 倉庫コードから表示名を返す */
export const moveWarehouseLabel = (key: string): string =>
    MOVE_WAREHOUSE_CHOICES.find((choice) => choice.key === key)?.value || '';

/** 画面イメージの移動登録者 */
export const MOVE_REGISTRAR = '佐藤太郎（外部倉庫）';

const sampleRequest: MoveRequestDetail = {
    requestNo: 'I-261016-001',
    destinationLabel: '行田工場/A-1-2-3-4',
    requester: '山田太郎（生産管理）',
    desiredDate: '2026/10/17',
    remark: 'XXXXXXXXXXXXXXX',
};

/** 読み取り結果の例（パレット番号表 B261010-001） */
const SAMPLE_PALLET: ScannedPallet = {
    palletNo: 'B261010-001',
    inbound: {
        moveNo: '260001000',
        destinationWh: 'gyoda',
        destinationLoc: 'A-1-2-3-4',
        remark: 'XXXXXXXXXXXXXXX',
        registrar: MOVE_REGISTRAR,
    },
    lines: [
        {
            id: 'scan-1',
            itemCode: 'TLR280LB-S400-401-BK-00',
            itemName: 'H400 背面化粧扉(ブラック)',
            category: '3',
            moveQty: 50,
            storageQty: 100,
            palletNo: 'B261010-002',
            storagePlace: '外部倉庫/A-1-2-3-5',
            request: sampleRequest,
        },
        {
            id: 'scan-2',
            itemCode: 'TLR280LB-S400-401-BK-01',
            itemName: 'H400 背面化粧扉(ブラック)',
            category: '3',
            moveQty: 100,
            storageQty: 100,
            palletNo: 'B261005-001',
            storagePlace: '外部倉庫/B-1-2-3-5',
            request: null,
        },
    ],
};

/** 品目検索の例。製品を 1 件含め、混載できないことを画面で確認できる */
export const MOVE_ITEM_MASTER: MoveItemMaster[] = [
    {
        itemCode: 'TLR280LB-S400-401-BK-00',
        itemName: 'H400 背面化粧扉(ブラック)',
        category: '3',
        storageQty: 100,
        palletNo: 'B261010-002',
        storagePlace: '外部倉庫/A-1-2-3-5',
    },
    {
        itemCode: 'TLR280LB-S400-401-BK-01',
        itemName: 'H400 背面化粧扉(ブラック)',
        category: '3',
        storageQty: 100,
        palletNo: 'B261005-001',
        storagePlace: '外部倉庫/B-1-2-3-5',
    },
    {
        itemCode: 'TLP280LB-S400N-301-BK-01',
        itemName: 'H400 捺印扉(ブラック)',
        category: '3',
        storageQty: 10,
        palletNo: 'B261010-002',
        storagePlace: '外部倉庫/B-1-2-3-4',
    },
    {
        itemCode: 'GP20A-101-RN-NAV3-00',
        itemName: 'アルミ支柱A',
        category: '1',
        storageQty: 100,
        palletNo: 'B261010-001',
        storagePlace: '外部倉庫/A-1-2-3-4',
    },
];

/** 読み取った文字列からパレットを探す。未知の番号は null */
export const findScannedPallet = (code: string): ScannedPallet | null => {
    const trimmed = code.trim();
    if (!trimmed) return null;
    if (trimmed === SAMPLE_PALLET.palletNo) {
        return {
            ...SAMPLE_PALLET,
            lines: SAMPLE_PALLET.lines.map((line) => ({ ...line, request: line.request ? { ...line.request } : null })),
        };
    }
    return null;
};

/** すでに選んだ品目と区分が混ざるときは false */
export const canMixCategory = (lines: MoveLine[], category: MoveCategory): boolean => {
    if (lines.length === 0) return true;
    return lines.every((line) => line.category === category);
};

/** 品目マスタから移動候補を作る。移動依頼が無いので移動数量の初期値は保管数量 */
export const lineFromMaster = (item: MoveItemMaster, moveQty: number): MoveLine => ({
    id: `${item.itemCode}-${Date.now()}`,
    itemCode: item.itemCode,
    itemName: item.itemName,
    category: item.category,
    moveQty,
    storageQty: item.storageQty,
    palletNo: item.palletNo,
    storagePlace: item.storagePlace,
    request: null,
});

/** 移動登録を確定し、画面イメージと同じ番号を採る（サーバ採番は行わない） */
export const completeMoveRegistration = (input: {
    mode: MoveRegisterMode;
    palletNo: string;
    destinationWh: string;
    destinationLoc: string;
    remark: string;
    lines: MoveLine[];
}): MoveCompleteState => ({
    view: 'complete',
    mode: input.mode,
    moveNo: '260001000',
    palletNo: input.mode === 'whole' ? input.palletNo : 'B261101-001',
    destinationWh: input.destinationWh,
    destinationLoc: input.destinationLoc,
    remark: input.remark,
    registrar: MOVE_REGISTRAR,
    lines: input.lines.map((line) => ({ ...line })),
});
