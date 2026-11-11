import React, { useMemo, useState, useEffect, useRef } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm, useNotify, useTranslate} from 'react-admin';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

import CustomCard from '../compontent/CustomCard'
import { ColDef } from 'ag-grid-community';
import { useNavigate, useLocation} from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';

export interface LoginLogData {
    id: string;
    infoId: string;
    userName: string;
    status: string;
    ipaddr: string;
    loginLocation: string;
    browser: string;
    os: string;
    msg: string;
    loginTime: string;
    systemCd: string;
}

const S030: React.FC = () => {
    const [rowData, setRowData] = useState<LoginLogData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<LoginLogData[]>([]);

    interface SearchForm {
        userName: string;
        ipaddr: string;
        status: string;
        loginTime: { startDate?: string; endDate?: string };
    }

    const [searchForm, setSearchForm] = useState<SearchForm>({
        userName: '',
        ipaddr: '',
        status: '',
        loginTime:{}
    });

    const navigate = useNavigate();
    const location = useLocation();
    const gridRef = useRef<DataGridRef<LoginLogData>>(null);
    const { request } = useApiRequest();
    const notify = useNotify();
    const translate = useTranslate();
    const loginTimeRef = useRef(null);
    
    useEffect(() => {
        fetchLoginLogList(searchForm, { current: pageNum, pageSize: pageSize });
    }, [pageNum, pageSize]);
        
    const fetchLoginLogList = async (searchParams?: any, pagination?:any) => {
        try {
            const currentPage = pagination?.current || pageNum;
            let params = { ...(searchParams || searchForm) };
            if (params.loginTime) {
                const { loginTime, ...otherParams } = params;

                params = { ...otherParams };
                
                if (loginTime.startDate) {
                    params.beginTime = loginTime.startDate;
                }
                
                if (loginTime.endDate) {
                    params.endTime = loginTime.endDate;
                }
            }
            
            const response = await request('get', 'api/monitor/logininfor/list', params, { current: currentPage, pageSize: pageSize });
            if (response.code === 200) {
                const formattedData = response.rows.map((item: any) => ({
                    ...item,
                    id: item.infoId?.toString(),
                    infoId: item.infoId?.toString()
                }));
                setRowData(formattedData);
                setTotal(response.total || 0);
            }
        } catch (error) {
        }
    };

    const handlePageChange = (current: number, pageSize: number) => {
        setPageNum(current || 1);
        setPageSize(pageSize || 10)
    };

    const handleSearch = async(searchData: any) => {
        if(searchForm.loginTime && searchForm.loginTime.startDate && searchForm.loginTime.endDate){
            if ((new Date(searchForm.loginTime.endDate)) < (new Date(searchForm.loginTime.startDate))) {
                notify(translate('ra.message.error_date_range'), {type: 'error'})
                if (loginTimeRef.current) {
                    (loginTimeRef.current as any).focus();
                }
                return
            }
        }
        setSearchForm(searchForm);
        setPageNum(1);
        fetchLoginLogList(searchForm)
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
            const selectedIds = selectedRowsForDelete.map((row: LoginLogData) => row.infoId);
            try {
                const response = await request('delete', `api/monitor/logininfor/${selectedIds.join(',')}`);
                if (response.code === 200) {
                    await fetchLoginLogList();
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
        try {
            const response = await request('delete', 'api/monitor/logininfor/clean', {}, {});
            if (response.code === 200) {
                fetchLoginLogList();
            }
        } catch (error) {
        }
        setClearDialogOpen(false);
    };

    const columnDefs: ColDef[] = [
        {
            headerName: '番号',
            field: 'infoId',
            sortable: true,
            width: 150
        },
        {
            headerName: 'ユーザーアカウント',
            field: 'userName',
            sortable: true,
            width: 200
        },
        {
            headerName: 'ログインIPアドレス',
            field: 'ipaddr',
            sortable: true,
            width: 200
        },
        {
            headerName: 'ログイン場所',
            field: 'loginLocation',
            sortable: true,
            width: 200
        },
        {
            headerName: 'ブラウザ',
            field: 'browser',
            sortable: true,
            width: 200
        },
        {
            headerName: 'オペレーティングシステム',
            field: 'os',
            sortable: true,
            width: 200
        },
        {
            headerName: 'ログインステータス',
            field: 'status',
            sortable: true,
            width: 100,
            cellRenderer: (params: any) => {
                const statusText = params.value === '0' ? '成功' : '失敗';
                return <span style={{ color: params.value === '0' ? 'green' : 'red' }}>{statusText}</span>;
            }
        },
        {
            headerName: 'ヒントメッセージ',
            field: 'msg',
            sortable: true,
            width: 300
        },
        {
            headerName: 'アクセス時間',
            field: 'loginTime',
            sortable: true,
            width: 200
        },
        {
            headerName: 'システムコード',
            field: 'systemCd',
            sortable: true,
            width: 150
        }
    ];

    const handleReset = () => {
        if (loginTimeRef.current) {
            (loginTimeRef.current as any).clear();
        }
        setSearchForm({
            userName: '',
            ipaddr: '',
            status: '',
            loginTime: {}
        });
        setPageNum(1);    
    };

    const [sysCommonStatus, setSysCommonStatus] = useState([])

    useEffect(() => {

        const fetchCommonCode = async () => {
        try {
            const sysCommonStatusData = await request(
            'post', 
            'api/common/options',
            { cmdOptionName: 'sys_common_status' },
            {},
            false,
            false
            );

            setSysCommonStatus(sysCommonStatusData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    return (
        <PageContainer title={'ログインログ'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件" border={false}>
                <SimpleForm 
                    sx={formSx.formContainer} 
                    onSubmit={handleSearch} 
                    toolbar={false}
                    defaultValues={searchForm}
                    values={searchForm}
                >
                    <div style={formSx.form1}>
                        <FormInput
                            type={'text'}
                            source="userName"
                            label="アカウント"
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                userName: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="ipaddr"
                            label="IPアドレス"
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                ipaddr: value,
                            }));}}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="status"
                            label="ステータス"
                            choices={sysCommonStatus}
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                status: value.key,
                            }));}}
                        />
                        <FormInput
                            ref={loginTimeRef}
                            type={'input-daterange'}
                            source="loginTime"
                            label="アクセス時間"
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                loginTime: value,
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

            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="ログインログリスト" border={false}>
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
                    <DataGrid<LoginLogData>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowTotal={total}
                        page={pageNum}
                        pagination
                        onPageChange={handlePageChange}
                        rowUniqueKey='infoId'
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

export default S030;