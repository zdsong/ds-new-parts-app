import React, { useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm, useNotify } from 'react-admin';
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
 * 補足：現時点ではバックエンドにパレット系の API が無いため、
 *       採番・部品マスタはフロント側の仮実装としている。
 *       API 連携時は本ファイル下部の「API 連携箇所」を差し替える。
 */

// 積載部品（パレット明細）の型
interface PalletDetailItem {
    id: string;
    itemCode: string;
    itemName: string;
    productGroup: string;
    arrangementNo: string;
    capacity: string;
    quantity: number;
}

// 部品マスタ（部品検索の仮データ）
interface ItemMaster {
    id: string;
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

// 部品マスタの仮データ
const ITEM_MASTER: ItemMaster[] = [
    {
        id: '1',
        itemCode: 'GP20A-101-RN-NAV3-00',
        itemName: 'アルミ支柱 A',
        productGroup: '門柱',
        arrangementNo: '3130300285',
        capacity: '1.655',
    },
    {
        id: '2',
        itemCode: 'GP20A-101-RN-DB5-00',
        itemName: 'アルミ支柱 A',
        productGroup: '門柱',
        arrangementNo: '3130301000',
        capacity: '1.655',
    },
    {
        id: '3',
        itemCode: 'GP20A-102-RN-NAV3-00',
        itemName: 'アルミ支柱 B',
        productGroup: '門柱',
        arrangementNo: '3130300286',
        capacity: '1.720',
    },
    {
        id: '4',
        itemCode: 'TLR560LB-S400-200-00',
        itemName: '横桟 B',
        productGroup: '横桟',
        arrangementNo: '3130300512',
        capacity: '2.100',
    },
    {
        id: '5',
        itemCode: 'HP30C-310-RN-NBV2-01',
        itemName: '化粧キャップ C',
        productGroup: '付属品',
        arrangementNo: '3130300777',
        capacity: '0.320',
    },
];

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

const P303: React.FC = () => {
    const notify = useNotify();

    // パレット情報（フォームの初期値として使用）
    const [formData, setFormData] = useState<PalletFormData>(INITIAL_FORM);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 積載部品の一覧
    const [details, setDetails] = useState<PalletDetailItem[]>([]);

    // 部品検索モーダル関連
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [itemSearchValues, setItemSearchValues] = useState({ itemCode: '', itemName: '' });
    const [itemSearchCondition, setItemSearchCondition] = useState({ itemCode: '', itemName: '' });

    // 部品検索結果（品目コード・品目名の部分一致）
    const itemSearchResult = useMemo(() => {
        const code = (itemSearchCondition.itemCode || '').trim();
        const name = (itemSearchCondition.itemName || '').trim();
        return ITEM_MASTER.filter(
            (item) =>
                (!code || item.itemCode.includes(code)) &&
                (!name || item.itemName.includes(name))
        );
    }, [itemSearchCondition]);

    // 既に明細へ追加済みの品目コード
    const addedItemCodes = useMemo(
        () => details.map((detail) => detail.itemCode),
        [details]
    );

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
        setFormVersion((version) => version + 1);
        notify(`パレット番号 ${palletNo} を発番しました。`, { type: 'success' });
    };

    /** リセット処理（入力内容と明細を初期状態に戻す） */
    const handleReset = () => {
        setFormData({ ...INITIAL_FORM });
        setFormVersion((version) => version + 1);
        setDetails([]);
        setItemSearchValues({ itemCode: '', itemName: '' });
        setItemSearchCondition({ itemCode: '', itemName: '' });
    };

    /** 部品検索モーダルを開く */
    const handleOpenItemModal = () => {
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

    /** 検索結果から積載部品を追加する */
    const handleAddDetail = (item: ItemMaster) => {
        if (addedItemCodes.includes(item.itemCode)) return;

        setDetails((prev) => [
            ...prev,
            {
                id: item.id,
                itemCode: item.itemCode,
                itemName: item.itemName,
                productGroup: item.productGroup,
                arrangementNo: item.arrangementNo,
                capacity: item.capacity,
                quantity: 10,
            },
        ]);
    };

    /** 積載部品を削除する */
    const handleRemoveDetail = (id: string) => {
        setDetails((prev) => prev.filter((detail) => detail.id !== id));
    };

    // 積載部品一覧の列定義
    const detailColumnDefs: ColDef<PalletDetailItem>[] = [
        {
            headerName: 'No.',
            width: 70,
            valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        },
        { headerName: '品目コード', field: 'itemCode', flex: 1, minWidth: 200 },
        { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 140 },
        { headerName: '製品群', field: 'productGroup', width: 110 },
        { headerName: '手配番号', field: 'arrangementNo', width: 130 },
        { headerName: '保管容量', field: 'capacity', width: 110 },
        { headerName: '保管数', field: 'quantity', width: 90 },
        {
            headerName: '削除',
            width: 90,
            cellRenderer: (params: any) => (
                <span
                    style={tableSx.linkFontColumn as React.CSSProperties}
                    onClick={() => handleRemoveDetail(params.data.id)}
                >
                    削除
                </span>
            ),
        },
    ];

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

            {/* 部品一覧 */}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="部品一覧" border={false}>
                <div style={buttonSx.buttonBar}>
                    <button
                        style={buttonSx.button}
                        type="button"
                        onClick={handleOpenItemModal}
                    >
                        部品追加
                    </button>
                </div>
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<PalletDetailItem>
                        columnDefs={detailColumnDefs}
                        rowData={details}
                        page={1}
                        onPageChange={() => {}}
                        rowUniqueKey="id"
                        selectionMode="none"
                        noRowsShow="積載する部品が登録されていません。"
                    />
                </div>
            </CustomCard>

            {/* 部品検索モーダル */}
            <CustomModal
                open={itemModalOpen}
                onClose={handleCloseItemModal}
                title="部品検索"
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
                        noRowsShow="該当する部品がありません。"
                    />
                </div>
            </CustomModal>
        </PageContainer>
    );
};

export default P303;
