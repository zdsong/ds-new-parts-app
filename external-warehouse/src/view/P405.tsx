import React, { useCallback, useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { useLocation, useNavigate } from 'react-router-dom';

import useApiRequest from '../adapters/apiUtil';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import CustomModal from '../compontent/CustomModal';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * 移動依頼（入庫）詳細画面（P405）
 *
 * 画面イメージ：②移動依頼管理 2. 移動依頼を確認する（生産管理）
 *   移動依頼一覧（P403）で移動依頼番号（I-）をクリックしたときに表示する。
 *
 * | 行 | 左 | 右 |
 * | --- | --- | --- |
 * | 1 行目 | 移動依頼番号 | 移動先＋ロケ番（ラベル無し入力） |
 * | 2 行目 | 依頼者 | 移動希望日 |
 * | 3 行目 | 備考（全幅） | — |
 *
 * 品目一覧は「移動数」を画面内で編集できる。
 *
 * 補足：バックエンドに移動依頼系の API が無いため、表示データは一覧（P403）から受け取った内容と
 *      フロント側の仮データで構成する。API 連携時は「API 連携箇所」のコメント箇所を差し替える。
 */

/** 一覧（P403）から受け取る移動依頼の内容 */
export interface MoveRequestDetailState {
    /** 移動依頼番号（出庫：O-／入庫：I-） */
    requestNo: string;
    /** 移動状況（1:移動依頼 / 2:移動予定 / 3:移動完了）。入庫詳細では表示しない */
    status?: string;
    /** 移動先（1:行田工場 / 2:外部倉庫） */
    destWarehouse?: string;
    /** 移動希望日（yyyy/mm/dd） */
    desiredDate?: string;
    /** 依頼者氏名 */
    requester?: string;
    /** 明細の品目（品目コード・品目名） */
    items?: { itemCode: string; itemName: string }[];
}

/** 品目明細の型（入庫：移動数を編集する） */
interface DetailRow {
    id: string;
    /** 明細番号（登録済みの明細のみ。画面で追加した明細は未設定） */
    detailNo?: number;
    itemCode: string;
    itemName: string;
    /** 保管数（移動元の在庫数） */
    stockQty: number;
    /** 移動数 */
    moveQty: number;
    /** 紛失／破損数 */
    lostQty: number;
    /** 破棄数 */
    discardQty: number;
    palletNo: string;
}

/** 移動依頼詳細 API の明細行 */
interface ApiTransferDetailLine {
    detailNo?: number;
    itemCode?: string;
    itemName?: string;
    storageQty?: number | string;
    usedQty?: number | string;
    lostDamagedQty?: number | string;
    disposalQty?: number | string;
    palletNo?: string;
}

/** 移動依頼詳細 API のレスポンス */
interface ApiTransferDetail {
    requestNo?: string;
    status?: string;
    statusLabel?: string;
    sourceWhCd?: string;
    sourceWarehouse?: string;
    destWhCd?: string;
    destWarehouse?: string;
    requestDate?: string;
    desiredDate?: string;
    requester?: string;
    memo?: string;
    details?: ApiTransferDetailLine[];
}

/** 倉庫コードから画面の選択肢キーへの変換表 */
const LEGACY_WAREHOUSE: Record<string, string> = {
    '10': '1',
    '20': '2',
};

/** 画面の選択肢キーから倉庫コードへの変換表 */
const WAREHOUSE_BY_LEGACY: Record<string, string> = {
    '1': '10',
    '2': '20',
};

/** 品目検索の検索結果行 */
interface SearchItem {
    id: string;
    itemCode: string;
    itemName: string;
    /** 製品／部品 */
    itemType: string;
    storageLocation: string;
    palletNo: string;
    quantity: number;
}

// 移動状況の選択肢
const STATUS_CHOICES = [
    { key: '1', value: '移動依頼' },
    { key: '2', value: '移動予定' },
    { key: '3', value: '移動完了' },
];

// 移動先の選択肢
const DEST_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

// ロケ番の選択肢（⑤ロケ番マスタの形式に合わせた仮データ）
const LOCATION_CHOICES = [
    { key: 'A-1-2-3-4', value: 'A-1-2-3-4' },
    { key: 'A-1-2-3-5', value: 'A-1-2-3-5' },
    { key: 'B-1-1-1-1', value: 'B-1-1-1-1' },
    { key: 'B-2-2-2-2', value: 'B-2-2-2-2' },
];

// 検索条件の保管倉庫
const SEARCH_STORAGE_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

// 製品／部品の絞り込み
const ITEM_TYPE_CHOICES = [
    { key: '1', value: '製品' },
    { key: '2', value: '部品' },
];

// コード→表示名の変換表
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
    STATUS_CHOICES.map((choice) => [choice.key, choice.value])
);

