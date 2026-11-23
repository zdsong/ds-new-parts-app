import React, { useEffect, useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Typography } from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import CustomModal from '../compontent/CustomModal';
import useApiRequest from '../adapters/apiUtil';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';

/**
 * パレット番号発番画面（P303）
 *
 * 仕入先から部品が届いた時に、パレット情報を入力してパレット番号を発番する。
 * 画面イメージ：①パレット番号管理　4.1 パレット番号発番
 *
 * 区分（製品／仕掛品）によって積載明細の登録内容が変わる。
 *   ・仕掛品…「部品追加」で部品を検索し、部品明細カードを追加する
 *   ・製品　…「製品追加」で製品を検索し、製品明細カードを追加する
 *   ・未選択…追加ボタンは押下できない
 *
 * バックエンド連携：
 *   ・選択肢（区分／保管区分／使用可否）… /api/common/options（辞書データ）
 *   ・保管場所／ロケ番 … /api/common/wh/options、/api/common/{whCd}/location/options
 *   ・品目検索 … /api/item/list（sales_flg で部品／製品を絞り込む）
 *   ・発番 … POST /api/pallet（パレット番号はサーバ側で採番する）
 */

// 積載明細（パレットに積載する部品／製品）の型
// 画面内で扱う名称（quantity／storageCategory／remark）は API の項目名と異なるため、
// API へ送る際は toApiDetail() で変換する。
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

// 製品群の選択肢（商品マスタに製品群の項目が無いため、当面は固定の候補から選ぶ）
const PRODUCT_GROUP_CHOICES = [
    { key: '門柱', value: '門柱' },
    { key: '横桟', value: '横桟' },
    { key: '付属品', value: '付属品' },
];

// 初期値（区分＝仕掛品。ロケ番は保管場所の選択後に取得した候補から選ぶ）
const INITIAL_FORM: PalletFormData = {
    palletNo: '',
    storagePeriod: '',
    category: '3',
    inboundDate: '',
    storageLocation: '10',
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

const P303: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const { request } = useApiRequest();

    // パレット情報（フォームの初期値として使用）
    const [formData, setFormData] = useState<PalletFormData>(INITIAL_FORM);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 積載明細（部品／製品のカード一覧）
    const [details, setDetails] = useState<PalletDetailItem[]>([]);
    // 区分（基本情報の選択値。積載明細の表示切替に使用する）
    const [category, setCategory] = useState(INITIAL_FORM.category);
    // 保管場所（ロケ番の取得に使用する）
    const [whCd, setWhCd] = useState(INITIAL_FORM.storageLocation);

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
                // 選択肢の取得後にフォームを作り直す（初期値の表示名を選択肢から解決するため）
                setFormVersion((version) => version + 1);
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
            notify('区分を変更したため、積載明細をクリアしました。', { type: 'warning' });
        }
    };

    /** 保管場所の変更処理（ロケ番は選択し直す） */
    const handleWarehouseChange = (value: any) => {
        setWhCd(normalizeChoiceValue(value));
    };

    /** 発番処理（パレット番号を採番してパレット情報を登録する） */
    const handleIssue = async (values: any) => {
        const classification = normalizeChoiceValue(values?.category);
        const warehouse = normalizeChoiceValue(values?.storageLocation);
        const location = normalizeChoiceValue(values?.locationNo);

        if (!classification) {
            notify('区分を選択してください。', { type: 'warning' });
            return;
        }
        if (!warehouse) {
            notify('保管場所を選択してください。', { type: 'warning' });
            return;
        }
        if (!location) {
            notify('ロケ番を選択してください。', { type: 'warning' });
            return;
        }

        try {
            const result = await request(
                'post',
                'api/pallet',
                {
                    storagePeriod: values?.storagePeriod || '',
                    classification,
                    inboundDate: values?.inboundDate || '',
                    whCd: warehouse,
                    locCd: location,
                    memo1: values?.remark || '',
                    details: details.map(toApiDetail),
                },
                {},
                true,
                false
            );

            if (result?.code !== 200) {
                return;
            }

            // パレット番号はサーバ側で採番される（data または palletNo で返る）
            const palletNo: string = result?.palletNo || result?.data || '';
            const nextFormData: PalletFormData = {
                palletNo,
                storagePeriod: values?.storagePeriod || '',
                category: classification,
                inboundDate: values?.inboundDate || '',
                storageLocation: warehouse,
                locationNo: location,
                remark: values?.remark || '',
            };

            setFormData(nextFormData);
            setCategory(classification);
            setFormVersion((version) => version + 1);
            notify(`パレット番号 ${palletNo} を発番しました。`, { type: 'success' });

            // 発番後はパレット情報詳細画面へ遷移する（発番内容と積載明細を引き継ぐ）
            navigate('/P305', {
                state: {
                    pallet: nextFormData,
                    details,
                },
            });
        } catch (error) {
            console.error(error);
        }
    };

    /** リセット処理（入力内容と明細を初期状態に戻す） */
    const handleReset = () => {
        setFormData({ ...INITIAL_FORM });
        setCategory(INITIAL_FORM.category);
        setWhCd(INITIAL_FORM.storageLocation);
        setFormVersion((version) => version + 1);
        setDetails([]);
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
        setItemRows([]);
        setItemTotal(0);
        setItemPage(1);
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
        <PageContainer title={'パレット番号発番'} titleUnderline bottomSpace>
            {/* 基本情報 */}
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="基本情報" border={false}>
                <SimpleForm
                    key={formVersion}
                    id="p303-form"
                    sx={formSx.formContainer}
                    onSubmit={handleIssue}
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
                                        {isProduct && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <FormInput
                                                    type={'radio'}
                                                    source="storageCategory"
                                                    label="保管区分"
                                                    choices={storageTypeOptions}
                                                    onChange={(value) => handleDetailChange(detail.id, 'storageCategory', value)}
                                                />
                                            </div>
                                        )}
                                        {isProduct && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <FormInput
                                                    type={'radio'}
                                                    source="usableFlag"
                                                    label="使用可否"
                                                    choices={usableFlagOptions}
                                                    onChange={(value) => handleDetailChange(detail.id, 'usableFlag', value)}
                                                />
                                            </div>
                                        )}
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
                                        {isProduct && (
                                            <FormInput
                                                type={'text'}
                                                source="createdAt"
                                                label="追加日時"
                                                readOnly
                                            />
                                        )}
                                        {isProduct && (
                                            <FormInput
                                                type={'text'}
                                                source="createdBy"
                                                label="追加者"
                                                readOnly
                                            />
                                        )}
                                        {isProduct && (
                                            <FormInput
                                                type={'text'}
                                                source="updatedAt"
                                                label="最終更新日時"
                                                readOnly
                                            />
                                        )}
                                        {isProduct && (
                                            <FormInput
                                                type={'text'}
                                                source="updatedBy"
                                                label="最終更新者"
                                                readOnly
                                            />
                                        )}
                                    </div>
                                </SimpleForm>
                            </CustomCard>
                        ))}
                    </div>
                )}
            </CustomCard>

            {/* 操作ボタン（設計書どおり画面右下に配置する） */}
            <div style={buttonSx.buttonBar}>
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
                    form="p303-form"
                >
                    発番
                </button>
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
                    <DataGrid<ItemMaster>
                        columnDefs={itemColumnDefs}
                        rowData={itemRows}
                        rowTotal={itemTotal}
                        page={itemPage}
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

export default P303;
