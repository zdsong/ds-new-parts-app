import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { useFormContext } from 'react-hook-form';
import { SimpleForm } from 'react-admin';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';

import useApiRequest from '../adapters/apiUtil';
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
 * 一覧は在庫情報詳細を倉庫・ロケ・品目で集約した結果。
 */

/** 選択肢 */
interface OptionItem {
    key: string;
    value: string;
}

/** 在庫 1 行 */
interface StockRow {
    id: string;
    whCd: string;
    warehouse: string;
    location: string;
    itemCode: string;
    itemName: string;
    quantity: number | string;
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

const INITIAL_CONDITION: SearchCondition = {
    warehouse: '',
    location: '',
    itemCode: '',
    itemName: '',
};

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
    color: 'var(--mui-page-header-color)',
    border: '1px solid var(--mui-page-header-color)',
};

const linkStyle: React.CSSProperties = {
    ...(tableSx.linkFontColumn as React.CSSProperties),
    color: 'var(--mui-page-header-color)',
};

/** 末尾の 0 を除いた数量 */
const formatQuantity = (value: unknown) => {
    if (value == null || value === '') {
        return '';
    }
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : String(value);
};

/** 倉庫を変えたらロケ番の選択を外す */
const LocationReset: React.FC<{ warehouse: string }> = ({ warehouse }) => {
    const { setValue } = useFormContext();
    const previous = useRef(warehouse);
    useEffect(() => {
        if (previous.current !== warehouse) {
            setValue('location', '');
            previous.current = warehouse;
        }
    }, [setValue, warehouse]);
    return null;
};

const P501: React.FC = () => {
    const navigate = useNavigate();
    const { request } = useApiRequest();
    const [formValues, setFormValues] = useState<SearchCondition>(INITIAL_CONDITION);
    const [formVersion, setFormVersion] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [rows, setRows] = useState<StockRow[]>([]);
    const [warehouseOptions, setWarehouseOptions] = useState<OptionItem[]>([]);
    const [locationOptions, setLocationOptions] = useState<OptionItem[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');

    const loadRows = useCallback(
        async (next: SearchCondition) => {
            const result = await request(
                'get',
                'api/inventory/list',
                {},
                {
                    whCd: next.warehouse,
                    locCd: next.location,
                    itemCode: next.itemCode.trim(),
                    itemName: next.itemName.trim(),
                },
                true,
                false
            );
            setRows(Array.isArray(result?.data) ? result.data : []);
        },
        [request]
    );

    useEffect(() => {
        const loadWarehouses = async () => {
            const result = await request('get', 'api/common/wh/options', {}, {}, false, false);
            setWarehouseOptions(Array.isArray(result?.data) ? result.data : []);
        };
        loadWarehouses();
        loadRows(INITIAL_CONDITION);
    }, [loadRows, request]);

    useEffect(() => {
        const loadLocations = async () => {
            if (!selectedWarehouse) {
                setLocationOptions([]);
                return;
            }
            const result = await request(
                'get',
                `api/common/${selectedWarehouse}/location/options`,
                {},
                {},
                false,
                false
            );
            setLocationOptions(Array.isArray(result?.data) ? result.data : []);
        };
        loadLocations();
    }, [request, selectedWarehouse]);

    const columnDefs = useMemo<ColDef<StockRow>[]>(
        () => [
            { headerName: '保管倉庫', field: 'warehouse', width: 130 },
            {
                headerName: 'ロケ番',
                field: 'location',
                width: 140,
                cellRenderer: (params: { data?: StockRow; value?: string }) => (
                    <span
                        style={linkStyle}
                        onClick={() =>
                            params.data &&
                            navigate(
                                `/P503?whCd=${encodeURIComponent(params.data.whCd)}&locCd=${encodeURIComponent(params.data.location)}`
                            )
                        }
                    >
                        {params.value}
                    </span>
                ),
            },
            {
                headerName: '品目コード',
                field: 'itemCode',
                width: 160,
                cellRenderer: (params: { value?: string }) => (
                    <span
                        style={linkStyle}
                        onClick={() =>
                            params.value && navigate(`/P502?itemCode=${encodeURIComponent(params.value)}`)
                        }
                    >
                        {params.value}
                    </span>
                ),
            },
            { headerName: '品目名', field: 'itemName', flex: 1, minWidth: 180 },
            {
                headerName: '在庫数',
                field: 'quantity',
                width: 110,
                valueFormatter: (params) => `${formatQuantity(params.value)}個`,
                cellStyle: { justifyContent: 'flex-end' },
            },
            { headerName: '最終更新日', field: 'updatedDate', width: 140 },
            { headerName: '最終更新者', field: 'updater', flex: 1, minWidth: 180 },
        ],
        [navigate]
    );

    const handleSearch = (values: Record<string, unknown>) => {
        const next: SearchCondition = {
            warehouse: normalizeChoiceValue(values?.warehouse),
            location: normalizeChoiceValue(values?.location),
            itemCode: String(values?.itemCode || ''),
            itemName: String(values?.itemName || ''),
        };
        setPage(1);
        loadRows(next);
    };

    const handleClear = () => {
        setFormValues(INITIAL_CONDITION);
        setSelectedWarehouse('');
        setFormVersion((version) => version + 1);
        setPage(1);
        loadRows(INITIAL_CONDITION);
    };

    const handlePageSizeChange = (value: number) => {
        setPageSize(value);
        setPage(1);
    };

    return (
        <PageContainer title="在庫一覧" titleUnderline bottomSpace>
            <div style={sectionTitleStyle}>■検索条件</div>
            <SimpleForm
                key={formVersion}
                sx={formSx.formContainer}
                onSubmit={handleSearch}
                toolbar={false}
                defaultValues={formValues}
            >
                <LocationReset warehouse={selectedWarehouse} />
                <div style={formSx.form2}>
                    <FormInput
                        type={'filter-select'}
                        source="warehouse"
                        label="倉庫"
                        choices={warehouseOptions}
                        onChange={(value) => {
                            const next = normalizeChoiceValue(value);
                            setSelectedWarehouse(next);
                            setFormValues((current) => ({ ...current, warehouse: next, location: '' }));
                        }}
                    />
                    <FormInput
                        type={'filter-select'}
                        source="location"
                        label="ロケ番"
                        choices={locationOptions}
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
                rowData={rows}
                showResultSummary
                showPageSize
                showTopPagination
                showBottomPagination
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                noRowsShow="該当する在庫がありません。"
                bottomLeft={
                    <button type="button" style={buttonSx.backButton} onClick={() => navigate(-1)}>
                        戻る
                    </button>
                }
            />
        </PageContainer>
    );
};

export default P501;
