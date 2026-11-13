import React, { useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Typography } from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useLocation, useNavigate } from 'react-router-dom';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import CustomModal from '../compontent/CustomModal';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import { printPalletNumberSheet } from '../utils/palletNumberSheet';
import type { PalletNumberSheetLabel } from '../utils/palletNumberSheet';

/**
 * パレット情報詳細画面（P305）
 *
 * 発番済みパレットの内容を確認し、パレット番号表を印刷する。
 * 画面イメージ：②仕入先から部品が届いた時 (2) パレット情報詳細画面
 *
 * P303（パレット番号発番画面）を基にしており、相違点は操作ボタンのみ。
 *   ・「番号表印刷」…基本情報カードの右上に配置
 *   ・画面右下…削除（左）／リセット・更新（右）
 *
 * P303 から遷移した場合は、発番内容と積載明細を location.state で受け取る。
 * 直接開いた場合は設計書の画面イメージに近いサンプルデータを表示する。
 */

// 積載明細（パレットに積載する部品／製品）の型
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

// 品目マスタ（部品検索・製品検索の仮データ）
interface ItemMaster {
    id: string;
    /** 区分（1:製品 / 2:仕掛品） */
    category: string;
    itemCode: string;
    itemName: string;
    productGroup: string;
    arrangementNo: string;
    capacity: string;
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

// 区分の選択肢（製品／仕掛品）
const CATEGORY_CHOICES = [
    { key: '1', value: '製品' },
    { key: '2', value: '仕掛品' },
];

// 保管場所の選択肢
const STORAGE_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

// ロケ番の選択肢
const LOCATION_CHOICES = [
    { key: 'A-01-03-02', value: 'A-01-03-02' },
    { key: 'A-01-03-03', value: 'A-01-03-03' },
    { key: 'B-02-01-01', value: 'B-02-01-01' },
    { key: 'B-02-01-02', value: 'B-02-01-02' },
];

// 製品群の選択肢
const PRODUCT_GROUP_CHOICES = [
    { key: '門柱', value: '門柱' },
    { key: '横桟', value: '横桟' },
    { key: '付属品', value: '付属品' },
];

// 保管区分の選択肢（製品明細のみ）
const STORAGE_CATEGORY_CHOICES = [
    { key: '1', value: '移動' },
    { key: '2', value: '不移動' },
    { key: '3', value: '廃棄候補' },
    { key: '4', value: 'SP' },
];

// 使用可否の選択肢（製品明細のみ）
const USABLE_CHOICES = [
    { key: '1', value: '使用可' },
    { key: '2', value: '使用不可' },
];

// 初期値（区分＝仕掛品、保管場所＝行田工場、ロケ番＝A-01-03-02）
const INITIAL_FORM: PalletFormData = {
    palletNo: '',
    storagePeriod: '',
    category: '2',
    inboundDate: '',
    storageLocation: '1',
    locationNo: 'A-01-03-02',
    remark: '',
};

// 品目マスタの仮データ
const ITEM_MASTER: ItemMaster[] = [
    {
        id: '1',
        category: '2',
        itemCode: 'GP20A-101-RN-NAV3-00',
        itemName: 'アルミ支柱 A',
        productGroup: '門柱',
        arrangementNo: '3130300285',
        capacity: '1.655',
    },
    {
        id: '2',
        category: '2',
        itemCode: 'GP20A-101-RN-DB5-00',
        itemName: 'アルミ支柱 A',
        productGroup: '門柱',
        arrangementNo: '3130301000',
        capacity: '1.655',
    },
    {
        id: '3',
        category: '2',
        itemCode: 'GP20A-102-RN-NAV3-00',
        itemName: 'アルミ支柱 B',
        productGroup: '門柱',
        arrangementNo: '3130300286',
        capacity: '1.720',
    },
    {
        id: '4',
        category: '2',
        itemCode: 'TLR560LB-S400-200-00',
        itemName: '横桟 B',
        productGroup: '横桟',
        arrangementNo: '3130300512',
        capacity: '2.100',
    },
    {
        id: '5',
        category: '2',
        itemCode: 'HP30C-310-RN-NBV2-01',
        itemName: '化粧キャップ C',
        productGroup: '付属品',
        arrangementNo: '3130300777',
        capacity: '0.320',
    },
    {
        id: '6',
        category: '1',
        itemCode: 'V15FSM-100-00',
        itemName: '本体ASSY',
        productGroup: '門柱',
        arrangementNo: '3130300901',
        capacity: '1.900',
    },
    {
        id: '7',
        category: '1',
        itemCode: 'V15FSM-110-00',
        itemName: '本体ASSY A',
        productGroup: '門柱',
        arrangementNo: '3130300902',
        capacity: '1.900',
    },
    {
        id: '8',
        category: '1',
        itemCode: 'V15FSM-200-00',
        itemName: '本体ASSY B',
        productGroup: '横桟',
        arrangementNo: '3130300910',
        capacity: '2.100',
    },
];

// 保管容量の選択肢（品目マスタに存在する容量を候補にする）
const CAPACITY_CHOICES = Array.from(new Set(ITEM_MASTER.map((item) => item.capacity)))
    .sort()
    .map((capacity) => ({ key: capacity, value: capacity }));

// 画面を直接開いた場合に表示するサンプルデータ（設計書の画面イメージに合わせた仮データ）
const SAMPLE_FORM: PalletFormData = {
    palletNo: 'B261010-001',
    storagePeriod: '9ヶ月',
    category: '2',
    inboundDate: '',
    storageLocation: '1',
    locationNo: 'A-01-03-02',
    remark: '',
};

// サンプルの積載明細（品目マスタの先頭 2 件を使用する）
const buildSampleDetail = (item: ItemMaster): PalletDetailItem => ({
    id: item.id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    productGroup: item.productGroup,
    arrangementNo: item.arrangementNo,
    storageCapacity: item.capacity,
    quantity: 10,
    remark: '',
    storageCategory: '1',
    usableFlag: '1',
    createdAt: '2026/01/01 15:00',
    createdBy: '山田 太郎（123456）',
    updatedAt: '2026/10/01 15:00',
    updatedBy: '山田 太郎（123456）',
});

const SAMPLE_DETAILS: PalletDetailItem[] = [
    buildSampleDetail(ITEM_MASTER[0]),
    buildSampleDetail(ITEM_MASTER[1]),
];

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

const P305: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const location = useLocation();

