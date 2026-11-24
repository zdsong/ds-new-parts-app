import React, { useMemo, useState } from 'react';

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
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import { printPalletNumberSheet } from '../utils/palletNumberSheet';
import { buildPalletLabels } from '../utils/palletData';

/**
 * パレット番号一覧画面（P304）
 *
 * 画面イメージ：①パレット番号管理 4. パレット番号一覧
 *
 * 上半分が検索条件、下半分が検索結果の一覧表。
 * 一覧のパレット番号をクリックすると、パレット情報詳細画面（P305）へ遷移して
 * 該当パレットの内容を表示する。
 *
 * 補足：現時点ではバックエンドにパレット系の API が無いため、一覧データは
 *       フロント側の仮実装としている。API 連携時は本ファイル下部の
 *       「API 連携箇所」を差し替える。
 */

// 積載明細（パレットに積載する部品／製品）の型（P305 と同一の形で受け渡す）
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

// 一覧の 1 行分（＝パレット 1 枚と、その積載明細）
interface PalletRow {
    id: string;
    palletNo: string;
    /** 区分（1:製品 / 2:仕掛品） */
    category: string;
    /** 保管場所（1:行田工場 / 2:外部倉庫） */
    storageLocation: string;
    locationNo: string;
    inboundDate: string;
    storagePeriod: string;
    remark: string;
    details: PalletDetailItem[];
}

// 検索条件の型（パレット番号発番画面＝P303 の基本情報と同じ 7 項目）
interface SearchCondition {
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

// ロケ番（ロケーション番号）の選択肢
const LOCATION_CHOICES = [
    { key: 'A-01-03-02', value: 'A-01-03-02' },
    { key: 'A-01-03-03', value: 'A-01-03-03' },
    { key: 'B-02-01-01', value: 'B-02-01-01' },
    { key: 'B-02-01-02', value: 'B-02-01-02' },
    { key: 'C-01-01-01', value: 'C-01-01-01' },
];

// 区分・保管場所のコード→表示名変換
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    CATEGORY_CHOICES.map((choice) => [choice.key, choice.value])
);
const STORAGE_LABELS: Record<string, string> = Object.fromEntries(
    STORAGE_CHOICES.map((choice) => [choice.key, choice.value])
);

// 検索条件の初期値
const INITIAL_CONDITION: SearchCondition = {
    palletNo: '',
    storagePeriod: '',
    category: '',
    inboundDate: '',
    storageLocation: '',
    locationNo: '',
    remark: '',
};

/**
 * 積載明細を組み立てる（仮データ用のヘルパー）
 */
const buildDetail = (
    id: string,
    itemCode: string,
    itemName: string,
    productGroup: string,
    arrangementNo: string,
    quantity: number,
    capacity = '1.655'
): PalletDetailItem => ({
    id,
    itemCode,
    itemName,
    productGroup,
    arrangementNo,
    storageCapacity: capacity,
    quantity,
    remark: '',
    storageCategory: '1',
    usableFlag: '1',
    createdAt: '2026/09/04 09:15',
    createdBy: '山田 太郎（123456）',
    updatedAt: '2026/09/04 09:15',
    updatedBy: '山田 太郎（123456）',
});

/**
 * 一覧の仮データ（設計書の画面イメージに合わせた内容＋ページング確認用の行）
 * API 連携時はこの配列を API 応答に置き換える。
 */