/** 移動（出庫／入庫）品目検索の仮データ（本来は在庫 API から取得する） */
const SEARCH_ITEMS: SearchItem[] = [
    {
        id: '1',
        itemCode: 'GP20A-101-RN-NAV3-00',
        itemName: 'アルミ支柱 A',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B261010-001',
        quantity: 100,
    },
    {
        id: '2',
        itemCode: 'TLR560LB-S400-200-00',
        itemName: '本体ASSY H400',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B261010-002',
        quantity: 100,
    },
    {
        id: '3',
        itemCode: 'GP20A-102-RN-NAV3-00',
        itemName: 'アルミ支柱 B',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B261010-003',
        quantity: 30,
    },
    {
        id: '4',
        itemCode: 'HP30C-310-RN-NBV2-01',
        itemName: '化粧キャップ C',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B261010-004',
        quantity: 20,
    },
    {
        id: '5',
        itemCode: 'GP20A-201-RN-NAV3-00',
        itemName: 'アルミ支柱 C',
        itemType: '部品',
        storageLocation: '外部倉庫',
        palletNo: 'B261020-001',
        quantity: 40,
    },
    {
        id: '6',
        itemCode: 'TLR560LB-S400-210-00',
        itemName: '本体ASSY H410',
        itemType: '部品',
        storageLocation: '外部倉庫',
        palletNo: 'B261020-002',
        quantity: 60,
    },
    {
        id: '7',
        itemCode: 'V15FSM-100-00',
        itemName: '本体ASSY',
        itemType: '製品',
        storageLocation: '外部倉庫',
        palletNo: 'B261020-003',
        quantity: 10,
    },
];

/** 品目が取得できなかった場合の明細（設計書の画面イメージに合わせた仮データ） */
const DEFAULT_ITEMS = [
    { itemCode: 'GP20A-101-RN-NAV3-00', itemName: 'アルミ支柱 A' },
    { itemCode: 'TLR560LB-S400-200-00', itemName: '本体ASSY H400' },
];

/** 選択値を取り出す（選択コンポーネントは選択肢オブジェクトを返すため key に正規化する） */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/** 数値に正規化する（未入力は 0） */
const normalizeNumber = (value: any): number => {
    const normalized = Number(normalizeChoiceValue(value));
    return Number.isFinite(normalized) ? normalized : 0;
};

/** 表示用の依頼者名（一覧は「山田 太郎（生産管理）」の形式のため、所属を除いた氏名にする） */
const normalizeRequester = (value?: string): string =>
    (value || '').replace(/（.*?）|\(.*?\)/g, '').trim();

