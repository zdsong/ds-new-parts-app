/**
 * 移動管理（SP401〜SP406）の画面用データ
 *
 * 設計書：③移動管理（スマホ）
 *   SP401 バーコード読み取り（移動）
 *   SP402 移動登録（1-3）
 *   SP403 在庫検索
 *   SP404 移動依頼
 *   SP405 移動登録完了（1-4 パレット番号表印刷）
 *   SP406 パレットを受け取る場合（移動先）のバーコード読み取り
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
    /** 移動依頼明細番号（移動登録で依頼明細を特定する） */
    requestDetailNo?: number | null;
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
    /** 在庫情報詳細の楽観ロック用バージョン */
    version?: number | null;
}

/**
 * パレットに移動依頼（依存）があるか
 * 後で API が返す識別子。true なら新規パレットを作る登録、false ならパレットをそのまま送る。
 */
export type PalletDependency = boolean;

/** バーコードで読み取ったパレット */
export interface ScannedPallet {
    palletNo: string;
    /** このパレットに移動依頼の依存があるか */
    dependent: PalletDependency;
    lines: MoveLine[];
    /** 入庫側で移動番号がある場合だけ入る */
    inbound: {
        moveNo: string;
        destinationWh: string;
        /** 移動先倉庫の表示名 */
        destinationWhNm?: string;
        destinationLoc: string;
        remark: string;
        registrar: string;
        /** 移動依頼の楽観ロック */
        version?: number;
    } | null;
}

/** 移動登録画面へ渡す内容 */
export interface MoveRegisterState {
    view: 'register';
    mode: MoveRegisterMode;
    /** true: ①品目を選んで新しいパレットを作る / false: ②パレット毎に送る */
    dependent: PalletDependency;
    palletNo: string;
    lines: MoveLine[];
    /** true: SP401 からパレット毎移動するで遷移してきたため、数量の変更・削除・追加を禁止する */
    readOnlyQty?: boolean;
}

/** 移動登録完了画面へ渡す内容 */
export interface MoveCompleteState {
    view: 'complete';
    mode: MoveRegisterMode;
    moveNo: string;
    palletNo: string;
    destinationWh: string;
    /** 移動先倉庫名（共通 API から取得した表示名） */
    destinationWhNm?: string;
    destinationLoc: string;
    remark: string;
    registrar: string;
    lines: MoveLine[];
}

/** 倉庫コードから表示名を返す（表示名は共通 API の倉庫選択肢を使用する） */
export const moveWarehouseLabel = (key: string): string => key || '';

/** 画面イメージの移動登録者 */
export const MOVE_REGISTRAR = '佐藤太郎（外部倉庫）';

const sampleRequest: MoveRequestDetail = {
    requestNo: 'I-261016-001',
    destinationLabel: '行田工場/A-1-2-3-4',
    requester: '山田太郎（生産管理）',
    desiredDate: '2026/10/17',
    remark: 'XXXXXXXXXXXXXXX',
};

/** ① 依存あり。依頼がある品目だけ依頼詳細を持ち、数量の初期値は依頼数量 */
export const REGISTER_WITH_DEPENDENCY: MoveRegisterState = {
    view: 'register',
    mode: 'issue',
    dependent: true,
    palletNo: '',
    lines: [
        {
            id: 'dep-1',
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
            id: 'dep-2',
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

/**
 * ② 依存なし。依頼データを持っていても画面では出さない
 * （設計書の「移動依頼詳細 ＋」は描き間違い）
 */
export const REGISTER_WITHOUT_DEPENDENCY: MoveRegisterState = {
    view: 'register',
    mode: 'whole',
    dependent: false,
    palletNo: 'B261010-001',
    lines: [
        {
            id: 'plain-1',
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
            id: 'plain-2',
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

/** 読み取り結果の例。B261010-001 / B261010-003 は入庫あり、B261010-002 は移動番号なし */
const DEPENDENT_PALLET: ScannedPallet = {
    palletNo: 'B261010-001',
    dependent: true,
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

/** 入庫確認用の 2 件目。複数読み取りで別カードになることを確認する */
const DEPENDENT_PALLET_NEXT: ScannedPallet = {
    palletNo: 'B261010-003',
    dependent: true,
    inbound: {
        moveNo: '260001001',
        destinationWh: 'gyoda',
        destinationLoc: 'A-1-2-3-5',
        remark: 'YYYYYYYYYYYYYYY',
        registrar: MOVE_REGISTRAR,
    },
    lines: DEPENDENT_PALLET.lines.map((line, index) => ({
        ...line,
        id: `scan-next-${index + 1}`,
        palletNo: 'B261010-003',
        request: line.request ? { ...line.request } : null,
    })),
};

/** 依存のないパレット。依頼データは持たせ、画面側で出さないことを確認する */
const PLAIN_PALLET: ScannedPallet = {
    palletNo: 'B261010-002',
    dependent: false,
    inbound: null,
    lines: REGISTER_WITHOUT_DEPENDENCY.lines.map((line) => ({
        ...line,
        request: line.request ? { ...line.request } : null,
    })),
};

const clonePallet = (pallet: ScannedPallet): ScannedPallet => ({
    ...pallet,
    lines: pallet.lines.map((line) => ({ ...line, request: line.request ? { ...line.request } : null })),
});

/** 読み取った文字列からパレットを探す。未知の番号は null */
export const findScannedPallet = (code: string): ScannedPallet | null => {
    const trimmed = code.trim();
    if (trimmed === DEPENDENT_PALLET.palletNo) return clonePallet(DEPENDENT_PALLET);
    if (trimmed === DEPENDENT_PALLET_NEXT.palletNo) return clonePallet(DEPENDENT_PALLET_NEXT);
    if (trimmed === PLAIN_PALLET.palletNo) return clonePallet(PLAIN_PALLET);
    return null;
};

/** すでに選んだ品目と区分が混ざるときは false */
export const canMixCategory = (lines: MoveLine[], category: MoveCategory): boolean => {
    if (lines.length === 0) return true;
    return lines.every((line) => line.category === category);
};

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
