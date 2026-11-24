import React, { useCallback, useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Box, Typography } from '@mui/material';
import { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import useApiRequest from '../adapters/apiUtil';
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
 * 移動先・ロケ番・製品／部品の選択肢は共通 API から取得する。
 * 品目追加の検索対象は在庫情報詳細（bss_inventory_detail）で、在庫状況が在庫（PA）かつ
 * 割り当て数量を超えて残っている明細とする。
 * 「移動依頼」ボタンで bss_transfer_order／bss_transfer_order_detail へ登録する。
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
    /** 在庫明細ID（追加済み判定に使用する） */
    inventoryId: string;
    itemCode: string;
    itemName: string;
    /** 保管数（移動元の在庫数） */
    stockQty: number;
    /** 引当可能数（数量 − 割り当て数量） */
    availableQty: number;
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
    /** 引当可能数（数量 − 割り当て数量） */
    availableQty: number;
}

/** 共通 API の選択肢 */
interface OptionItem {
    key: string;
    value: string;
    isDefault?: string;
}

/** 品目検索 API（在庫情報詳細）の 1 行 */
interface ApiCandidateRow {
    id: string;
    itemCode?: string;
    itemName?: string;
    classification?: string;
    classificationLabel?: string;
    whCd?: string;
    whName?: string;
    locCd?: string;
    palletNo?: string;
    qty?: number | string;
    allocationQty?: number | string;
}

/** 品目検索の検索条件 */
interface SearchCondition {
    storageLocation: string;
    itemTypes: string[];
    itemCode: string;
    itemName: string;
}

/** 移動元（出庫元）の倉庫コード。出庫は行田工場から移動する */
const SOURCE_WH_CD = '10';

/** 移動先の初期値。外部倉庫 */
const DEFAULT_DEST_WH_CD = '20';

/** 区分（製品／部品）の辞書タイプ */
const CLASSIFICATION_DICT_TYPE = 'bss_classification';

/** 品目検索結果の 1 ページあたりの件数 */
const SEARCH_PAGE_SIZE = 10;

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

/** 品目検索 API の結果を画面の行に変換する */
const toSearchItem = (row: ApiCandidateRow): SearchItem => {
    const quantity = Number(row.qty ?? 0);
    return {
        id: String(row.id),
        itemCode: row.itemCode || '',
        itemName: row.itemName || '',
        itemType: row.classificationLabel || '',
        storageLocation: row.whName || '',
        palletNo: row.palletNo || '',
        quantity,
        // 引当可能数は数量から割り当て数量を差し引いて求める
        availableQty: quantity - Number(row.allocationQty ?? 0),
    };
};