/** 日付を入力欄の形式（yyyy-mm-dd）に揃える */
const normalizeDate = (value?: string): string => (value || '').replace(/\//g, '-');

/** 基本情報の初期値を作る */
const buildFormDefaults = (state: Partial<MoveRequestDetailState>) => ({
    requestNo: state.requestNo || 'I-260805-002',
    destWarehouse: state.destWarehouse || '1',
    locationNo: 'A-1-2-3-4',
    desiredDate: normalizeDate(state.desiredDate),
    requester: normalizeRequester(state.requester),
    remark: '',
});

/**
 * 明細の初期値を作る（品目は一覧から受け取った内容を使う）
 * 数量は設計書の画面イメージに合わせた仮データ（保管数 100、移動数は 50／100）。
 */
const buildInitialDetails = (state: Partial<MoveRequestDetailState>): DetailRow[] => {
    const items = state.items && state.items.length > 0 ? state.items : DEFAULT_ITEMS;
    return items.map((item, index) => ({
        id: `detail-${index + 1}`,
        itemCode: item.itemCode,
        itemName: item.itemName,
        stockQty: 100,
        moveQty: index === 0 ? 50 : 100,
        lostQty: 0,
        discardQty: 0,
        palletNo: `B261010-${String(index + 1).padStart(3, '0')}`,
    }));
};

const P405: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const location = useLocation();
    const { request } = useApiRequest();

    /** 一覧（P403）から渡された移動依頼の内容 */
    const state = (location.state || {}) as Partial<MoveRequestDetailState>;

    // 画面固有の値
    const title = '移動依頼（入庫）詳細';
    const itemModalTitle = '移動（入庫）品目検索';
    const formId = 'p405-form';
    // 品目検索の保管倉庫の初期値（入庫は外部倉庫の在庫を移動する）
    const defaultStorage = '2';

    // 基本情報の初期値（クリア時に戻す先）
    const [initialForm, setInitialForm] = useState(() => buildFormDefaults(state));
    // 明細の初期値（クリア時に戻す先）
    const [initialDetails, setInitialDetails] = useState(() => buildInitialDetails(state));

    const [formData, setFormData] = useState(initialForm);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 品目明細
    // AG Grid はセル編集時に渡した行オブジェクトを直接書き換えるため、クリア用の初期値は
    // 別オブジェクトとして保持する（同じオブジェクトを共有すると初期値まで編集後の値になる）。
    const [details, setDetails] = useState<DetailRow[]>(() =>
        initialDetails.map((detail) => ({ ...detail }))
    );

    /** 移動依頼番号から詳細（ヘッダ・明細）を取得して画面へ反映する */
    const loadDetail = useCallback(async () => {
        const requestNo = state.requestNo;
        if (!requestNo) return;

        try {
            const response = await request(
                'get',
                'api/transfer/detail',
                { requestNo },
                {},
                false,
                false
            );
            const data: ApiTransferDetail | undefined = response?.data;
            if (!data) return;

            const nextForm = {
                requestNo: data.requestNo || requestNo,
                destWarehouse: LEGACY_WAREHOUSE[data.destWhCd || ''] || data.destWhCd || '',
                locationNo: initialForm.locationNo,
                desiredDate: normalizeDate(data.desiredDate),
                requester: normalizeRequester(data.requester),
                remark: data.memo || '',
            };
            // 移動数は移動依頼明細の使用数を表示する
            const nextDetails: DetailRow[] = (data.details || []).map((row, index) => ({
                id: `detail-${index + 1}`,
                detailNo: row.detailNo,
                itemCode: row.itemCode || '',
                itemName: row.itemName || '',
                stockQty: Number(row.storageQty ?? 0),
                moveQty: Number(row.usedQty ?? 0),
                lostQty: Number(row.lostDamagedQty ?? 0),
                discardQty: Number(row.disposalQty ?? 0),
                palletNo: row.palletNo || '',
            }));

            setInitialForm(nextForm);
            setFormData(nextForm);
            setFormVersion((version) => version + 1);
            setInitialDetails(nextDetails);
            setDetails(nextDetails.map((detail) => ({ ...detail })));
        } catch (error) {
            console.error(error);
        }
        // 画面表示時に一度だけ取得する
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.requestNo, request, initialForm.locationNo]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    // 品目検索モーダル
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [searchCondition, setSearchCondition] = useState<{
        storageLocation: string;
        itemTypes: string[];
        itemCode: string;
        itemName: string;
    }>({ storageLocation: defaultStorage, itemTypes: [], itemCode: '', itemName: '' });

    /** 明細に追加済みのパレット番号 */
    const addedPalletNos = useMemo(() => details.map((detail) => detail.palletNo), [details]);

    /** 検索結果（保管倉庫・製品／部品・品目コード・品目名で絞り込む） */
    const searchResult = useMemo(() => {
        const storageLabel =
            SEARCH_STORAGE_CHOICES.find(
                (choice) => choice.key === searchCondition.storageLocation
            )?.value || '';
        const code = searchCondition.itemCode.trim();
        const name = searchCondition.itemName.trim();
        return SEARCH_ITEMS.filter(
            (item) =>
                (!storageLabel || item.storageLocation === storageLabel) &&
                (searchCondition.itemTypes.length === 0 ||
                    searchCondition.itemTypes.includes(item.itemType)) &&
                (!code || item.itemCode.includes(code)) &&
                (!name || item.itemName.includes(name))
        );
    }, [searchCondition]);

    /** 明細 1 行分の入力チェック結果（移動する数量が保管数を超えていないか） */
    const isOverStock = useCallback(
        (detail: DetailRow) => detail.moveQty > detail.stockQty,
        []
    );

    /** 明細を削除する（列定義より先に定義する：参照時に未初期化にならないようにする） */
    const handleRemoveDetail = useCallback((id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    }, []);

    /** 明細の列定義（移動数は画面内で編集できる） */
    const detailColumnDefs = useMemo<ColDef<DetailRow>[]>(
        () => [
            {
                headerName: 'No',
                width: 60,
                valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
                cellStyle: { justifyContent: 'center' },
            },
            { headerName: '品目コード', field: 'itemCode', width: 210 },
            { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 180 },
            {
                headerName: '保管数',
                field: 'stockQty',
                width: 110,
                valueFormatter: (params) => `${params.value ?? 0} 個`,
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '移動数',
                field: 'moveQty',
                width: 110,
                editable: true,
                singleClickEdit: true,
                cellEditor: 'agNumberCellEditor',
                cellEditorParams: { min: 0 },
                cellStyle: { justifyContent: 'flex-end' },
                cellClassRules: {
                    'ew-cell-invalid': (params) =>
                        Boolean(params.data) &&
                        (params.data as DetailRow).moveQty > (params.data as DetailRow).stockQty,
                },
            },
            {
                headerName: '紛失／破損数',
                field: 'lostQty',
                width: 140,
                valueFormatter: (params) => `${params.value ?? 0} 個`,
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '破棄数',
                field: 'discardQty',
                width: 110,
                valueFormatter: (params) => `${params.value ?? 0} 個`,
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: 'パレット番号', field: 'palletNo', width: 150 },
            {
                headerName: '',
                width: 90,
                cellStyle: { justifyContent: 'center' },
                cellRenderer: (params: any) => (
                    <span
                        style={tableSx.linkFontColumn as React.CSSProperties}
                        onClick={() => handleRemoveDetail(params.data.id)}
                    >
                        削除
                    </span>
                ),
            },
        ],
        [handleRemoveDetail]
    );

    /** セル編集の確定処理（明細の値を更新する） */
    const handleCellValueChanged = useCallback(
        (event: CellValueChangedEvent<DetailRow>) => {
            const field = event.colDef.field as keyof DetailRow | undefined;
            if (!field || !event.data) return;

            const nextValue = normalizeNumber(event.newValue);
            setDetails((prev) =>
                prev.map((detail) =>
                    detail.id === event.data!.id ? { ...detail, [field]: nextValue } : detail
                )
            );

            if (nextValue < 0) {
                notify('0 以上の数値を入力してください。', { type: 'warning' });
            }
        },
        [notify]
    );

    /** 品目検索モーダルを開く */
    const handleOpenItemModal = () => {
        setSearchCondition({
            storageLocation: defaultStorage,
            itemTypes: [],
            itemCode: '',
            itemName: '',
        });
        setItemModalOpen(true);
    };

    /** 品目検索モーダルを閉じる */
    const handleCloseItemModal = () => setItemModalOpen(false);

    /** 品目検索を実行する */
    const handleSearch = (values: any) => {
        const itemTypes = Array.isArray(values?.itemTypes)
            ? values.itemTypes.map((value: any) => normalizeChoiceValue(value))
            : [];
        setSearchCondition({
            storageLocation: normalizeChoiceValue(values?.storageLocation) || defaultStorage,
            itemTypes,
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        });
    };

    /** 検索条件をクリアする */
    const handleSearchClear = () => {
        setSearchCondition({
            storageLocation: defaultStorage,
            itemTypes: [],
            itemCode: '',
            itemName: '',
        });
    };

    /** 検索結果から明細を追加する */
    const handleAddDetail = (item: SearchItem) => {
        if (addedPalletNos.includes(item.palletNo)) {
            notify('すでに品目一覧に追加されています。', { type: 'warning' });
            return;
        }
        setDetails((prev) => [
            ...prev,
            {
                id: `detail-${item.id}-${Date.now()}`,
                itemCode: item.itemCode,
                itemName: item.itemName,
                stockQty: item.quantity,
                moveQty: 0,
                lostQty: 0,
                discardQty: 0,
                palletNo: item.palletNo,
            },
        ]);
    };

    /**
     * 編集内容を初期状態に戻す
     * 詳細画面は登録済みの内容を確認する画面のため、クリアは「読み込み直後」に戻す動作とする。
     * 明細は同じ配列をそのまま戻すと AG Grid が行データの変更を検知しないため、複製して渡す。
     */
    const handleClear = () => {
        setFormData({ ...initialForm });
        setFormVersion((version) => version + 1);
        setDetails(initialDetails.map((detail) => ({ ...detail })));
        notify('編集内容をクリアしました。', { type: 'info' });
    };

    /** 前画面（移動依頼一覧）へ戻る */
    const handleBack = () => navigate(-1);

    /** 保管数を超えて入力されている明細 */
    const overStockRows = details.filter(isOverStock);

    /** 更新前の数量チェックを行い、移動依頼を更新する */
    const handleUpdate = async (values: any) => {
        if (details.length === 0) {
            notify('移動する品目が登録されていません。「品目追加」から選択してください。', {
                type: 'warning',
            });
            return;
        }
        if (details.some((detail) => detail.moveQty <= 0)) {
            notify('移動数は 1 以上を入力してください。', { type: 'warning' });
            return;
        }
        if (overStockRows.length > 0) {
            notify('移動数が保管数を超えている明細があります。数量を確認してください。', {
                type: 'warning',
            });
            return;
        }

        const requestNo = values?.requestNo || formData.requestNo;
        const destWarehouse = normalizeChoiceValue(values?.destWarehouse);
        if (!requestNo) {
            notify('移動依頼番号が指定されていません。', { type: 'warning' });
            return;
        }
        if (!destWarehouse) {
            notify('移動先を選択してください。', { type: 'warning' });
            return;
        }

        const payload = {
            requestNo,
            destWhCd: WAREHOUSE_BY_LEGACY[destWarehouse] || destWarehouse,
            desiredDate: values?.desiredDate || '',
            requester: values?.requester || '',
            memo: values?.remark || '',
            details: details.map((detail) => ({
                detailNo: detail.detailNo,
                itemCode: detail.itemCode,
                itemName: detail.itemName,
                storageQty: detail.stockQty,
                usedQty: detail.moveQty,
                lostDamagedQty: detail.lostQty,
                disposalQty: detail.discardQty,
                palletNo: detail.palletNo,
            })),
        };

        try {
            const response = await request('post', 'api/transfer/update', payload, {}, true, false);
            if (response?.code >= 200 && response?.code < 300) {
                notify('移動依頼を更新しました。', { type: 'success' });
                // 登録した明細番号を反映するため再取得する
                await loadDetail();
            } else {
                notify(response?.message || '移動依頼の更新に失敗しました。', { type: 'error' });
            }
        } catch (error) {
            console.error(error);
            notify('移動依頼の更新に失敗しました。', { type: 'error' });
        }
    };

    // 品目検索結果の列定義（追加のみ。検索結果側は編集しない）
    const searchColumnDefs: ColDef<SearchItem>[] = [
        { headerName: '品目コード', field: 'itemCode', flex: 1, minWidth: 200 },
        { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 160 },
        { headerName: '製品／部品', field: 'itemType', width: 120 },
        { headerName: '保管場所', field: 'storageLocation', width: 120 },
        { headerName: 'パレット番号', field: 'palletNo', width: 140 },
        { headerName: '数量', field: 'quantity', width: 90, cellStyle: { justifyContent: 'flex-end' } },
        {
            headerName: '追加',
            width: 90,
            cellStyle: { justifyContent: 'center' },
            cellRenderer: (params: any) => {
                const added = addedPalletNos.includes(params.data.palletNo);
                return added ? (
                    <span style={{ color: '#888888' }}>追加済</span>
                ) : (
                    <span
                        style={tableSx.linkFontColumn as React.CSSProperties}
                        onClick={() => handleAddDetail(params.data)}
                    >
                        追加
                    </span>
                );
            },
        },
    ];

    return (
        <PageContainer title={title} titleUnderline bottomSpace>
            {/* 基本情報 */}
            <CustomCard plain
                sx={{ width: '100%' }}
                titleVariant={'body1'}
                title="基本情報"
                border={false}
                action={
                    // 削除は設計書の配置のみ（画面内の動作は未実装）
                    <div style={{ marginRight: '20px', marginTop: '10px' }}>
                        <span
                            style={tableSx.linkFontColumn as React.CSSProperties}
                            title="削除機能は未実装です"
                        >
                            削除
                        </span>
                    </div>
                }
            >
                <SimpleForm
                    key={formVersion}
                    id={formId}
                    sx={formSx.formContainer}
                    onSubmit={handleUpdate}
                    toolbar={false}
                    defaultValues={formData}
                >
                    <div style={formSx.form2}>
                        <FormInput type={'text'} source="requestNo" label="移動依頼番号" readOnly />
                        <FormInput
                            type={'filter-select'}
                            source="destWarehouse"
                            label="移動先"
                            choices={DEST_CHOICES}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="ロケ番"
                            choices={LOCATION_CHOICES}
                        />
                        <FormInput type={'text'} source="requester" label="依頼者" />
                        <FormInput type={'input-date'} source="desiredDate" label="移動希望日" />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput type={'text'} source="remark" label="備考" multiline />
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 品目一覧 */}
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="品目一覧" border={false}>
                {/* 明細グリッドは行数に合わせて高さを詰める（一覧画面向けの min-height:350px を解除する） */}
                <style>{`
                    .move-detail-grid .ag-center-cols-viewport,
                    .move-detail-grid .ag-center-cols-clipper,
                    .move-search-grid .ag-center-cols-viewport,
                    .move-search-grid .ag-center-cols-clipper {
                        min-height: 0 !important;
                    }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '5px 0' }}>
                    <button style={buttonSx.button} type="button" onClick={handleOpenItemModal}>
                        品目追加
                    </button>
                </div>

                {details.length === 0 ? (
                    <Typography variant={'body2'}>
                        移動する品目が登録されていません。「品目追加」から選択してください。
                    </Typography>
                ) : (
                    <>
                        <div className="ag-theme-alpine move-detail-grid" style={tableSx.tableContainer}>
                            <DataGrid<DetailRow>
                                columnDefs={detailColumnDefs}
                                rowData={details}
                                page={1}
                                pageSize={details.length}
                                onPageChange={() => undefined}
                                rowUniqueKey="id"
                                selectionMode="none"
                                rowHeight={38}
                                editing
                                onCellValueChanged={handleCellValueChanged}
                            />
                        </div>
                        {overStockRows.length > 0 && (
                            <Typography variant={'body2'} sx={{ fontSize: 12, color: '#c62828', mt: 1 }}>
                                保管数を超えている明細が {overStockRows.length} 件あります。数量を確認してください。
                            </Typography>
                        )}
                    </>
                )}
            </CustomCard>

            {/* 操作ボタン（左：戻る・クリア／右：更新） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button style={buttonSx.button} type="button" onClick={handleBack}>
                        戻る
                    </button>
                    <button style={buttonSx.button} type="button" onClick={handleClear}>
                        クリア
                    </button>
                </div>
                {/* 更新はヘッダ・明細の内容を保存する */}
                <button style={buttonSx.button} type="submit" form={formId}>
                    更新
                </button>
            </div>

            {/* 移動（出庫／入庫）品目検索モーダル */}
            <CustomModal
                open={itemModalOpen}
                onClose={handleCloseItemModal}
                title={itemModalTitle}
                maxWidth="lg"
                actions={[
                    {
                        label: '閉じる',
                        onClick: handleCloseItemModal,
                        variant: 'outlined',
                    },
                ]}
            >
                {/* モーダルの共通スタイルは余白 0 のため、ここで左右の余白を補う */}
                <Box sx={{ px: 2, pb: 1 }}>
                    <SimpleForm
                        sx={formSx.formContainer}
                        onSubmit={handleSearch}
                        toolbar={false}
                        defaultValues={{
                            storageLocation: defaultStorage,
                            itemTypes: [],
                            itemCode: '',
                            itemName: '',
                        }}
                    >
                        <div style={formSx.form1}>
                            <FormInput
                                type={'filter-select'}
                                source="storageLocation"
                                label="保管倉庫"
                                choices={SEARCH_STORAGE_CHOICES}
                            />
                            <FormInput
                                type={'multiple-choice'}
                                source="itemTypes"
                                label="製品／部品"
                                choices={ITEM_TYPE_CHOICES}
                            />
                            <FormInput type={'text'} source="itemCode" label="品目コード" />
                            <FormInput type={'text'} source="itemName" label="品目名" />
                            <div style={buttonSx.buttonBar}>
                                <button style={buttonSx.button} type="button" onClick={handleSearchClear}>
                                    クリア
                                </button>
                                <button style={buttonSx.button} type="submit">
                                    検索
                                </button>
                            </div>
                        </div>
                    </SimpleForm>

                    <Typography variant={'body2'} sx={{ mt: 1, mb: 0.5, fontSize: 13 }}>
                        検索結果 {searchResult.length} 件
                    </Typography>
                    <div className="ag-theme-alpine move-search-grid" style={tableSx.tableContainer}>
                        <DataGrid<SearchItem>
                            columnDefs={searchColumnDefs}
                            rowData={searchResult}
                            page={1}
                            onPageChange={() => undefined}
                            rowUniqueKey="id"
                            selectionMode="none"
                            rowHeight={36}
                            noRowsShow="該当する品目がありません。"
                        />
                    </div>
                </Box>
            </CustomModal>
        </PageContainer>
    );
};

export default P405;