const PALLETS: PalletRow[] = [
    {
        id: '1',
        palletNo: 'B260904-026',
        category: '2',
        storageLocation: '1',
        locationNo: 'A-01-03-02',
        inboundDate: '2026/09/04',
        storagePeriod: '9ヶ月',
        remark: '',
        details: [
            buildDetail('1-1', 'TLR280LB-S400-401-BK-00', 'H400 背面化粧扉（ブラック）', '横桟', '3130300512', 10),
            buildDetail('1-2', 'TLP280LB-S400N-301-BK-01', 'H400 捺印扉（ブラック）', '横桟', '3130300513', 10),
        ],
    },
    {
        id: '2',
        palletNo: 'B260904-021',
        category: '2',
        storageLocation: '1',
        locationNo: 'A-01-03-02',
        inboundDate: '2026/09/04',
        storagePeriod: '9ヶ月',
        remark: '',
        details: [
            buildDetail('2-1', 'TLR280LB-S400-401-BK-00', 'H400 背面化粧扉（ブラック）', '横桟', '3130300512', 10),
        ],
    },
    {
        id: '3',
        palletNo: 'B260904-018',
        category: '2',
        storageLocation: '1',
        locationNo: 'A-01-03-03',
        inboundDate: '2026/09/03',
        storagePeriod: '9ヶ月',
        remark: '仕入先 A 便',
        details: [
            buildDetail('3-1', 'GP20A-101-RN-NAV3-00', 'アルミ支柱 A', '門柱', '3130300285', 20),
            buildDetail('3-2', 'GP20A-102-RN-NAV3-00', 'アルミ支柱 B', '門柱', '3130300286', 20),
            buildDetail('3-3', 'HP30C-310-RN-NBV2-01', '化粧キャップ C', '付属品', '3130300777', 40),
        ],
    },
    {
        id: '4',
        palletNo: 'B260903-012',
        category: '1',
        storageLocation: '2',
        locationNo: 'B-02-01-01',
        inboundDate: '2026/09/03',
        storagePeriod: '6ヶ月',
        remark: '',
        details: [
            buildDetail('4-1', 'V15FSM-100-00', '本体ASSY', '門柱', '3130300901', 8, '1.900'),
            buildDetail('4-2', 'V15FSM-200-00', '本体ASSY B', '横桟', '3130300910', 6, '2.100'),
        ],
    },
    {
        id: '5',
        palletNo: 'B260902-009',
        category: '1',
        storageLocation: '2',
        locationNo: 'B-02-01-02',
        inboundDate: '2026/09/02',
        storagePeriod: '6ヶ月',
        remark: '',
        details: [
            buildDetail('5-1', 'V15FSM-110-00', '本体ASSY A', '門柱', '3130300902', 12, '1.900'),
        ],
    },
    {
        id: '6',
        palletNo: 'B260902-005',
        category: '2',
        storageLocation: '1',
        locationNo: 'C-01-01-01',
        inboundDate: '2026/09/02',
        storagePeriod: '9ヶ月',
        remark: '',
        details: [
            buildDetail('6-1', 'TLR560LB-S400-200-00', '横桟 B', '横桟', '3130300512', 30, '2.100'),
        ],
    },
    {
        id: '7',
        palletNo: 'B260901-034',
        category: '2',
        storageLocation: '1',
        locationNo: 'A-01-03-02',
        inboundDate: '2026/09/01',
        storagePeriod: '9ヶ月',
        remark: '',
        details: [
            buildDetail('7-1', 'GP20A-101-RN-NAV3-00', 'アルミ支柱 A', '門柱', '3130300285', 15),
            buildDetail('7-2', 'TLR280LB-S400-401-BK-00', 'H400 背面化粧扉（ブラック）', '横桟', '3130300512', 5),
        ],
    },
    {
        id: '8',
        palletNo: 'B260901-030',
        category: '1',
        storageLocation: '2',
        locationNo: 'B-02-01-01',
        inboundDate: '2026/09/01',
        storagePeriod: '6ヶ月',
        remark: '出荷待ち',
        details: [
            buildDetail('8-1', 'V15FSM-100-00', '本体ASSY', '門柱', '3130300901', 4, '1.900'),
        ],
    },
    {
        id: '9',
        palletNo: 'B260831-027',
        category: '2',
        storageLocation: '1',
        locationNo: 'A-01-03-03',
        inboundDate: '2026/08/31',
        storagePeriod: '9ヶ月',
        remark: '',
        details: [
            buildDetail('9-1', 'HP30C-310-RN-NBV2-01', '化粧キャップ C', '付属品', '3130300777', 60),
        ],
    },
    {
        id: '10',
        palletNo: 'B260831-022',
        category: '2',
        storageLocation: '1',
        locationNo: 'C-01-01-01',
        inboundDate: '2026/08/31',
        storagePeriod: '9ヶ月',
        remark: '',
        details: [
            buildDetail('10-1', 'TLP280LB-S400N-301-BK-01', 'H400 捺印扉（ブラック）', '横桟', '3130300513', 10),
        ],
    },
    {
        id: '11',
        palletNo: 'B260830-014',
        category: '1',
        storageLocation: '2',
        locationNo: 'B-02-01-02',
        inboundDate: '2026/08/30',
        storagePeriod: '6ヶ月',
        remark: '',
        details: [
            buildDetail('11-1', 'V15FSM-200-00', '本体ASSY B', '横桟', '3130300910', 9, '2.100'),
            buildDetail('11-2', 'V15FSM-110-00', '本体ASSY A', '門柱', '3130300902', 3, '1.900'),
        ],
    },
    {
        id: '12',
        palletNo: 'B260830-008',
        category: '2',
        storageLocation: '1',
        locationNo: 'A-01-03-02',
        inboundDate: '2026/08/30',
        storagePeriod: '9ヶ月',
        remark: '',
        details: [
            buildDetail('12-1', 'GP20A-102-RN-NAV3-00', 'アルミ支柱 B', '門柱', '3130300286', 25),
        ],
    },
];

