import React, { useMemo, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { SimpleForm } from 'react-admin';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import ResultGrid from '../compontent/ResultGrid';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import { normalizeChoiceValue } from '../utils/palletData';

/**
 * 在庫一覧（部品）画面（P501）
 *
 * 画面イメージ：④在庫管理 在庫一覧（部品）
 * 検索条件は倉庫・ロケ番・品目コード・品目名。
 * バックエンドは未接続。一覧は設計書の画面イメージに合わせた仮データ。
 */

/** 在庫 1 行 */
interface StockRow {
    id: string;
    warehouse: string;
    location: string;
    itemCode: string;
    itemName: string;
    /** 表示用。数値または xx */
    quantity: string;
    updatedDate: string;
    updater: string;
}

/** 検索条件 */
interface SearchCondition {
    warehouse: string;
    location: string;
    itemCode: string;
    itemName: string;
}

const WAREHOUSE_CHOICES = [
    { key: '1', value: '行田工場' },
    { key: '2', value: '外部倉庫' },
];

const WAREHOUSE_LABELS: Record<string, string> = Object.fromEntries(
    WAREHOUSE_CHOICES.map((choice) => [choice.key, choice.value])
);

const LOCATION_CHOICES = [
    { key: 'A-1-2-3', value: 'A-1-2-3' },
    { key: 'B-1-2-3-4', value: 'B-1-2-3-4' },
    { key: 'B-1-2-3-5', value: 'B-1-2-3-5' },
    { key: 'XXXXXXX', value: 'XXXXXXX' },
];

const PAGE_SIZE_CHOICES = [10, 20, 50];

const INITIAL_CONDITION: SearchCondition = {
    warehouse: '',
    location: '',
    itemCode: '',
    itemName: '',
};

/** 設計書の先頭行。残りは同じ体裁で 120 件になるまで足す */
const buildRows = (): StockRow[] => {
    const head: Omit<StockRow, 'id' | 'updatedDate'>[] = [
        {
            warehouse: '行田工場',
            location: 'A-1-2-3',
            itemCode: 'AAAAAAAAAA',
            itemName: 'サンプルネジA',
            quantity: '24',
            updater: '山田 太郎（物流）',
        },
        {
            warehouse: '行田工場',
            location: 'A-1-2-3',
            itemCode: 'XXXXXXXXXX',
            itemName: 'サンプルネジB',
            quantity: '70',
            updater: 'XXXXXXXXXXXXXX',
        },
        {
            warehouse: '外部倉庫',
            location: 'B-1-2-3-4',
            itemCode: 'XXXXXXXXXX',
            itemName: 'サンプルネジC',
            quantity: '110',
            updater: 'XXXXXXXXXXXXXX',
        },
        {
            warehouse: '外部倉庫',
            location: 'B-1-2-3-4',
            itemCode: 'XXXXXXXXXX',
            itemName: 'サンプルネジD',
            quantity: '150',
            updater: 'XXXXXXXXXXXXXX',
        },
        {
            warehouse: '外部倉庫',
            location: 'B-1-2-3-5',
            itemCode: 'XXXXXXXXXX',
            itemName: 'サンプルネジD',
            quantity: 'xx',
            updater: 'XXXXXXXXXXXXXX',
        },
    ];
    const rows: StockRow[] = head.map((row, index) => ({
        ...row,
        id: String(index + 1),
        updatedDate: '2026/10/01',
    }));
    for (let index = rows.length; index < 120; index += 1) {
        rows.push({
            id: String(index + 1),
            warehouse: '外部倉庫',
            location: 'XXXXXXX',
            itemCode: 'XXXXXXXXXX',
            itemName: 'XXXXXXXXXXXXXX',
            quantity: 'xx',
            updatedDate: '2026/10/01',
            updater: 'XXXXXXXXXXXXXX',
        });
    }
    return rows;
};

const STOCK_ROWS = buildRows();

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 700,
    margin: '8px 0 10px',
};

const searchButtonBarStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1rem',
};

const outlineButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    backgroundColor: '#ffffff',
    color: '#1a73c7',
    border: '1px solid #1a73c7',
};

const backButtonStyle: React.CSSProperties = {
    ...buttonSx.button,
    backgroundColor: '#5b9bd5',
};

