import React, { useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
import { Typography } from '@mui/material';
import { ColDef } from 'ag-grid-community';

import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import DataGrid from '../compontent/DataGrid';
import CustomModal from '../compontent/CustomModal';
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
 * 補足：現時点ではバックエンドにパレット系の API が無いため、
 *       採番・品目マスタはフロント側の仮実装としている。
 *       API 連携時は本ファイル下部の「API 連携箇所」を差し替える。
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

// 採番済みの連番を保持するキー（画面を跨いだ暫定の採番用）
const ISSUE_SEQ_KEY = 'P303-pallet-issue-seq';

/**
 * パレット番号を採番する（暫定実装）
 * 正式仕様ではサーバ側で採番するため、API 連携時に置き換える。
 */
const generatePalletNo = (): string => {
    const now = new Date();
    const date =
        String(now.getFullYear()) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    const seq = Number(sessionStorage.getItem(ISSUE_SEQ_KEY) || '0') + 1;
    sessionStorage.setItem(ISSUE_SEQ_KEY, String(seq));
    return `PL-${date}-${String(seq).padStart(3, '0')}`;
};

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

const P303: React.FC = () => {
    const notify = useNotify();

    // パレット情報（フォームの初期値として使用）
    const [formData, setFormData] = useState<PalletFormData>(INITIAL_FORM);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 積載明細（部品／製品のカード一覧）
    const [details, setDetails] = useState<PalletDetailItem[]>([]);
    // 区分（基本情報の選択値。積載明細の表示切替に使用する）
    const [category, setCategory] = useState(INITIAL_FORM.category);

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

    /** 発番処理（パレット番号を採番して画面に反映する） */
    const handleIssue = (values: any) => {
        if (!values?.category) {
            notify('区分を選択してください。', { type: 'warning' });
            return;
        }
        if (!values?.storageLocation) {
            notify('保管場所を選択してください。', { type: 'warning' });
            return;
        }

        // 発番済みの場合は同じ番号を保持する
        const palletNo = formData.palletNo || generatePalletNo();
        const nextFormData: PalletFormData = {
            palletNo,
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
        notify(`パレット番号 ${palletNo} を発番しました。`, { type: 'success' });
    };

    /** リセット処理（入力内容と明細を初期状態に戻す） */
    const handleReset = () => {
        setFormData({ ...INITIAL_FORM });
        setCategory(INITIAL_FORM.category);
        setFormVersion((version) => version + 1);
        setDetails([]);
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
        <PageContainer title={'パレット番号発番'}>
            {/* 基本情報 */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="基本情報" border={false}>
                <SimpleForm
                    key={formVersion}
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

                    {/* 操作ボタン */}
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
                        >
                            発番
                        </button>
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
                                        {isProduct && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <FormInput
                                                    type={'radio'}
                                                    source="storageCategory"
                                                    label="保管区分"
                                                    choices={STORAGE_CATEGORY_CHOICES}
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
                                                    choices={USABLE_CHOICES}
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

export default P303;