    // P303 から遷移した場合は発番内容と積載明細を引き継ぎ、直接開いた場合はサンプルを表示する
    const initialState = useMemo(() => {
        const state = location.state as
            | { pallet?: PalletFormData; details?: PalletDetailItem[] }
            | null;
        return {
            pallet: state?.pallet ? { ...INITIAL_FORM, ...state.pallet } : SAMPLE_FORM,
            details: state?.details ?? SAMPLE_DETAILS,
        };
    }, [location.state]);

    // パレット情報（フォームの初期値として使用）
    const [formData, setFormData] = useState<PalletFormData>(initialState.pallet);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 積載明細（部品／製品のカード一覧）
    const [details, setDetails] = useState<PalletDetailItem[]>(initialState.details);
    // 区分（基本情報の選択値。積載明細の表示切替に使用する）
    const [category, setCategory] = useState(initialState.pallet.category);

    // 部品検索モーダル関連
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [itemSearchValues, setItemSearchValues] = useState({ itemCode: '', itemName: '' });
    const [itemSearchCondition, setItemSearchCondition] = useState({ itemCode: '', itemName: '' });

    // ログインユーザー（明細の追加者・最終更新者）
    const loginUserLabel = useMemo(getLoginUserLabel, []);

    // 区分が製品かどうか
    const isProduct = category === '1';
    // 区分が選択済みかどうか（未選択時は追加ボタンを非活性にする）
    const isCategorySelected = category === '1' || category === '2';

    // 追加ボタンの表示名（区分に応じて切り替える）
    const addButtonLabel = isProduct ? '製品追加' : '部品追加';
    // 明細が空の場合のメッセージ
    const emptyMessage = isProduct
        ? '積載する製品が登録されていません。'
        : '積載する部品が登録されていません。';

    // 検索結果（区分・品目コード・品目名で絞り込む）
    const itemSearchResult = useMemo(() => {
        const code = (itemSearchCondition.itemCode || '').trim();
        const name = (itemSearchCondition.itemName || '').trim();
        return ITEM_MASTER.filter(
            (item) =>
                item.category === category &&
                (!code || item.itemCode.includes(code)) &&
                (!name || item.itemName.includes(name))
        );
    }, [itemSearchCondition, category]);

    // 既に明細へ追加済みの品目コード
    const addedItemCodes = useMemo(
        () => details.map((detail) => detail.itemCode),
        [details]
    );

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

    /** 更新処理（編集内容を画面に反映する。API 連携時にサーバ更新へ置き換える） */
    const handleUpdate = (values: any) => {
        if (!values?.category) {
            notify('区分を選択してください。', { type: 'warning' });
            return;
        }
        if (!values?.storageLocation) {
            notify('保管場所を選択してください。', { type: 'warning' });
            return;
        }

        const nextFormData: PalletFormData = {
            palletNo: formData.palletNo,
            storagePeriod: values.storagePeriod || '',
            category: values.category || '',
            inboundDate: values.inboundDate || '',
            storageLocation: values.storageLocation || '',
            locationNo: values.locationNo || '',
            remark: values.remark || '',
        };

        setFormData(nextFormData);
        setCategory(nextFormData.category);
        setFormVersion((version) => version + 1);
        notify('パレット情報を更新しました。', { type: 'success' });
    };