const linkStyle: React.CSSProperties = {
    ...(tableSx.linkFontColumn as React.CSSProperties),
    color: '#1a73c7',
};

const P501: React.FC = () => {
    const navigate = useNavigate();
    const [condition, setCondition] = useState<SearchCondition>(INITIAL_CONDITION);
    const [formValues, setFormValues] = useState<SearchCondition>(INITIAL_CONDITION);
    const [formVersion, setFormVersion] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const filteredRows = useMemo(() => {
        const code = condition.itemCode.trim();
        const name = condition.itemName.trim();
        const warehouse = WAREHOUSE_LABELS[condition.warehouse] || '';
        return STOCK_ROWS.filter(
            (row) =>
                (!warehouse || row.warehouse === warehouse) &&
                (!condition.location || row.location === condition.location) &&
                (!code || row.itemCode.includes(code)) &&
                (!name || row.itemName.includes(name))
        );
    }, [condition]);

    const columnDefs = useMemo<ColDef<StockRow>[]>(
        () => [
            { headerName: '保管倉庫', field: 'warehouse', width: 130 },
            { headerName: 'ロケ番', field: 'location', width: 140 },
            {
                headerName: '品目コード',
                field: 'itemCode',
                width: 160,
                cellRenderer: (params: { value?: string }) => (
                    <span style={linkStyle} onClick={() => navigate('/P502')}>
                        {params.value}
                    </span>
                ),
            },
            {
                headerName: '品目名',
                field: 'itemName',
                flex: 1,
                minWidth: 180,
                cellRenderer: (params: { value?: string }) => (
                    <span style={linkStyle} onClick={() => navigate('/P502')}>
                        {params.value}
                    </span>
                ),
            },
            {
                headerName: '在庫数',
                field: 'quantity',
                width: 110,
                valueFormatter: (params) => `${params.value ?? ''}個`,
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: '最終更新日', field: 'updatedDate', width: 140 },
            { headerName: '最終更新者', field: 'updater', flex: 1, minWidth: 180 },
        ],
        [navigate]
    );

    const handleSearch = (values: Record<string, unknown>) => {
        setCondition({
            warehouse: normalizeChoiceValue(values?.warehouse),
            location: normalizeChoiceValue(values?.location),
            itemCode: String(values?.itemCode || ''),
            itemName: String(values?.itemName || ''),
        });
        setPage(1);
    };

    const handleClear = () => {
        setCondition(INITIAL_CONDITION);
        setFormValues(INITIAL_CONDITION);
        setFormVersion((version) => version + 1);
        setPage(1);
    };

    const handlePageSizeChange = (value: number) => {
        setPageSize(value);
        setPage(1);
    };

    return (
        <PageContainer title="在庫一覧">
            <div style={sectionTitleStyle}>■検索条件</div>
            <SimpleForm
                key={formVersion}
                sx={formSx.formContainer}
                onSubmit={handleSearch}
                toolbar={false}
                defaultValues={formValues}
            >
                <div style={formSx.form2}>
                    <FormInput
                        type={'filter-select'}
                        source="warehouse"
                        label="倉庫"
                        choices={WAREHOUSE_CHOICES}
                    />
                    <FormInput
                        type={'filter-select'}
                        source="location"
                        label="ロケ番"
                        choices={LOCATION_CHOICES}
                    />
                    <FormInput type={'text'} source="itemCode" label="品目コード" />
                    <FormInput type={'text'} source="itemName" label="品目名" />
                </div>
                <div style={searchButtonBarStyle}>
                    <button style={outlineButtonStyle} type="button" onClick={handleClear}>
                        クリア
                    </button>
                    <button style={buttonSx.button} type="submit">
                        検索
                    </button>
                </div>
            </SimpleForm>

            <div style={{ ...sectionTitleStyle, marginTop: '22px' }}>■検索結果一覧</div>
            <ResultGrid<StockRow>
                columnDefs={columnDefs}
                rowData={filteredRows}
                showResultSummary
                showPageSize
                showTopPagination
                showBottomPagination
                pageSizeChoices={PAGE_SIZE_CHOICES}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                noRowsShow="該当する在庫がありません。"
                bottomLeft={
                    <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
                        戻る
                    </button>
                }
            />
        </PageContainer>
    );
};

export default P501;
