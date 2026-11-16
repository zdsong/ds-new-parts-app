import React, { useCallback, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import CustomModal from '../compontent/CustomModal';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * 移動依頼（出庫）画面（P401）
 *
 * 行田工場から外部倉庫へ部品を移動する場合の出庫依頼を登録する画面。
 * 画面イメージ：②移動依頼管理　①行田工場から外部倉庫へ移動する場合（出庫）
 *
 * 構成は設計書の画面イメージに合わせている。
 *   ・基本情報…移動依頼番号／移動状況／移動先／ロケ番／移動希望日／依頼者／備考
 *   ・品目一覧…「品目追加」で「移動（出庫）品目検索」を開き、選択した品目を明細に追加する
 *   ・明細の使用数・紛失／破損数・破棄数は画面内で直接編集できる（設計書の入力欄に相当）
 *
 * 補足：バックエンドに移動依頼系の API が無いため、採番・品目マスタはフロント側の仮実装。
 *       API 連携時は下部の「API 連携箇所」を差し替える。
 */

/** 基本情報の型 */
interface MoveRequestForm {
    /** 移動依頼番号（採番されるまで空） */
    requestNo: string;
    /** 移動状況 */
    status: string;
    /** 移動先（倉庫） */
    destWarehouse: string;
    /** ロケ番 */
    locationNo: string;
    /** 移動希望日（yyyy-mm-dd） */
    desiredDate: string;
    /** 依頼者 */
    requester: string;
    /** 備考 */
    remark: string;
}

/** 品目明細の型 */
interface MoveRequestDetail {
    id: string;
    itemCode: string;
    itemName: string;
    /** 保管数（移動元の在庫数） */
    stockQty: number;
    /** 使用数（今回移動する数） */
    useQty: number;
    /** 紛失／破損数 */
    lostQty: number;
    /** 破棄数 */
    discardQty: number;
    palletNo: string;
}

/** 移動（出庫）品目検索の検索結果行 */
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

// 移動先の選択肢（出庫は外部倉庫向け）
const DEST_CHOICES = [
    { key: '1', value: '外部倉庫' },
    { key: '2', value: '行田工場' },
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

/** 移動依頼（出庫）品目検索の仮データ（本来は在庫 API から取得する） */
const SEARCH_ITEMS: SearchItem[] = [
    {
        id: '1',
        itemCode: 'GP20A-101-RN-NAV3-00',
        itemName: 'アルミ支柱 A',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B26102001',
        quantity: 50,
    },
    {
        id: '2',
        itemCode: 'TLR560LB-S400-200-00',
        itemName: '本体ASSY H400',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B25101001',
        quantity: 50,
    },
    {
        id: '3',
        itemCode: 'GP20A-102-RN-NAV3-00',
        itemName: 'アルミ支柱 B',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B26102002',
        quantity: 30,
    },
    {
        id: '4',
        itemCode: 'HP30C-310-RN-NBV2-01',
        itemName: '化粧キャップ C',
        itemType: '部品',
        storageLocation: '行田工場',
        palletNo: 'B26102003',
        quantity: 20,
    },
    {
        id: '5',
        itemCode: 'V15FSM-100-00',
        itemName: '本体ASSY',
        itemType: '製品',
        storageLocation: '行田工場',
        palletNo: 'B26102004',
        quantity: 10,
    },
];

/** ログインユーザーの表示名を取得する（依頼者の初期値） */
const getLoginUserName = (): string => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        return user.nickName || user.userName || user.username || user.name || '';
    } catch {
        return '';
    }
};

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

/** 今日の日付を yyyy-mm-dd で返す（移動希望日の初期値） */
const today = (): string => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * 移動依頼番号を採番する（暫定実装）
 * 正式仕様ではサーバ側で採番するため、API 連携時に置き換える。
 */
const generateRequestNo = (): string => {
    const now = new Date();
    const date =
        String(now.getFullYear()) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    const seq = Number(sessionStorage.getItem('P401-move-request-seq') || '0') + 1;
    sessionStorage.setItem('P401-move-request-seq', String(seq));
    return `M-${date}-${String(seq).padStart(3, '0')}`;
};