    /**
     * 番号表印刷処理
     * 積載明細 1 件につきパレット番号表 1 枚を出力する（A4 縦・区分で見出しが変わる）。
     */
    const handlePrint = () => {
        if (!formData.palletNo) {
            notify('パレット番号が採番されていません。', { type: 'warning' });
            return;
        }
        if (details.length === 0) {
            notify('印刷対象の積載明細がありません。', { type: 'warning' });
            return;
        }

        // 設計書の記入例（備考１＝行田工場）に合わせ、備考１は保管場所、備考２は明細の備考を出力する
        const storageLocationLabel =
            STORAGE_CHOICES.find((choice) => choice.key === formData.storageLocation)?.value ?? '';

        const labels: PalletNumberSheetLabel[] = details.map((detail) => ({
            category: formData.category,
            palletNo: formData.palletNo,
            itemCode: detail.itemCode,
            quantity: detail.quantity,
            itemName: detail.itemName,
            remark1: storageLocationLabel,
            remark2: detail.remark,
            // バーコードは JAN コード。品目マスタ連携時に明細へ持たせる（未設定時はパレット番号を出力）
        }));

        if (!printPalletNumberSheet(labels)) {
            notify('印刷ウィンドウを開けませんでした。ポップアップのブロックを解除してください。', {
                type: 'warning',
            });
            return;
        }
        notify('パレット番号表を印刷します。', { type: 'info' });
    };

    /** 削除処理（パレット情報を削除して発番画面へ戻る） */
    const handleDelete = () => {
        if (!window.confirm('このパレット情報を削除してもよろしいですか？')) return;
        notify('パレット情報を削除しました。', { type: 'success' });
        navigate('/P303');
    };

    /** リセット処理（入力内容と明細を遷移直後の状態に戻す） */
    const handleReset = () => {
        setFormData({ ...initialState.pallet });
        setCategory(initialState.pallet.category);
        setFormVersion((version) => version + 1);
        setDetails(initialState.details.map((detail) => ({ ...detail })));
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
    };

    /** 部品検索モーダルを開く */
    const handleOpenItemModal = () => {
        if (!isCategorySelected) return;
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
        setItemModalOpen(true);
    };

    /** 部品検索モーダルを閉じる */
    const handleCloseItemModal = () => {
        setItemModalOpen(false);
    };

    /** 部品検索を実行する */
    const handleItemSearch = (values: any) => {
        setItemSearchCondition({
            itemCode: values?.itemCode || '',
            itemName: values?.itemName || '',
        });
    };

    /** 部品検索条件をリセットする */
    const handleItemSearchReset = () => {
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
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
                productGroup: item.productGroup,
                arrangementNo: item.arrangementNo,
                storageCapacity: item.capacity,
                quantity: 10,
                remark: '',
                storageCategory: '1',
                usableFlag: '1',
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
        { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 140 },
        { headerName: '製品群', field: 'productGroup', width: 110 },
        { headerName: '手配番号', field: 'arrangementNo', width: 130 },
        { headerName: '保管容量', field: 'capacity', width: 110 },
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
        <PageContainer title={'パレット情報詳細'}>
            {/* 基本情報 */}
            <CustomCard
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
                            choices={CATEGORY_CHOICES}
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
                            choices={STORAGE_CHOICES}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="locationNo"
                            label="ロケ番"
                            choices={LOCATION_CHOICES}
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

            {/* 積載明細（区分に応じて部品／製品のカードを表示する） */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="部品一覧" border={false}>
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
                                        // style={}
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
                                            type={'filter-select'}
                                            source="storageCapacity"
                                            label="保管容量"
                                            choices={CAPACITY_CHOICES}
                                            onChange={(value) => handleDetailChange(detail.id, 'storageCapacity', value)}
                                        />
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <FormInput
                                                type={'radio'}
                                                source="storageCategory"
                                                label="保管区分"
                                                choices={STORAGE_CATEGORY_CHOICES}
                                                onChange={(value) => handleDetailChange(detail.id, 'storageCategory', value)}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <FormInput
                                                type={'radio'}
                                                source="usableFlag"
                                                label="使用可否"
                                                choices={USABLE_CHOICES}
                                                onChange={(value) => handleDetailChange(detail.id, 'usableFlag', value)}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <FormInput
                                                type={'text'}
                                                source="remark"
                                                label="備考"
                                                multiline
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
                    style={buttonSx.button}
                    type="button"
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
                    <DataGrid<ItemMaster>
                        columnDefs={itemColumnDefs}
                        rowData={itemSearchResult}
                        page={1}
                        onPageChange={() => {}}
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
