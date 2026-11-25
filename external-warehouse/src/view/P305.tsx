import React, { useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Typography } from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useLocation, useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import ResultGrid from '../compontent/ResultGrid';
import CustomModal from '../compontent/CustomModal';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import { printPalletNumberSheet } from '../utils/palletNumberSheet';
import { buildPalletLabels, hasNonPositiveQuantity } from '../utils/palletData';

/**
 * パレット情報詳細画面（P305）
 *
 * 発番済みパレットの内容を確認・更新・削除し、パレット番号表を印刷する。
 * 画面イメージ：②仕入先から部品が届いた時 (2) パレット情報詳細画面
 *
 * P303（パレット番号発番画面）を基にしており、相違点は操作ボタンのみ。
 *   ・「番号表印刷」…基本情報カードの右上に配置
 *   ・画面右下…削除（左）／リセット・更新（右）
 *
 * バックエンド連携：
 *   ・パレット情報の取得 … GET /api/pallet/{palletNo}（積載明細を含む）
 *   ・更新 … PUT /api/pallet（version による楽観ロック。明細はサーバ側で入れ替え）
 *   ・削除 … DELETE /api/pallet/{palletNo}（論理削除）
 *   ・選択肢／品目検索 … P303 と同じ API を使用する
 */

// 積載明細（パレットに積載する部品／製品）の型
// 画面内で扱う名称（quantity／storageCategory／remark）は API の項目名と異なるため、
// API へ送る際は toApiDetail()、受け取る際は toDetailItem() で変換する。
interface PalletDetailItem {
    id: string;
    itemCode: string;
    itemName: string;
    productGroup: string;
    arrangementNo: string;
    storageCapacity: string;
    quantity: number;
    remark: string;
    // 以下は製品明細のみ使用する項目
    storageCategory: string;
    usableFlag: string;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
}

// 品目検索結果（/api/item/list の行）
interface ItemMaster {
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    sysItemCode: string;
    janCode: string;
}

// パレット入力情報の型
interface PalletFormData {
    palletNo: string;
    storagePeriod: string;
    category: string;
    inboundDate: string;
    storageLocation: string;
    locationNo: string;
    remark: string;
}

// 選択肢（/api/common/options の戻り値）
interface OptionItem {
    key: string;
    value: string;
    isDefault?: string;
}

// GET /api/pallet/{palletNo} のレスポンス
interface PalletNumberVo {
    id: string;
    palletNo: string;
    storagePeriod: string;
    classification: string;
    inboundDate: string;
    whCd: string;
    locCd: string;
    memo1: string;
    version: number;
    details?: PalletDetailVo[];
}

interface PalletDetailVo {
    id: string;
    itemCode: string;
    itemName: string;
    productGroup: string;
    arrangementNo: string;
    storageQty: number;
    storageCapacity: number | null;
    storageType: string;
    usableFlag: string;
    remarks: string;
    createTime: string;
    createBy: string;
    updateTime: string;
    updateBy: string;
}

// 製品群の選択肢（商品マスタに製品群の項目が無いため、当面は固定の候補から選ぶ）
const PRODUCT_GROUP_CHOICES = [
    { key: '門柱', value: '門柱' },
    { key: '横桟', value: '横桟' },
    { key: '付属品', value: '付属品' },
];

// 初期値（パレット情報を取得するまでは空。ロケ番は保管場所の選択後に取得した候補から選ぶ）
const INITIAL_FORM: PalletFormData = {
    palletNo: '',
    storagePeriod: '',
    category: '',
    inboundDate: '',
    storageLocation: '',
    locationNo: '',
    remark: '',
};

/**
 * 部品区分 → 商品マスタの sales_flg
 * mast_item.sales_flg は 1:製品 / 0:部品 として部品・製品を区分する。
 * （辞書 bss_classification は 1:製品 / 3:仕掛品）
 */