/** 初期表示の明細（設計書の画面イメージに合わせた仮データ） */
const INITIAL_DETAILS: MoveRequestDetail[] = [
    {
        id: 'detail-1',
        itemCode: 'GP20A-101-RN-NAV3-00',
        itemName: 'アルミ支柱 A',
        stockQty: 100,
        useQty: 10,
        lostQty: 1,
        discardQty: 0,
        palletNo: 'B261010-001',
    },
    {
        id: 'detail-2',
        itemCode: 'TLR560LB-S400-200-00',
        itemName: '本体ASSY H400',
        stockQty: 100,
        useQty: 10,
        lostQty: 0,
        discardQty: 0,
        palletNo: 'B261010-002',
    },
];

const P401: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();

    // 基本情報（フォームの初期値）
    const [formData, setFormData] = useState<MoveRequestForm>({
        requestNo: '',
        status: '移動依頼',
        destWarehouse: '1',
        locationNo: 'A-1-2-3-4',
        desiredDate: today(),
        requester: getLoginUserName(),
        remark: '',
    });
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 品目明細
    const [details, setDetails] = useState<MoveRequestDetail[]>(INITIAL_DETAILS);

    // 品目検索モーダル
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [searchCondition, setSearchCondition] = useState<{
        storageLocation: string;
        itemTypes: string[];
        itemCode: string;
        itemName: string;
    }>({ storageLocation: '1', itemTypes: [], itemCode: '', itemName: '' });

    /** 明細に追加済みのパレット番号 */
    const addedPalletNos = useMemo(
        () => details.map((detail) => detail.palletNo),
        [details]
    );

    /** 検索結果（保管倉庫・製品／部品・品目コード・品目名で絞り込む） */
    const searchResult = useMemo(() => {
        const storageLabel =
            SEARCH_STORAGE_CHOICES.find((choice) => choice.key === searchCondition.storageLocation)?.value || '';
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

    /** 明細 1 行分の入力チェック結果（使用数などが保管数を超えていないか） */
    const isOverStock = useCallback((detail: MoveRequestDetail) => {
        const total = detail.useQty + detail.lostQty + detail.discardQty;
        return total > detail.stockQty;
    }, []);

    /** 明細を削除する（列定義より先に定義する：参照時に未初期化にならないようにする） */
    const handleRemoveDetail = useCallback((id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    }, []);

    /** 明細の列定義（使用数・紛失／破損数・破棄数は画面内で編集できる） */
    const detailColumnDefs = useMemo<ColDef<MoveRequestDetail>[]>(
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
        (event: CellValueChangedEvent<MoveRequestDetail>) => {
            const field = event.colDef.field as keyof MoveRequestDetail | undefined;
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
        setSearchCondition({ storageLocation: '1', itemTypes: [], itemCode: '', itemName: '' });
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
            storageLocation: normalizeChoiceValue(values?.storageLocation) || '1',
            itemTypes,
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        });
    };

    /** 検索条件をクリアする */
    const handleSearchClear = () => {
        setSearchCondition({ storageLocation: '1', itemTypes: [], itemCode: '', itemName: '' });
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
                useQty: 0,
                lostQty: 0,
                discardQty: 0,
                palletNo: item.palletNo,
            },
        ]);
    };

    /** 入力を初期状態に戻す */
    const handleClear = () => {
        setFormData({
            requestNo: '',
            status: '移動依頼',
            destWarehouse: '1',
            locationNo: 'A-1-2-3-4',
            desiredDate: today(),
            requester: getLoginUserName(),
            remark: '',
        });
        setFormVersion((version) => version + 1);
        setDetails([]);
        notify('入力内容をクリアしました。', { type: 'info' });
    };

    /** 前画面（移動依頼一覧）へ戻る */
    const handleBack = () => navigate(-1);

    /** 移動依頼を登録する */
    const handleSubmit = (values: any) => {
        const requestNo = formData.requestNo || generateRequestNo();
        const nextFormData: MoveRequestForm = {
            requestNo,
            status: '移動依頼',
            destWarehouse: normalizeChoiceValue(values?.destWarehouse) || '1',
            locationNo: normalizeChoiceValue(values?.locationNo) || '',
            desiredDate: values?.desiredDate || '',
            requester: values?.requester || '',
            remark: values?.remark || '',
        };

        setFormData(nextFormData);
        setFormVersion((version) => version + 1);
        notify(`移動依頼 ${requestNo} を登録しました（デモのため送信はしていません）。`, {
            type: 'success',
        });
    };

    /** 明細の合計数量（使用数＋紛失／破損数＋破棄数） */
    const totalMoveQty = details.reduce(
        (sum, detail) => sum + detail.useQty + detail.lostQty + detail.discardQty,
        0
    );

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
        <PageContainer title={'移動依頼（出庫）'}>
            {/* 基本情報 */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="基本情報" border={false}>
                <SimpleForm
                    key={formVersion}
                    id="p401-form"
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={formData}
                >
                    <div style={formSx.form2}>
                        <FormInput
                            type={'text'}
                            source="requestNo"
                            label="移動依頼番号"
                            readOnly
                            placeholder="未採番"
                        />
                        <FormInput
                            type={'text'}
                            source="status"
                            label="移動状況"
                            readOnly
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
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
                        </div>
                        <FormInput
                            type={'input-date'}
                            source="desiredDate"
                            label="移動希望日"
                        />
                        <FormInput
                            type={'text'}
                            source="requester"
                            label="依頼者"
                            placeholder="入力してください"
                        />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput
                                type={'text'}
                                source="remark"
                                label="備考"
                                multiline
                                placeholder="入力してください"
                            />
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 品目一覧 */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="品目一覧" border={false}>
                {/* 明細グリッドは行数に合わせて高さを詰める（一覧画面向けの min-height:350px を解除する） */}
                <style>{`
                    .p401-detail-grid .ag-center-cols-viewport,
                    .p401-detail-grid .ag-center-cols-clipper,
                    .p401-search-grid .ag-center-cols-viewport,
                    .p401-search-grid .ag-center-cols-clipper {
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
                        <div className="ag-theme-alpine p401-detail-grid" style={tableSx.tableContainer}>
                            <DataGrid<MoveRequestDetail>
                                columnDefs={detailColumnDefs}
                                rowData={details}
                                page={1}
                                pageSize={details.length}
                                onPageChange={() => undefined}
                                selectionMode="none"
                                rowHeight={38}
                                editing
                                onCellValueChanged={handleCellValueChanged}
                            />
                        </div>
                        <Typography variant={'body2'} sx={{ fontSize: 12, color: '#666666', mt: 1 }}>
                            使用数・紛失／破損数・破棄数はセルをクリックして直接入力できます。
                            合計 {totalMoveQty} 個
                        </Typography>
                        {overStockRows.length > 0 && (
                            <Typography variant={'body2'} sx={{ fontSize: 12, color: '#c62828', mt: 0.5 }}>
                                保管数を超えている明細が {overStockRows.length} 件あります。数量を確認してください。
                            </Typography>
                        )}
                    </>
                )}
            </CustomCard>

            {/* 操作ボタン（左：戻る・クリア／右：移動依頼） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button style={buttonSx.button} type="button" onClick={handleBack}>
                        戻る
                    </button>
                    <button style={buttonSx.button} type="button" onClick={handleClear}>
                        クリア
                    </button>
                </div>
                <button style={buttonSx.button} type="submit" form="p401-form">
                    移動依頼
                </button>
            </div>

            {/* 移動（出庫）品目検索モーダル */}
            <CustomModal
                open={itemModalOpen}
                onClose={handleCloseItemModal}
                title="移動（出庫）品目検索"
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
                            storageLocation: '1',
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
                    <div className="ag-theme-alpine p401-search-grid" style={tableSx.tableContainer}>
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

export default P401;