// 1 ページあたりの表示件数
const PAGE_SIZE = 10;

/**
 * 選択値を取り出す（AutocompleteInput は選択肢オブジェクトを返すため、key に正規化する）
 */
const normalizeChoiceValue = (value: any): string => {
    const normalized = value && typeof value === 'object' ? value.key : value;
    return normalized === undefined || normalized === null ? '' : String(normalized);
};

/**
 * 数字だけを取り出す（入庫日は「2026/09/04」と「2026-09-04」が混在するため比較用に使う）
 */
const digitsOnly = (value: string): string => (value || '').replace(/[^0-9]/g, '');

const P304: React.FC = () => {
    const notify = useNotify();
    const navigate = useNavigate();

    // 検索条件（確定値）
    const [condition, setCondition] = useState<SearchCondition>(INITIAL_CONDITION);
    // 検索条件フォームの初期値（クリア時に書き戻す）
    const [formValues, setFormValues] = useState<SearchCondition>(INITIAL_CONDITION);
    // フォームを初期値で再描画するための世代番号
    const [formVersion, setFormVersion] = useState(0);
    // 現在のページ
    const [page, setPage] = useState(1);
    // 一覧で選択されたパレット（番号表印刷の対象）
    const [selectedPallets, setSelectedPallets] = useState<PalletRow[]>([]);

    // 検索条件で絞り込んだ一覧
    const filteredPallets = useMemo(() => {
        const palletNo = (condition.palletNo || '').trim();
        const storagePeriod = (condition.storagePeriod || '').trim();
        const inboundDate = (condition.inboundDate || '').trim();
        const remark = (condition.remark || '').trim();

        return PALLETS.filter((pallet) => {
            if (palletNo && !pallet.palletNo.includes(palletNo)) {
                return false;
            }
            if (storagePeriod && !pallet.storagePeriod.includes(storagePeriod)) {
                return false;
            }
            if (condition.category && pallet.category !== condition.category) {
                return false;
            }
            if (inboundDate && !digitsOnly(pallet.inboundDate).includes(digitsOnly(inboundDate))) {
                return false;
            }
            if (condition.storageLocation && pallet.storageLocation !== condition.storageLocation) {
                return false;
            }
            if (condition.locationNo && pallet.locationNo !== condition.locationNo) {
                return false;
            }
            if (remark && !pallet.remark.includes(remark)) {
                return false;
            }
            return true;
        });
    }, [condition]);

    // 現在ページの表示行
    const pageRows = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredPallets.slice(start, start + PAGE_SIZE);
    }, [filteredPallets, page]);

    /** 検索を実行する */
    const handleSearch = (values: any) => {
        setCondition({
            palletNo: values?.palletNo || '',
            storagePeriod: values?.storagePeriod || '',
            category: normalizeChoiceValue(values?.category),
            inboundDate: normalizeChoiceValue(values?.inboundDate),
            storageLocation: normalizeChoiceValue(values?.storageLocation),
            locationNo: normalizeChoiceValue(values?.locationNo),
            remark: values?.remark || '',
        });
        // 検索時は 1 ページ目に戻す
        setPage(1);
        setSelectedPallets([]);
    };

    /** 検索条件をクリアする（一覧も全件に戻す） */
    const handleClear = () => {
        setCondition(INITIAL_CONDITION);
        setFormValues(INITIAL_CONDITION);
        setFormVersion((version) => version + 1);
        setPage(1);
        setSelectedPallets([]);
    };

    /** パレット情報詳細画面（P305）へ遷移する */
    const handleOpenDetail = (pallet: PalletRow) => {
        navigate('/P305', {
            state: {
                pallet: {
                    palletNo: pallet.palletNo,
                    storagePeriod: pallet.storagePeriod,
                    category: pallet.category,
                    inboundDate: pallet.inboundDate,
                    storageLocation: pallet.storageLocation,
                    locationNo: pallet.locationNo,
                    remark: pallet.remark,
                },
                details: pallet.details,
            },
        });
    };

    /** 選択したパレットの番号表を印刷する（パレット 1 件につき 1 枚） */
    const handlePrintLabels = () => {
        if (selectedPallets.length === 0) {
            notify('notify.pallet.select_pallets_to_print', { type: 'warning' });
            return;
        }

        const labels = buildPalletLabels(
            selectedPallets.map((pallet) => ({
                palletNo: pallet.palletNo,
                category: pallet.category,
                storageLocation: pallet.storageLocation,
                storageLocationName: STORAGE_LABELS[pallet.storageLocation] || '',
                details: pallet.details,
            }))
        );

        const printed = printPalletNumberSheet(labels);
        if (printed) {
            notify('notify.pallet.print_sheet_count', { type: 'success', messageArgs: { count: labels.length } });
        } else {
            notify('notify.pallet.print_window_popup_failed', {
                type: 'warning',
            });
        }
    };

    // 一覧の列定義（P303 の基本情報と同じ 7 項目のみ表示する）
    const columnDefs: ColDef<PalletRow>[] = [
        {
            headerName: 'パレット番号',
            field: 'palletNo',
            width: 170,
            cellRenderer: (params: any) => (
                <span
                    style={tableSx.linkFontColumn as React.CSSProperties}
                    onClick={() => handleOpenDetail(params.data as PalletRow)}
                >
                    {params.data.palletNo}
                </span>
            ),
        },
        { headerName: '保管期間', field: 'storagePeriod', width: 110 },
        {
            headerName: '区分',
            width: 100,
            valueGetter: (params) => CATEGORY_LABELS[params.data?.category ?? ''] ?? '',
        },
        { headerName: '入庫日', field: 'inboundDate', width: 130 },
        {
            headerName: '保管場所',
            width: 120,
            valueGetter: (params) => STORAGE_LABELS[params.data?.storageLocation ?? ''] ?? '',
        },
        { headerName: 'ロケ番', field: 'locationNo', width: 140 },
        { headerName: '備考', field: 'remark', flex: 1, minWidth: 160 },
    ];

    return (
        <PageContainer title={'パレット番号一覧'} titleUnderline bottomSpace>
            {/* 検索条件 */}
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件" border={false}>
                <SimpleForm
                    key={formVersion}
                    sx={formSx.formContainer}
                    onSubmit={handleSearch}
                    toolbar={false}
                    defaultValues={formValues}
                >
                    <div style={formSx.form2}>
                        <FormInput
                            type={'text'}
                            source="palletNo"
                            label="パレット番号"
                            placeholder="入力してください"
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
                        <FormInput type={'input-date'} source="inboundDate" label="入庫日" />
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
                                inputHeight={96}
                                placeholder="入力してください"
                            />
                        </div>
                    </div>

                    <div style={searchButtonBarStyle}>
                        <button style={buttonSx.button} type="button" onClick={handleClear}>
                            クリア
                        </button>
                        <button style={buttonSx.button} type="submit">
                            検索
                        </button>
                    </div>
                </SimpleForm>
            </CustomCard>

            {/* 検索結果 */}
            <CustomCard plain sx={{ width: '100%' }} titleVariant={'body1'} title="検索結果" border={false}>
                <div style={resultHeaderStyle}>
                    <Typography variant={'body2'} sx={{ fontSize: 13 }}>
                        検索結果：{filteredPallets.length} 件
                        {selectedPallets.length > 0 && `（選択 ${selectedPallets.length} 件）`}
                    </Typography>
                    <button style={buttonSx.button} type="button" onClick={handlePrintLabels}>
                        番号表印刷
                    </button>
                </div>

                <div className="ag-theme-alpine p304-grid" style={tableSx.tableContainer}>
                    <DataGrid<PalletRow>
                        columnDefs={columnDefs}
                        rowData={pageRows}
                        page={page}
                        pageSize={PAGE_SIZE}
                        rowTotal={filteredPallets.length}
                        onPageChange={(current) => {
                            setPage(current);
                            setSelectedPallets([]);
                        }}
                        rowUniqueKey="id"
                        selectionMode="multiple"
                        onSelectionChange={setSelectedPallets}
                        pagination
                        rowHeight={38}
                        noRowsShow="該当するパレットがありません。"
                    />
                </div>

                {/* 一覧の min-height（350px）を解除し、行数に合わせて高さを詰める */}
                <style>{`
                    .p304-grid .ag-center-cols-viewport,
                    .p304-grid .ag-center-cols-clipper {
                        min-height: 0 !important;
                    }
                `}</style>
            </CustomCard>

            {/* 操作ボタン（設計書どおり画面左下に戻るを配置する） */}
            <div style={footerStyle}>
                <button style={buttonSx.button} type="button" onClick={() => navigate(-1)}>
                    戻る
                </button>
            </div>
        </PageContainer>
    );
};

// 検索ボタン領域（フォームの下に右寄せで配置する）
const searchButtonBarStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
};

// 検索結果ヘッダー（件数表示と番号表印刷ボタンを左右に配置する）
const resultHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '0 0 8px 0',
};

// 画面下部のボタン領域（戻るは左寄せ）
const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-start',
    margin: '5px 0',
};

export default P304;