const SALES_FLG_BY_CLASSIFICATION: Record<string, string> = {
    '1': '1',
    '3': '0',
};

// 品目検索の1ページあたりの件数
const ITEM_PAGE_SIZE = 10;

/**
 * 日時を「YYYY/MM/DD HH:mm」形式に整形する（明細の追加日時・更新日時用）
 */
const formatDateTime = (date: Date): string => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * ログインユーザーの表示名を取得する（追加者・最終更新者の表示用）
 */
const getLoginUserLabel = (): string => {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const name = user.userName || user.username || user.name || '';
        if (!name) return '－';
        return user.id ? `${name}（${user.id}）` : name;
    } catch {
        return '－';
    }
};

/**
 * 選択値を取り出す（AutocompleteInput は選択肢オブジェクトを返すため、key に正規化する）
 */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/**
 * 画面の明細を API（/api/pallet）の明細項目へ変換する
 */
const toApiDetail = (detail: PalletDetailItem) => ({
    itemCode: detail.itemCode,
    itemName: detail.itemName,
    productGroup: detail.productGroup,
    arrangementNo: detail.arrangementNo,
    storageQty: detail.quantity,
    storageCapacity: detail.storageCapacity === '' ? null : Number(detail.storageCapacity),
    storageType: detail.storageCategory,
    usableFlag: detail.usableFlag,
    remarks: detail.remark,
});

/**
 * API の明細を画面の明細へ変換する
 */
const toDetailItem = (detail: PalletDetailVo): PalletDetailItem => ({
    id: detail.id,
    itemCode: detail.itemCode || '',
    itemName: detail.itemName || '',
    productGroup: detail.productGroup || '',
    arrangementNo: detail.arrangementNo || '',
    storageCapacity:
        detail.storageCapacity === null || detail.storageCapacity === undefined
            ? ''
            : String(detail.storageCapacity),
    quantity: detail.storageQty ?? 0,
    remark: detail.remarks || '',
    storageCategory: detail.storageType || '',
    usableFlag: detail.usableFlag || '',
    createdAt: detail.createTime || '',
    createdBy: detail.createBy || '',
    updatedAt: detail.updateTime || '',
    updatedBy: detail.updateBy || '',
});

