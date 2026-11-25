import React, { useCallback, useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { useLocation, useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import ResultGrid from '../compontent/ResultGrid';
import CustomModal from '../compontent/CustomModal';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * 移動依頼（出庫）詳細画面（P404）
 *
 * 画面イメージ：②移動依頼管理 2. 移動依頼を確認する（生産管理）
 *   移動依頼一覧（P403）で移動依頼番号（O-）をクリックしたときに表示する。
 *
 * | 行 | 左 | 右 |
 * | --- | --- | --- |
 * | 1 行目 | 移動依頼番号 | 依頼状況 |
 * | 2 行目 | 移動先＋ロケ番（ラベル無し入力） | 移動希望日 |
 * | 3 行目 | 依頼者 | （空欄） |
 * | 4 行目 | 備考（全幅） | — |
 *
 * 品目一覧は「使用数・紛失／破損数・破棄数」を画面内で編集できる。
 *
 * 補足：バックエンドに移動依頼系の API が無いため、表示データは一覧（P403）から受け取った内容と
 *      フロント側の仮データで構成する。API 連携時は「API 連携箇所」のコメント箇所を差し替える。
 */

/** 一覧（P403）から受け取る移動依頼の内容 */
export interface MoveRequestDetailState {
    /** 移動依頼番号（出庫：O-／入庫：I-） */
    requestNo: string;
    /** 移動状況（1:移動依頼 / 2:移動予定 / 3:移動完了） */
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

/** 品目明細の型（出庫：使用数・紛失／破損数・破棄数を編集する） */
interface DetailRow {
    id: string;
    itemCode: string;
    itemName: string;
    /** 保管数（移動元の在庫数） */
    stockQty: number;
    /** 使用数 */
    useQty: number;
    /** 紛失／破損数 */
    lostQty: number;
    /** 破棄数 */
    discardQty: number;
    palletNo: string;
}

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

interface OptionItem {
    key: string;
    value: string;
}

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
    requestNo: state.requestNo || 'O-260805-001',
    // 依頼状況はコードではなく表示名で保持する（P401 の移動状況と同じ扱い）
    status: state.status || 'TF_P',
    destWarehouse: state.destWarehouse || '20',
    locationNo: 'B-1-1-1-1',
    desiredDate: normalizeDate(state.desiredDate),
    requester: normalizeRequester(state.requester),
    remark: '',
});

/**
 * 明細の初期値を作る（品目は一覧から受け取った内容を使う）
 * 数量は設計書の画面イメージに合わせた仮データ（保管数 100、1 行目のみ紛失／破損数 1）。
 */
const buildInitialDetails = (state: Partial<MoveRequestDetailState>): DetailRow[] => {
    const items = state.items && state.items.length > 0 ? state.items : DEFAULT_ITEMS;
    return items.map((item, index) => ({
        id: `detail-${index + 1}`,
        itemCode: item.itemCode,
        itemName: item.itemName,
        stockQty: 100,
        useQty: 10,
        lostQty: index === 0 ? 1 : 0,
        discardQty: 0,
        palletNo: `B261010-${String(index + 1).padStart(3, '0')}`,
    }));
};

const P404: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const location = useLocation();

    /** 一覧（P403）から渡された移動依頼の内容 */
    const state = (location.state || {}) as Partial<MoveRequestDetailState>;

    // 画面固有の値
    const title = '移動依頼（出庫）詳細';
    const itemModalTitle = '移動（出庫）品目検索';
    const formId = 'p404-form';
    // 品目検索の保管倉庫の初期値（出庫は行田工場の在庫を移動する）
    const { request } = useApiRequest();
    const defaultStorage = '10';
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);
    const [classificationOptions, setClassificationOptions] = useState<OptionItem[]>([]);
    const [statusOptions, setStatusOptions] = useState<OptionItem[]>([]);

    // 基本情報の初期値（クリア時に戻す先）
    const [initialForm] = useState(() => buildFormDefaults(state));
    const [destWhCd, setDestWhCd] = useState(initialForm.destWarehouse);
    // 明細の初期値（クリア時に戻す先）
    const [initialDetails] = useState(() => buildInitialDetails(state));

    const [formData, setFormData] = useState(initialForm);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 品目明細
    // AG Grid はセル編集時に渡した行オブジェクトを直接書き換えるため、クリア用の初期値は
    // 別オブジェクトとして保持する（同じオブジェクトを共有すると初期値まで編集後の値になる）。
    const [details, setDetails] = useState<DetailRow[]>(() =>
        initialDetails.map((detail) => ({ ...detail }))
    );

    // 品目検索モーダル
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [searchCondition, setSearchCondition] = useState<{
        storageLocation: string;
        itemTypes: string[];
        itemCode: string;
        itemName: string;
    }>({ storageLocation: defaultStorage, itemTypes: [], itemCode: '', itemName: '' });

    /** 移動状況・区分は辞書、移動先は倉庫マスタから取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [status, classification, warehouse] = await Promise.all([
                    request('post', 'api/common/options', { cmdOptionName: 'bss_transfer_status' }, {}, false, false),
                    request('post', 'api/common/options', { cmdOptionName: 'bss_classification' }, {}, false, false),
                    request('get', 'api/common/wh/options', {}, {}, false, false),
                ]);
                setStatusOptions(status?.data || []);
                setClassificationOptions(classification?.data || []);
                setWarehouseOptions(warehouse?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchOptions();
    }, []);

    useEffect(() => {
        if (statusOptions.length === 0) return;
        setFormData((prev) => {
            const found = statusOptions.find((option) => option.key === prev.status || option.value === prev.status);
            if (!found || prev.status === found.value) return prev;
            return { ...prev, status: found.value };
        });
        setFormVersion((version) => version + 1);
    }, [statusOptions]);

    /** 移動先に紐づくロケ番を取得する */
    useEffect(() => {
        const fetchLocations = async () => {
            if (!destWhCd) {
                setLocationOptions([]);
                return;
            }
            try {
                const result = await request('get', `api/common/${destWhCd}/location/options`, {}, {}, false, false);
                setLocationOptions(result?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchLocations();
    }, [destWhCd]);

    /** 明細に追加済みのパレット番号 */
    const addedPalletNos = useMemo(() => details.map((detail) => detail.palletNo), [details]);

    /** 検索結果（保管倉庫・製品／部品・品目コード・品目名で絞り込む） */
    const searchResult = useMemo(() => {
        const storageLabel =
            warehouseOptions.find((choice) => choice.key === searchCondition.storageLocation)?.value || '';
        const typeLabels = classificationOptions
            .filter((choice) => searchCondition.itemTypes.includes(choice.key))
            .map((choice) => choice.value);
        const code = searchCondition.itemCode.trim();
        const name = searchCondition.itemName.trim();
        return SEARCH_ITEMS.filter(
            (item) =>
                (!storageLabel || item.storageLocation === storageLabel) &&
                (searchCondition.itemTypes.length === 0 || typeLabels.includes(item.itemType)) &&
                (!code || item.itemCode.includes(code)) &&
                (!name || item.itemName.includes(name))
        );
    }, [searchCondition, warehouseOptions, classificationOptions]);

    /** 明細 1 行分の入力チェック結果（移動する数量が保管数を超えていないか） */
    const isOverStock = useCallback(
        (detail: DetailRow) => detail.useQty + detail.lostQty + detail.discardQty > detail.stockQty,
        []
    );

    /** 明細を削除する（列定義より先に定義する：参照時に未初期化にならないようにする） */
    const handleRemoveDetail = useCallback((id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    }, []);

    /** 明細の列定義（使用数・紛失／破損数・破棄数は画面内で編集できる） */
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
                headerName: '使用数',
                field: 'useQty',
                width: 110,
                editable: true,
                singleClickEdit: true,
                cellEditor: 'agNumberCellEditor',
                cellEditorParams: { min: 0 },
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '紛失／破損数',
                field: 'lostQty',
                width: 140,
                editable: true,
                singleClickEdit: true,
                cellEditor: 'agNumberCellEditor',
                cellEditorParams: { min: 0 },
                cellStyle: { justifyContent: 'flex-end' },
            },
            {
                headerName: '破棄数',
                field: 'discardQty',
                width: 110,
                editable: true,
                singleClickEdit: true,
                cellEditor: 'agNumberCellEditor',
                cellEditorParams: { min: 0 },
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
                notify('notify.common.non_negative_number', { type: 'warning' });
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
            notify('notify.transfer.already_added', { type: 'warning' });
            return;
        }
        setDetails((prev) => [
            ...prev,
            {
                id: `detail-${item.id}-${Date.now()}`,
                itemCode: item.itemCode,
                itemName: item.itemName,
                stockQty: item.quantity,
                useQty: 0,
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
        notify('notify.common.edit_cleared', { type: 'info' });
    };

    /** 前画面（移動依頼一覧）へ戻る */
    const handleBack = () => navigate(-1);

    /** 保管数を超えて入力されている明細 */
    const overStockRows = details.filter(isOverStock);

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
                    onSubmit={() => undefined}
                    toolbar={false}
                    defaultValues={formData}
                >
                    <div style={formSx.form2}>
                        <FormInput type={'text'} source="requestNo" label="移動依頼番号" readOnly />
                        <FormInput type={'text'} source="status" label="依頼状況" readOnly />
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '150px minmax(0, 1fr) minmax(0, 1fr)',
                                columnGap: '0.75rem',
                                alignItems: 'center',
                                width: '100%',
                                minWidth: 0,
                            }}
                        >
                            <FormInput
                                type={'filter-select'}
                                source="destWarehouse"
                                label="移動先"
                                choices={warehouseOptions}
                                onChange={(value) => setDestWhCd(normalizeChoiceValue(value))}
                                sx={{
                                    display: 'contents',
                                    label: { width: '150px', flexShrink: 0 },
                                    input: { width: '100%', minWidth: 0 },
                                }}
                            />
                            <FormInput
                                type={'filter-select'}
                                source="locationNo"
                                label={false}
                                choices={locationOptions}
                                sx={{
                                    width: '100%',
                                    minWidth: 0,
                                    flex: 'none',
                                    marginTop: 0,
                                    input: { width: '100%', minWidth: 0 },
                                }}
                            />
                        </div>
                        <FormInput type={'input-date'} source="desiredDate" label="移動希望日" />
                        <FormInput type={'text'} source="requester" label="依頼者" />
                        {/* 設計書では依頼者の右側は空欄 */}
                        <div />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput type={'text'} source="remark" label="備考" multiline inputHeight={80} />
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
                            <ResultGrid<DetailRow>
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
                {/* 更新は設計書の配置のみ（保存 API が未実装のため画面内の動作は未実装） */}
                <button style={buttonSx.button} type="button" title="更新機能は未実装です">
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
                                choices={warehouseOptions}
                            />
                            <FormInput
                                type={'multiple-choice'}
                                source="itemTypes"
                                label="製品／部品"
                                choices={classificationOptions}
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
                        <ResultGrid<SearchItem>
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

export default P404;
