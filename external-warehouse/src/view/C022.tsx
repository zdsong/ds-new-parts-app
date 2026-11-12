import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
    SimpleForm,
    useNotify,
    useTranslate
} from 'react-admin';
import { Box } from '@mui/material';
import CustomCard from '../compontent/CustomCard'
import { ColDef } from 'ag-grid-community';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import { formatDate } from '../utils/dateUtil';
import { normalizeJapanesePhone } from '../utils/dataUtil';

interface SearchFormProps {
    onSubmit?: (data: any) => void;
    onConfirm?: (selectedData: any) => void;
    farmerId?: string;
}
const C022: React.FC<SearchFormProps> = ({ onConfirm, farmerId }) => {
    //初期化設定
    const [data, setData] = useState([])
    const [total, setTotal] = useState(0)
    const [pageNum, setPageNum] = useState(1)
    const [searchForm, setSearchForm] = useState<any>({})

    useEffect(() => {
        setSearchForm((prev: any) => ({
            ...prev,
            farmerId: farmerId,
        }));
    }, [farmerId]);

    
    const { request } = useApiRequest();
    interface orderColumn {
        orderId: string;
        orderTime: string;
        itemName: string;
        statusLabel: string;
        customerName: string;
        deliveryCustomerName: string;
        id: string; // ジャンプ用ID（バックエンドリターンフィールドと一致する必要があります）
        uniqueId: string; // 行を一意に識別するID
        phoneNumber: string;
        deliveryPhoneNumber: string;
    }

    // 2. refタイプを修正する（NokaSearch定義の後でなければなりません！）
    const newGridRef = useRef<DataGridRef<orderColumn> | null>(null);
    const notify = useNotify();
    const translate = useTranslate();

    const handleSubmit = () => {
        if (!newGridRef.current) {
            notify(translate('ra.message.tabel_not_initialized'), { type: 'error' });
            return;
        }
        const selectedData = newGridRef.current.getSelectedRows();
        if (selectedData.length === 0) {
            notify(translate('ra.message.insufficient_data'), { type: 'error' });
            return;
        }
        if (onConfirm) {
            onConfirm({
                action: 'confirm',
                selectedRows: selectedData,
                timestamp: new Date().toISOString()
            });
        }
    };
    const columnDefs = useMemo<ColDef<orderColumn>[]>(
        () => [
            { headerName: '注文番号', field: 'orderId', sort: "asc", sortIndex: 1, width: 200},
            { headerName: '注文日時', field: 'orderTime', width: 150 ,cellRenderer: (props: {value: string })=>{return(<div>{formatDate(props.value)}</div>)}, sort: "desc", sortIndex: 0},
            { headerName: '商品名', field: 'itemName', 
            sort: "asc", sortIndex: 3, width: 150
            },
            { headerName: 'ステータス', field: 'statusLabel', width: 150 },
            { headerName: '注文者', field: 'customerName', width: 150},
            { headerName: '注文者（電話番号）', field: 'phoneNumber', width: 200,cellRenderer: (props: {value: string })=>{return(<div>{normalizeJapanesePhone(props.value)}</div>)}},
            { headerName: '届け先', field: 'deliveryCustomerName', width: 150, 
            sort: "asc", sortIndex: 2
            },
            { headerName: '届け先（電話番号）', field: 'deliveryPhoneNumber', width: 150,cellRenderer: (props: {value: string })=>{return(<div>{normalizeJapanesePhone(props.value)}</div>)}},
        ], []);

    const searchData = async (searchData: Record<string, any>, pagination: Record<string, any>) => {
        const result = await request('post', 'api/order/list', searchData, pagination, false, false)
        // データごとにユニークIDを追加し、同じsysOrderIdによる問題を解決
        const rowsWithUniqueId = result.rows.map((row: any, index: number) => ({
            ...row,
            uniqueId: `${row.sysOrderId}-${index}`
        }))
        setData(rowsWithUniqueId)
        setTotal(result.total)
    }
    const orderDateRef = useRef(null);
    /**
     * 検索フォーム送信時の処理（UniversalDataGrid の search メソッドを呼び出す）
     */
    const handleSearch = async (searchForm: Record<string, any>) => {
        if(searchForm.orderDate && searchForm.orderDate.startDate && searchForm.orderDate.endDate){
            if ((new Date(searchForm.orderDate.endDate)) < (new Date(searchForm.orderDate.startDate))) {
                notify(translate('ra.message.error_date_range'), {type: 'error'})
                if (orderDateRef.current) {
                    (orderDateRef.current as any).focus();
                }
                return
            }
        }
        // 4. 子コンポーネントの検索メソッドを呼び出す（親コンポーネントの手動リクエストロジックを削除）
        setSearchForm(searchForm)
        setPageNum(1)
        searchData(searchForm, { current: 1, pageSize: newGridRef.current?.getPageSize() })
    };

    const handlePageChange = async (current: number, pageSize: number) => {
        setPageNum(current)
        searchData(searchForm, { current: current, pageSize: pageSize })
    };

    const [bssOrderStatus, setBssOrderStatus] = useState([])

    useEffect(() => {

        const fetchCommonCode = async () => {
        try {
            const bssOrderStatusData = await request(
            'post', 
            'api/common/options',
            { cmdOptionName: 'bss_order_status' },
            {},
            false,
            false
            );

            setBssOrderStatus(bssOrderStatusData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    const handleClear = () =>{
        setSearchForm({
          customerId: '',
          customerName: '',
          phoneNumber: '',
        })
    }
    
    return (
        <Box>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'}
                title="検索条件"
            >

                <SimpleForm sx={formSx.formContainer} onSubmit={handleSearch} toolbar={false} defaultValues={searchForm}>

                    <div style={formSx.form1}>
                        <FormInput
                            type={'text-halfwidth'}
                            source="orderId"
                            label="注文番号"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 40
                                }
                            }}
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                orderId: value,
                            }));}}
                        />
                        <FormInput
                            ref={orderDateRef}
                            type={'input-daterange'}
                            source="orderDate"
                            label="注文日時"
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                orderDate: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="itemName"
                            label="商品名"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 256
                                }
                            }}
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                itemName: value,
                            }));}}
                        />
                        <FormInput
                            type={'text-number'}
                            source="phoneNumber"
                            label="電話番号"
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                phoneNumber: value,
                            }));}}
                            slotProps={{
                                htmlInput: {
                                    maxLength: 13,
                                }
                            }}
                        />
                        <FormInput
                            type={'text-halfwidth'}
                            source="farmerId"
                            label="農家ID"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 20
                                }
                            }}
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                farmerId: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="farmerName"
                            label="農家名"
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                farmerName: value,
                            }));}}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="status"
                            label="ステータス"
                            choices={bssOrderStatus}
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                status: value.key,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="customerName"
                            label="注文者"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 128
                                }
                            }}
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                customerName: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="deliveryCustomerName"
                            label="届け先"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 128
                                }
                            }}
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                deliveryCustomerName: value,
                            }));}}
                        />

                    </div>
                    <div style={buttonSx.buttonBar}>
                        <button
                            style={buttonSx.button}
                            type="submit"
                        >
                            検索
                        </button>
                        <button style={{...buttonSx.button, backgroundColor: 'gray'}} type='button' onClick={handleClear}>
                            クリア
                        </button>
                    </div>
                </SimpleForm>
            </CustomCard>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title={'検索結果'} border={false}>
                <div className="ag-theme-alpine" style={{...tableSx.tableContainer}}>
                    <DataGrid<orderColumn>
                        ref={newGridRef}
                        columnDefs={columnDefs}
                        rowData={data}
                        rowTotal={total}
                        page={pageNum}
                        pagination={true}
                        onPageChange={handlePageChange}
                        selectionMode='single'
                        rowUniqueKey="uniqueId"
                    />
                </div>
                <div style={buttonSx.centerButtonBar}>
                    <button
                        style={buttonSx.button}
                        type="submit"
                        onClick={handleSubmit}>
                        決定
                    </button>
                </div>
            </CustomCard>
        </Box >
    );
};
export default C022;