const P305: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const location = useLocation();
    const { request } = useApiRequest();

    // 遷移元（P303／P304）から渡されたパレット番号
    const initialPalletNo = useMemo(() => {
        const state = location.state as
            | { pallet?: PalletFormData; palletNo?: string }
            | null;
        if (!state) return '';
        return normalizeChoiceValue(state.pallet?.palletNo) || normalizeChoiceValue(state.palletNo);
    }, [location.state]);

    // パレット情報（フォームの初期値として使用）
    const [formData, setFormData] = useState<PalletFormData>({
        ...INITIAL_FORM,
        palletNo: initialPalletNo,
    });
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 積載明細（部品／製品のカード一覧）
    const [details, setDetails] = useState<PalletDetailItem[]>([]);
    // 区分（基本情報の選択値。積載明細の表示切替に使用する）
    const [category, setCategory] = useState('');
    // 保管場所（ロケ番の取得に使用する）
    const [whCd, setWhCd] = useState('');
    // 楽観ロック用の version（取得した値をそのまま更新時に返す）
    const [version, setVersion] = useState<number | undefined>(undefined);

    // 選択肢（辞書・倉庫・ロケ番）
    const [classificationOptions, setClassificationOptions] = useState<OptionItem[]>([]);
    const [storageTypeOptions, setStorageTypeOptions] = useState<OptionItem[]>([]);
    const [usableFlagOptions, setUsableFlagOptions] = useState<OptionItem[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);

    // 部品検索モーダル関連
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [itemSearchValues, setItemSearchValues] = useState({ itemCode: '', itemName: '' });
    const [itemSearchCondition, setItemSearchCondition] = useState({ itemCode: '', itemName: '' });
    const [itemRows, setItemRows] = useState<ItemMaster[]>([]);
    const [itemTotal, setItemTotal] = useState(0);
    const [itemPage, setItemPage] = useState(1);

    // ログインユーザー（明細の追加者・最終更新者）
    const loginUserLabel = useMemo(getLoginUserLabel, []);

    // 区分が製品かどうか
    const isProduct = category === '1';
    // 区分が選択済みかどうか（未選択時は追加ボタンを非活性にする）
    const isCategorySelected = category !== '';
    // パレット番号が確定しているかどうか（未指定時は更新・削除できない）
    const hasPalletNo = !!formData.palletNo;

    // 追加ボタンの表示名（区分に応じて切り替える）
    const addButtonLabel = isProduct ? '製品追加' : '部品追加';
    // 明細が空の場合のメッセージ
    const emptyMessage = isProduct
        ? '積載する製品が登録されていません。'
        : '積載する部品が登録されていません。';

    // 既に明細へ追加済みの品目コード
    const addedItemCodes = useMemo(
        () => details.map((detail) => detail.itemCode),
        [details]
    );

    /**
     * 取得したパレット情報を画面へ反映する
     */
    const applyPallet = (vo: PalletNumberVo) => {
        setFormData({
            palletNo: vo.palletNo || '',
            storagePeriod: vo.storagePeriod || '',
            category: vo.classification || '',
            inboundDate: vo.inboundDate || '',
            storageLocation: vo.whCd || '',
            locationNo: vo.locCd || '',
            remark: vo.memo1 || '',
        });
        setCategory(vo.classification || '');
        setWhCd(vo.whCd || '');
        setVersion(vo.version);
        setDetails((vo.details || []).map(toDetailItem));
        // 取得した値でフォームを作り直す（初期値の表示名を選択肢から解決するため）
        setFormVersion((current) => current + 1);
    };

    /**
     * パレット情報を取得する
     */
    const loadPallet = async (palletNo: string) => {
        if (!palletNo) return;
        try {
            const result = await request('get', `api/pallet/${palletNo}`, {}, {}, true, false);
            if (result?.code !== 200 || !result?.data) return;
            applyPallet(result.data as PalletNumberVo);
        } catch (error) {
            console.error(error);
        }
    };

    /** 選択肢（辞書データ・倉庫）を取得する */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [classification, storageType, usableFlag, warehouse] = await Promise.all([
                    request('post', 'api/common/options', { cmdOptionName: 'bss_classification' }, {}, false, false),
                    request('post', 'api/common/options', { cmdOptionName: 'bss_pallet_storage_type' }, {}, false, false),
                    request('post', 'api/common/options', { cmdOptionName: 'sys_usable_flag' }, {}, false, false),
                    request('get', 'api/common/wh/options', {}, {}, false, false),
                ]);
                setClassificationOptions(classification?.data || []);
                setStorageTypeOptions(storageType?.data || []);
                setUsableFlagOptions(usableFlag?.data || []);
                setWarehouseOptions(warehouse?.data || []);
                // 選択肢の取得後にフォームを作り直す（保管場所などの表示名を解決するため）
                setFormVersion((current) => current + 1);
            } catch (error) {
                console.error(error);
            }
        };
        fetchOptions();
    }, []);

    /** 保管場所に紐づくロケ番を取得する */
    useEffect(() => {
        const fetchLocations = async () => {
            if (!whCd) {
                setLocationOptions([]);
                return;
            }
            try {
                const result = await request('get', `api/common/${whCd}/location/options`, {}, {}, false, false);
                setLocationOptions(result?.data || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchLocations();
    }, [whCd]);

    /** パレット情報を取得する（遷移元からパレット番号を受け取った場合） */
    useEffect(() => {
        if (!initialPalletNo) {
            notify('notify.pallet.number_not_specified_from_list', {
                type: 'warning',
            });
            return;
        }
        loadPallet(initialPalletNo);
    }, [initialPalletNo]);

    /** 品目を検索する（区分に応じて sales_flg を切り替える） */
    const searchItems = async (condition: { itemCode: string; itemName: string }, page: number) => {
        try {
            const result = await request(
                'get',
                'api/item/list',
                {
                    itemCode: condition.itemCode,
                    itemName: condition.itemName,
                    salesFlg: SALES_FLG_BY_CLASSIFICATION[category] || '',
                },
                { current: page, pageSize: ITEM_PAGE_SIZE },
                false,
                false
            );
            setItemRows(result?.rows || []);
            setItemTotal(result?.total || 0);
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * 区分の変更処理
     * 積載明細の種類が変わるため、積載済みの明細はクリアする。
     */
    const handleCategoryChange = (value: any) => {
        const nextCategory = normalizeChoiceValue(value);
        if (nextCategory === category) return;

        setCategory(nextCategory);
        if (details.length > 0) {
            setDetails([]);
            notify('notify.pallet.classification_changed_cleared', { type: 'warning' });
        }
    };

    /** 保管場所の変更処理（ロケ番は選択し直す） */
    const handleWarehouseChange = (value: any) => {
        setWhCd(normalizeChoiceValue(value));
    };

    /** 更新処理（入力内容をサーバへ登録する） */
    const handleUpdate = async (values: any) => {
        const palletNo = formData.palletNo;
        const classification = normalizeChoiceValue(values?.category);
        const warehouse = normalizeChoiceValue(values?.storageLocation);
        const locationCd = normalizeChoiceValue(values?.locationNo);

        if (!palletNo) {
            notify('notify.pallet.number_not_specified', { type: 'warning' });
            return;
        }
        if (!classification) {
            notify('notify.pallet.select_category', { type: 'warning' });
            return;
        }
        if (!warehouse) {
            notify('notify.pallet.select_storage', { type: 'warning' });
            return;
        }
        if (!locationCd) {
            notify('notify.common.select_location', { type: 'warning' });
            return;
        }
        if (hasNonPositiveQuantity(details)) {
            notify('notify.pallet.quantity_must_be_positive', { type: 'warning' });
            return;
        }

        try {
            const result = await request(
                'put',
                'api/pallet',
                {
                    palletNo,
                    storagePeriod: values?.storagePeriod || '',
                    classification,
                    inboundDate: values?.inboundDate || '',
                    whCd: warehouse,
                    locCd: locationCd,
                    memo1: values?.remark || '',
                    version,
                    details: details.map(toApiDetail),
                },
                {},
                true,
                false
            );

            if (result?.code !== 200) {
                return;
            }

            notify('notify.pallet.updated', { type: 'success' });
            // 更新後の状態（version・更新日時・明細ID）をサーバから取り直す
            await loadPallet(palletNo);
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * 番号表印刷処理
     * パレット 1 件につきパレット番号表 1 枚を出力する（A4 縦・区分で見出しが変わる）。
     * 積載明細が複数ある場合は 1 枚にまとめて印字する。
     */
    const handlePrint = () => {
        if (!formData.palletNo) {
            notify('notify.pallet.number_not_issued', { type: 'warning' });
            return;
        }
        if (details.length === 0) {
            notify('notify.pallet.no_print_details', { type: 'warning' });
            return;
        }

        // 設計書の記入例（備考１＝行田工場）に合わせ、備考１は保管場所、備考２は明細の備考を出力する
        const storageLocationLabel =
            warehouseOptions.find((choice) => choice.key === formData.storageLocation)?.value ?? '';

        const labels = buildPalletLabels([
            {
                palletNo: formData.palletNo,
                category: formData.category,
                storageLocationName: storageLocationLabel,
                details,
            },
        ]);

        if (!printPalletNumberSheet(labels)) {
            notify('notify.pallet.print_window_failed', {
                type: 'warning',
            });
            return;
        }
        notify('notify.pallet.print_sheet', { type: 'info' });
    };

    /** 削除処理（パレット情報を削除して発番画面へ戻る） */
    const handleDelete = async () => {
        const palletNo = formData.palletNo;
        if (!palletNo) {
            notify('notify.pallet.number_not_specified', { type: 'warning' });
            return;
        }
        if (!window.confirm('このパレット情報を削除してもよろしいですか？')) return;

        try {
            const result = await request('delete', `api/pallet/${palletNo}`, {}, {}, true, false);
            if (result?.code !== 200) {
                return;
            }
            notify('notify.pallet.deleted', { type: 'success' });
            navigate('/P303');
        } catch (error) {
            console.error(error);
        }
    };

    /** リセット処理（サーバから取得した状態に戻す） */
    const handleReset = async () => {
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
        setItemRows([]);
        setItemTotal(0);
        setItemPage(1);
        await loadPallet(formData.palletNo);
    };

    /** 部品検索モーダルを開く */
    const handleOpenItemModal = () => {
        if (!isCategorySelected) return;
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
        setItemPage(1);
        setItemModalOpen(true);
        searchItems({ itemCode: '', itemName: '' }, 1);
    };

    /** 部品検索モーダルを閉じる */
    const handleCloseItemModal = () => {
        setItemModalOpen(false);
    };

    /** 部品検索を実行する */
    const handleItemSearch = (values: any) => {
        const condition = {
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        };
        setItemSearchCondition(condition);
        setItemPage(1);
        searchItems(condition, 1);
    };

    /** 部品検索条件をリセットする */
    const handleItemSearchReset = () => {
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
        setItemPage(1);
        searchItems({ itemCode: '', itemName: '' }, 1);
    };

    /** 検索結果のページを変更する */
    const handleItemPageChange = (current: number) => {
        setItemPage(current);
        searchItems(itemSearchCondition, current);
    };

    /** 検索結果から積載明細を追加する */
    const handleAddDetail = (item: ItemMaster) => {
        if (addedItemCodes.includes(item.itemCode)) return;

        const now = formatDateTime(new Date());
        setDetails((prev) => [
            ...prev,
            {
                id: item.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                productGroup: '',
                arrangementNo: '',
                storageCapacity: '',
                quantity: 10,
                remark: '',
                // 保管区分・使用可否は辞書の既定値（使用可は isDefault=Y）を初期値にする
                storageCategory: storageTypeOptions[0]?.key || '',
                usableFlag: usableFlagOptions.find((option) => option.isDefault === 'Y')?.key
                    || usableFlagOptions[0]?.key
                    || '',
                createdAt: now,
                createdBy: loginUserLabel,
                updatedAt: now,
                updatedBy: loginUserLabel,
            },
        ]);
    };

    /** 積載明細を削除する */
    const handleRemoveDetail = (id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    };

    /** 積載明細の編集値を反映する */
    const handleDetailChange = (id: string, field: keyof PalletDetailItem, value: any) => {
        const normalized = field === 'quantity'
            ? Number(normalizeChoiceValue(value) || 0)
            : normalizeChoiceValue(value);
        setDetails((prev) =>
            prev.map((detail) => (detail.id === id ? { ...detail, [field]: normalized } : detail))
        );
    };

    // 部品検索結果の列定義
    const itemColumnDefs: ColDef<ItemMaster>[] = [
        { headerName: '品目コード', field: 'itemCode', flex: 1, minWidth: 200 },
        { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 180 },
        { headerName: 'システム商品番号', field: 'sysItemCode', width: 200 },
        {
            headerName: '追加',
            width: 90,
            cellRenderer: (params: any) => {
                const added = addedItemCodes.includes(params.data.itemCode);
                return added ? (
                    <span>追加済</span>
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
        <PageContainer title={'パレット情報詳細'} titleUnderline bottomSpace>
            {/* 基本情報 */}
            <CustomCard plain
                sx={{ width: '100%' }}
                titleVariant={'body1'}
                title="基本情報"
                border={false}
                action={
                    <div style={{ marginRight: '20px', marginTop: '10px' }}>
                        <button style={buttonSx.button} type="button" onClick={handlePrint}>
                            番号表印刷
                        </button>
                    </div>
                }
            >
                <SimpleForm
                    key={formVersion}
                    id="p305-form"
                    sx={formSx.formContainer}
                    onSubmit={handleUpdate}
                    toolbar={false}
                    defaultValues={formData}
                >
                    <div style={formSx.form2}>
                        <FormInput
                            type={'text'}
                            source="palletNo"
                            label="パレット番号"
                            readOnly
                            placeholder="未発番"
                        />
                        <FormInput
                            type={'text'}
                            source="storagePeriod"
                            label="保管期間"
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'filter-select'}
                            source="category"
                            label="区分"
                            choices={classificationOptions}
                            onChange={handleCategoryChange}
                        />
                        <FormInput
                            type={'input-date'}
                            source="inboundDate"
                            label="入庫日"
                        />
                        <FormInput
                            type={'filter-select'}
                            source="storageLocation"
                            label="保管場所"
                            choices={warehouseOptions}
                            onChange={handleWarehouseChange}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="ロケ番"
                            choices={locationOptions}
                        />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <FormInput
                                type={'text'}
                                source="remark"
                                label="備考"
                                multiline
                                inputHeight={96}
                                placeholder="入力してください"
                            />
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 積載明細（区分に応じて部品／製品のカードを表示する） */}
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="部品一覧" border={false}>
                <div style={buttonSx.buttonBar}>
                    <button
                        style={isCategorySelected ? buttonSx.button : buttonSx.disabledButton}
                        type="button"
                        disabled={!isCategorySelected}
                        onClick={handleOpenItemModal}
                    >
                        {addButtonLabel}
                    </button>
                </div>

                {details.length === 0 ? (
                    <Typography variant={'body2'}>{emptyMessage}</Typography>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {details.map((detail, index) => (
                            <CustomCard
                                key={detail.id}
                                sx={{ width: '100%' }}
                                titleVariant={'body1'}
                                title={<Typography variant={'body1'}>{`No.${index + 1}`}</Typography>}
                                action={
                                    <div
                                        style={{ ...tableSx.linkFontColumn as React.CSSProperties, marginRight: '20px', marginTop: '10px' }}
                                        onClick={() => handleRemoveDetail(detail.id)}
                                    >
                                        削除
                                    </div>
                                }
                                border={false}
                            >
                                <SimpleForm
                                    key={detail.id}
                                    sx={formSx.formContainer}
                                    onSubmit={() => {}}
                                    toolbar={false}
                                    defaultValues={detail}
                                >
                                    <div style={formSx.form2}>
                                        <FormInput
                                            type={'text'}
                                            source="itemCode"
                                            label="品目コード"
                                            readOnly
                                        />
                                        <FormInput
                                            type={'text'}
                                            source="itemName"
                                            label="品目名"
                                            readOnly
                                        />
                                        <FormInput
                                            type={'filter-select'}
                                            source="productGroup"
                                            label="製品群"
                                            choices={PRODUCT_GROUP_CHOICES}
                                            onChange={(value) => handleDetailChange(detail.id, 'productGroup', value)}
                                        />
                                        <FormInput
                                            type={'text'}
                                            source="arrangementNo"
                                            label="手配番号"
                                            readOnly
                                        />
                                        <FormInput
                                            type={'number'}
                                            source="quantity"
                                            label="保管数"
                                            onChange={(value) => handleDetailChange(detail.id, 'quantity', value)}
                                        />
                                        <FormInput
                                            type={'text-number'}
                                            source="storageCapacity"
                                            label="保管容量"
                                            placeholder="入力してください"
                                            onChange={(value) => handleDetailChange(detail.id, 'storageCapacity', value)}
                                        />
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <FormInput
                                                type={'radio'}
                                                source="storageCategory"
                                                label="保管区分"
                                                choices={storageTypeOptions}
                                                onChange={(value) => handleDetailChange(detail.id, 'storageCategory', value)}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <FormInput
                                                type={'radio'}
                                                source="usableFlag"
                                                label="使用可否"
                                                choices={usableFlagOptions}
                                                onChange={(value) => handleDetailChange(detail.id, 'usableFlag', value)}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <FormInput
                                                type={'text'}
                                                source="remark"
                                                label="備考"
                                                multiline
                                                inputHeight={96}
                                                placeholder="入力してください"
                                                onChange={(value) => handleDetailChange(detail.id, 'remark', value)}
                                            />
                                        </div>
                                        <FormInput
                                            type={'text'}
                                            source="createdAt"
                                            label="追加日時"
                                            readOnly
                                        />
                                        <FormInput
                                            type={'text'}
                                            source="createdBy"
                                            label="追加者"
                                            readOnly
                                        />
                                        <FormInput
                                            type={'text'}
                                            source="updatedAt"
                                            label="最終更新日時"
                                            readOnly
                                        />
                                        <FormInput
                                            type={'text'}
                                            source="updatedBy"
                                            label="最終更新者"
                                            readOnly
                                        />
                                    </div>
                                </SimpleForm>
                            </CustomCard>
                        ))}
                    </div>
                )}
            </CustomCard>

            {/* 操作ボタン（設計書どおり画面下部に配置する：左＝削除、右＝リセット・更新） */}
            <div style={{ ...buttonSx.buttonBar, justifyContent: 'space-between' }}>
                <button
                    style={hasPalletNo ? buttonSx.button : buttonSx.disabledButton}
                    type="button"
                    disabled={!hasPalletNo}
                    onClick={handleDelete}
                >
                    削除
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        style={buttonSx.button}
                        type="button"
                        onClick={handleReset}
                    >
                        リセット
                    </button>
                    <button
                        style={buttonSx.button}
                        type="submit"
                        form="p305-form"
                    >
                        更新
                    </button>
                </div>
            </div>

            {/* 部品検索モーダル */}
            <CustomModal
                open={itemModalOpen}
                onClose={handleCloseItemModal}
                title={isProduct ? '製品検索' : '部品検索'}
                maxWidth="lg"
                actions={[
                    {
                        label: '閉じる',
                        onClick: handleCloseItemModal,
                        variant: 'outlined',
                    },
                ]}
            >
                <SimpleForm
                    sx={formSx.formContainer}
                    onSubmit={handleItemSearch}
                    toolbar={false}
                    defaultValues={itemSearchValues}
                >
                    <div style={formSx.form1}>
                        <FormInput
                            type={'text'}
                            source="itemCode"
                            label="品目コード"
                        />
                        <FormInput
                            type={'text'}
                            source="itemName"
                            label="品目名"
                        />
                        <div style={buttonSx.buttonBar}>
                            <button
                                style={buttonSx.button}
                                type="submit"
                            >
                                検索
                            </button>
                            <button
                                style={buttonSx.button}
                                type="button"
                                onClick={handleItemSearchReset}
                            >
                                リセット
                            </button>
                        </div>
                    </div>
                </SimpleForm>
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <ResultGrid<ItemMaster>
                        columnDefs={itemColumnDefs}
                        rowData={itemRows}
                        page={itemPage}
                        rowTotal={itemTotal}
                        pageSize={ITEM_PAGE_SIZE}
                        onPageChange={handleItemPageChange}
                        rowUniqueKey="id"
                        selectionMode="none"
                        noRowsShow={isProduct ? '該当する製品がありません。' : '該当する部品がありません。'}
                    />
                </div>
            </CustomModal>
        </PageContainer>
    );
};

export default P305;
