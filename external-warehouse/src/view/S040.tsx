import React, { useState, useEffect, useRef, useMemo } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm, useNotify, useTranslate } from 'react-admin';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

import CustomCard from '../compontent/CustomCard'
import { ColDef } from 'ag-grid-community';
import { useNavigate, useLocation} from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';

interface OperLogData {
    id: string;
    operId: string;
    title: string;
    businessType: number;
    businessTypes: number[];
    method: string;
    requestMethod: string;
    operatorType: number;
    operName: string;
    operUrl: string;
    operIp: string;
    operLocation: string;
    operParam: string;
    jsonResult: string;
    status: number;
    errorMsg: string;
    operTime: string;
    costTime: number;
    systemCd: string;
}

const S040: React.FC = () => {
    const [rowData, setRowData] = useState<OperLogData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<OperLogData[]>([]);
    const [searchForm, setSearchForm] = useState<any>({});
    const navigate = useNavigate();
    const location = useLocation();
    const gridRef = useRef<DataGridRef<OperLogData>>(null);
    const formRef = useRef<any>(null);
    const { request } = useApiRequest();
    const notify = useNotify();
    const operTimeRef = useRef(null);
    const translate = useTranslate();
    
    const defaultSearchForm = {
        operIp: '',
        title: '',
        operName: '',
        businessType: '',
        status: '',
        operTime: {}
    };

    useEffect(() => {
        fetchOperLogList();
    }, [location, pageNum, pageSize]);
        
    const fetchOperLogList = async () => {
        try {
            let params = { ...searchForm };

            if (params.operTime && (params.operTime.startDate || params.operTime.endDate)) {
                const { operTime, ...otherParams } = params;
                
                params = { ...otherParams };
                
                if (operTime.startDate) {
                    params.beginTime = operTime.startDate;
                }
                
                if (operTime.endDate) {
                    params.endTime = operTime.endDate;
                }

                params = {
                    ...otherParams,
                    'beginTime': `${operTime.startDate}`,
                    'endTime': `${operTime.endDate}`,
                };
            }
  
            const response = await request('get', 'api/monitor/operlog/list', params, { current: pageNum, pageSize: pageSize });
            if (response.code === 200) {
                const formattedData = response.rows.map((item: any) => ({
                    ...item,
                    id: item.operId?.toString(),
                    operId: item.operId?.toString()
                }));
                setRowData(formattedData);
                setTotal(response.total);
            }
        } catch (error) {
        }
    };

    const handlePageChange = (current: number, pageSize: number) => {
        setPageNum(current || 1);
        setPageSize(pageSize || 10)
    };

    const handleSearch = async(searchData: any) => {
        if(searchForm.operTime && searchForm.operTime.startDate && searchForm.operTime.endDate){
            if ((new Date(searchForm.operTime.endDate)) < (new Date(searchForm.operTime.startDate))) {
                notify(translate('ra.message.error_date_range'), {type: 'error'})
                if (operTimeRef.current) {
                    (operTimeRef.current as any).focus();
                }
                return
            }
        }
        setSearchForm(searchForm);
        setPageNum(1);
        fetchOperLogList()
    };

    const handleDeleteClick = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows && selectedRows.length > 0) {
                setSelectedRowsForDelete(selectedRows);
                setDeleteDialogOpen(true);
            } else {
            }
        }
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSelectedRowsForDelete([]);
    };

    const handleConfirmDelete = async () => {
        handleCloseDeleteDialog();
        
        if (selectedRowsForDelete.length > 0) {
            const selectedIds = selectedRowsForDelete.map((row: OperLogData) => row.operId);
            try {
                const response = await request('delete', `api/monitor/operlog/${selectedIds.join(',')}`);
                if (response.code === 200) {
                    await fetchOperLogList();
                }
            } catch (error) {
            }
        }
    };

    const handleCleanClick = () => {
        setClearDialogOpen(true);
    };

    const handleCloseClearDialog = () => {
        setClearDialogOpen(false);
    };

    const handleConfirmClean = async () => {
        handleCloseClearDialog();
        
        try {
            const response = await request('delete', 'api/monitor/operlog/clean', {}, {});
            if (response.code === 200) {
                fetchOperLogList();
            }
        } catch (error) {
        }
    };

    const IdLinkRenderer = (props: any) => {
        const handleClick = () => {
            sessionStorage.setItem('operLogDetail', JSON.stringify(props.data));
            navigate(`/S040/S041/${props.data.operId}`);        
        };
        return <div style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} onClick={handleClick}>{props.value}</div>;
    };

    const columnDefs = useMemo<ColDef<OperLogData>[]>(() => [
        { headerName: '番号', field: 'operId', sortable: true, width: 100, cellRenderer: IdLinkRenderer  },
        { headerName: 'オペレーションモジュール', field: 'title', sortable: true, width: 210 },
        {
            headerName: 'ビジネス・タイプ',
            field: 'businessType',
            sortable: true,
            width: 150,
            cellRenderer: (params: any) => {
                const businessTypeMap: {[key: number]: string} = {
                    0: 'その他', 1: '新規', 2: '修正', 3: '削除', 4: '承認',
                    5: 'エクスポート', 6: 'インポート', 7: '強退', 8: 'コード生成', 9: 'データ消去'
                };
                return <span>{businessTypeMap[params.value] || params.value}</span>;
            }
        },
        { headerName: 'オペレータ', field: 'operName', sortable: true, width: 150 },
        { headerName: 'オペレーションIP', field: 'operIp', sortable: true, width: 200 },
        { headerName: 'オペレーションサイト', field: 'operLocation', sortable: true, width: 200 },
        {
            headerName: '状態',
            field: 'status',
            sortable: true,
            width: 100,
            cellRenderer: (params: any) => {
                const statusText = params.value === 0 ? '正常' : '異常';
                return <span style={{ color: params.value === 0 ? 'green' : 'red' }}>{statusText}</span>;
            }
        },
        { headerName: '時間', field: 'operTime', sortable: true, width: 200 },
        {
            headerName: '消費時間',
            field: 'costTime',
            sortable: true,
            width: 150,
            cellRenderer: (params: any) => <span>{params.value}ミリ秒</span>
        },
        { headerName: 'リクエストモード', field: 'requestMethod', sortable: true, width: 160 },
        { headerName: 'リクエストアドレス', field: 'operUrl', sortable: true, width: 300 },
        { headerName: 'エラーメッセージ', field: 'errorMsg', sortable: true, width: 300 },
        { headerName: '戻り値', field: 'jsonResult', sortable: true, width: 300 },
        { headerName: 'パラメータ', field: 'operParam', sortable: true, width: 300 },
        {
            headerName: '操作カテゴリ',
            field: 'operatorType',
            sortable: true,
            width: 200,
            cellRenderer: (params: any) => {
                const operatorTypeMap: {[key: number]: string} = {
                    0: 'その他', 1: 'バックグラウンドユーザ', 2: '携帯端末ユーザ'
                };
                return <span>{operatorTypeMap[params.value] || params.value}</span>;
            }
        },
        { headerName: '方法', field: 'method', sortable: true, width: 300 }
    ], []);

    const handleReset = () => {
        if (operTimeRef.current) {
            (operTimeRef.current as any).clear();
        }
        const resetParams = {
            operIp: '',
            title: '',
            operName: '',
            businessType: '',
            status: '',
            operTime: {}
        };
        setSearchForm(resetParams);
        setPageNum(1);
    };

    const [sysOperType, setSysOperType] = useState([])

    useEffect(() => {

        const fetchCommonCode = async () => {
        try {
            const sysOperTypeData = await request(
            'post', 
            'api/common/options',
            { cmdOptionName: 'sys_oper_type' },
            {},
            false,
            false
            );

            setSysOperType(sysOperTypeData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    return (
        <PageContainer title={'操作ログ'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件" border={false}>
                <SimpleForm
                    ref={formRef} 
                    sx={formSx.formContainer} 
                    onSubmit={handleSearch} 
                    toolbar={false}
                    defaultValues={searchForm || defaultSearchForm}
                >
                    <div style={formSx.form1}>
                        <FormInput
                            type={'text'}
                            source="operIp"
                            label="IP"
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                text: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="title"
                            label="モジュール"
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                title: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="operName"
                            label="オペレータ"
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                operName: value,
                            }));}}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="businessType"
                            label="ビジネスタイプ"
                            choices={sysOperType}
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                businessType: value.key,
                            }));}}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="status"
                            label="状態"
                            choices={[
                                { key: 0, value: '正常' },
                                { key: 1, value: '異常' }
                            ]}
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                status: value.key,
                            }));}}
                        />
                        <FormInput
                            ref={operTimeRef}
                            type={'input-daterange'}
                            source="operTime"
                            label="時間"
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                operTime: value,
                            }));}}
                        />
                        <div></div>
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
                                onClick={handleReset}
                            >
                                リセット
                            </button>
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="操作ログのリスト" border={false}>
                <div style={buttonSx.buttonBar}>
                    <button 
                        style={buttonSx.button}  
                        type="button"
                        onClick={handleDeleteClick}
                    >
                        削除
                    </button>
                    <button 
                        style={buttonSx.button}  
                        type="button"
                        onClick={handleCleanClick}
                    >
                        空にする
                    </button>
                </div>
                
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<OperLogData>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowTotal={total}
                        page={pageNum}
                        pagination
                        onPageChange={handlePageChange}
                        rowUniqueKey='operId'
                        selectionMode="multiple"
                    />
                </div>

            <Dialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="delete-confirm-dialog-title"
                aria-describedby="delete-confirm-dialog-description"
            >
                <DialogTitle id="delete-confirm-dialog-title">削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-confirm-dialog-description">
                        選択したデータを削除しますか？
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        キャンセル
                    </Button>
                    <Button onClick={handleConfirmDelete} color="primary" autoFocus>
                        確定
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={clearDialogOpen}
                onClose={handleCloseClearDialog}
                aria-labelledby="clear-confirm-dialog-title"
                aria-describedby="clear-confirm-dialog-description"
            >
                <DialogTitle id="clear-confirm-dialog-title">清空の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText id="clear-confirm-dialog-description">
                        すべてのログデータを削除しますか？この操作は元に戻すことができません。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseClearDialog} color="primary">
                        キャンセル
                    </Button>
                    <Button onClick={handleConfirmClean} color="primary" autoFocus>
                        確定
                    </Button>
                </DialogActions>
            </Dialog>
            </CustomCard>
        </PageContainer>
    );
};

export default S040;