const P401: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const { request } = useApiRequest();

    // 基本情報（フォームの初期値）
    const [formData, setFormData] = useState<MoveRequestForm>({
        requestNo: '',
        status: '移動依頼',
        destWarehouse: DEFAULT_DEST_WH_CD,
        locationNo: '',
        desiredDate: today(),
        requester: getLoginUserName(),
        remark: '',
    });
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 品目明細（画面初期化時は空）
    const [details, setDetails] = useState<MoveRequestDetail[]>([]);

    // 移動先・ロケ番・区分の選択肢
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);
    const [classificationOptions, setClassificationOptions] = useState<OptionItem[]>([]);
    // 選択中の移動先（ロケ番の選択肢の絞り込みに使用する）
    const [destWhCd, setDestWhCd] = useState(DEFAULT_DEST_WH_CD);

    // 品目検索モーダル
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [searchFormVersion, setSearchFormVersion] = useState(0);
    // 品目検索の結果（在庫情報詳細）
    const [candidates, setCandidates] = useState<SearchItem[]>([]);
    // 品目検索結果のページ番号
    const [searchPage, setSearchPage] = useState(1);

    /** 倉庫・区分の選択肢を共通 API から取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [warehouse, classification] = await Promise.all([
                    request('get', 'api/common/wh/options', {}, {}, false, false),
                    request(
                        'post',
                        'api/common/options',
                        { cmdOptionName: CLASSIFICATION_DICT_TYPE },
                        {},
                        false,
                        false
                    ),
                ]);
                setWarehouseOptions(warehouse?.data || []);
                setClassificationOptions(classification?.data || []);
            } catch (error) {
                console.error(error);
                setWarehouseOptions([]);
                setClassificationOptions([]);
            }
        };
        fetchOptions();
    }, []);

    /** 移動先に紐づくロケ番の選択肢を共通 API から取得する */
    useEffect(() => {
        const fetchLocations = async () => {
            if (!destWhCd) {
                setLocationOptions([]);
                return;
            }
            try {
                const response = await request(
                    'get',
                    `api/common/${destWhCd}/location/options`,
                    {},
                    {},
                    false,
                    false
                );
                setLocationOptions(response?.data || []);
            } catch (error) {
                console.error(error);
                setLocationOptions([]);
            }
        };
        fetchLocations();
    }, [destWhCd]);

    /** 明細に追加済みの在庫明細ID */
    const addedInventoryIds = useMemo(
        () => details.map((detail) => detail.inventoryId),
        [details]
    );

    /** 品目検索結果の現在ページ分 */
    const candidatePageRows = useMemo(() => {
        const start = (searchPage - 1) * SEARCH_PAGE_SIZE;
        return candidates.slice(start, start + SEARCH_PAGE_SIZE);
    }, [candidates, searchPage]);

    /** 明細 1 行分の入力チェック結果（入力合計が引当可能数を超えていないか） */
    const isOverStock = useCallback((detail: MoveRequestDetail) => {
        const total = detail.useQty + detail.lostQty + detail.discardQty;
        return total > detail.availableQty;
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
                notify('notify.common.non_negative_number', { type: 'warning' });
            }
        },
        [notify]
    );

    /** 品目検索を実行して結果を取得する */
    const fetchCandidates = useCallback(
        async (condition: SearchCondition) => {
            try {
                const response = await request(
                    'get',
                    'api/transfer/candidates',
                    {},
                    {
                        whCd: condition.storageLocation,
                        classificationCodes: condition.itemTypes.join(','),
                        itemCode: condition.itemCode,
                        itemName: condition.itemName,
                    },
                    false,
                    false
                );
                const rows: ApiCandidateRow[] = response?.data || [];
                setCandidates(rows.map(toSearchItem));
                setSearchPage(1);
            } catch (error) {
                console.error(error);
                setCandidates([]);
                setSearchPage(1);
            }
        },
        [request]
    );

    /** 品目検索モーダルを開く */
    const handleOpenItemModal = () => {
        const condition: SearchCondition = {
            storageLocation: SOURCE_WH_CD,
            itemTypes: [],
            itemCode: '',
            itemName: '',
        };
        setSearchFormVersion((version) => version + 1);
        setItemModalOpen(true);
        fetchCandidates(condition);
    };

    /** 品目検索モーダルを閉じる */
    const handleCloseItemModal = () => setItemModalOpen(false);

    /** 品目検索を実行する */
    const handleSearch = (values: any) => {
        const itemTypes = Array.isArray(values?.itemTypes)
            ? values.itemTypes.map((value: any) => normalizeChoiceValue(value))
            : [];
        const condition: SearchCondition = {
            storageLocation: normalizeChoiceValue(values?.storageLocation) || SOURCE_WH_CD,
            itemTypes,
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        };
        fetchCandidates(condition);
    };

    /** 検索条件をクリアする */
    const handleSearchClear = () => {
        const condition: SearchCondition = {
            storageLocation: SOURCE_WH_CD,
            itemTypes: [],
            itemCode: '',
            itemName: '',
        };
        setSearchFormVersion((version) => version + 1);
        fetchCandidates(condition);
    };

    /** 検索結果から明細を追加する */
    const handleAddDetail = (item: SearchItem) => {
        // 追加済みかどうかは在庫明細単位で判定する（同じパレットでも品目が違えば追加できる）
        if (addedInventoryIds.includes(item.id)) {
            notify('notify.transfer.already_added', { type: 'warning' });
            return;
        }
        setDetails((prev) => [
            ...prev,
            {
                id: `detail-${item.id}-${Date.now()}`,
                inventoryId: item.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                stockQty: item.quantity,
                availableQty: item.availableQty,
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
            destWarehouse: DEFAULT_DEST_WH_CD,
            locationNo: '',
            desiredDate: today(),
            requester: getLoginUserName(),
            remark: '',
        });
        setDestWhCd(DEFAULT_DEST_WH_CD);
        setFormVersion((version) => version + 1);
        setDetails([]);
        notify('notify.common.input_cleared', { type: 'info' });
    };

    /** 前画面（移動依頼一覧）へ戻る */
    const handleBack = () => navigate(-1);

    /** 移動依頼を登録する */
    const handleSubmit = async (values: any) => {
        const destWarehouse = normalizeChoiceValue(values?.destWarehouse);
        const destLocation = normalizeChoiceValue(values?.locationNo);
        if (!destWarehouse) {
            notify('notify.transfer.select_destination', { type: 'warning' });
            return;
        }
        if (!destLocation) {
            notify('notify.common.select_location', { type: 'warning' });
            return;
        }
        if (details.length === 0) {
            notify('notify.transfer.add_move_items', { type: 'warning' });
            return;
        }
        if (details.some((detail) => detail.useQty <= 0)) {
            notify('notify.transfer.use_qty_min', { type: 'warning' });
            return;
        }
        if (details.some(isOverStock)) {
            notify(
                'notify.transfer.qty_over_available',
                { type: 'warning' }
            );
            return;
        }

        const payload = {
            sourceWhCd: SOURCE_WH_CD,
            destWhCd: destWarehouse,
            destLocCd: destLocation,
            desiredDate: values?.desiredDate || '',
            requester: values?.requester || '',
            memo: values?.remark || '',
            details: details.map((detail) => ({
                itemCode: detail.itemCode,
                itemName: detail.itemName,
                storageQty: detail.stockQty,
                usedQty: detail.useQty,
                lostDamagedQty: detail.lostQty,
                disposalQty: detail.discardQty,
                palletNo: detail.palletNo,
            })),
        };

        try {
            const response = await request('post', 'api/transfer/request', payload, {}, true, false);
            if (response?.code >= 200 && response?.code < 300) {
                const requestNo = response?.data || '';
                setFormData({
                    requestNo,
                    status: '移動依頼',
                    destWarehouse,
                    locationNo: payload.destLocCd,
                    desiredDate: payload.desiredDate,
                    requester: payload.requester,
                    remark: payload.memo,
                });
                setFormVersion((version) => version + 1);
                setDetails([]);
                notify('notify.transfer.registered', { type: 'success', messageArgs: { requestNo } });
            } else {
                notify(response?.message || 'notify.transfer.register_failed', { type: 'error' });
            }
        } catch (error) {
            console.error(error);
            notify('notify.transfer.register_failed', { type: 'error' });
        }
    };

    /** 明細の合計数量（使用数＋紛失／破損数＋破棄数） */
    const totalMoveQty = details.reduce(
        (sum, detail) => sum + detail.useQty + detail.lostQty + detail.discardQty,
        0
    );

    /** 引当可能数を超えて入力されている明細 */
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
                // 行（在庫明細）単位で追加済みを判定する
                const added = addedInventoryIds.includes(params.data.id);
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
        <PageContainer title={'移動依頼（出庫）'} titleUnderline bottomSpace>
            {/* 基本情報 */}
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="基本情報" border={false}>
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
                                inputHeight={80}
                                placeholder="入力してください"
                            />
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 品目一覧 */}
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="品目一覧" border={false}>
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
                                入力合計が引当可能数を超えている明細が {overStockRows.length} 件あります。数量を確認してください。
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
                        key={searchFormVersion}
                        sx={formSx.formContainer}
                        onSubmit={handleSearch}
                        toolbar={false}
                        defaultValues={{
                            storageLocation: SOURCE_WH_CD,
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
                        検索結果 {candidates.length} 件
                    </Typography>
                    <div className="ag-theme-alpine p401-search-grid" style={tableSx.tableContainer}>
                        <DataGrid<SearchItem>
                            columnDefs={searchColumnDefs}
                            rowData={candidatePageRows}
                            page={searchPage}
                            pageSize={SEARCH_PAGE_SIZE}
                            rowTotal={candidates.length}
                            onPageChange={(current) => setSearchPage(current)}
                            pagination
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
