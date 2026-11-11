import React, { useMemo, useState, useEffect, useRef } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm, useNotify, useTranslate } from 'react-admin';

import CustomCard from '../compontent/CustomCard'
import { ColDef } from 'ag-grid-community';
import { useNavigate, useLocation} from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

export interface DictData {
    id: string;
    dictId: string;
    dictName: string;
    dictType: string;
    status: string;
    remark?: string;
    createTime?: string;
    updateTime?: string;
}

const S020: React.FC = () => {
    const [rowData, setRowData] = useState<DictData[]>([]);
    const [originalRowData, setOriginalRowData] = useState<DictData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<DictData[]>([]);
    const [searchForm, setSearchForm] = useState({
        dictName: '',
        dictType: '',
        status: ''
    });
    const navigate = useNavigate();
    const location = useLocation();
    const gridRef = useRef<DataGridRef<DictData>>(null);
    const { request } = useApiRequest();
    const notify = useNotify();
    const translate = useTranslate();
    
    useEffect(() => {
        fetchDictList(searchForm, { current: pageNum });
    }, [searchForm, pageNum, pageSize]);
        
    const fetchDictList = async (searchParams?: any, pagination?:any) => {
        try {
            const currentPage = pagination?.current || pageNum;
            const response = await request('get', 'api/system/dict/type/list', searchParams, { current: currentPage, pageSize: pageSize });
            if (response.code === 200) {
                const formattedData = response.rows.map((item: any) => ({
                    ...item,
                    id: item.dictId.toString()
                }));
                setRowData(formattedData);
                setOriginalRowData(formattedData);
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
        setSearchForm(searchData);
        setPageNum(1);    };

    const handleAdd = () => {
        navigate('S021');
    };

    const handleEdit = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows.length === 1) {
                const dictData = selectedRows[0];
                navigate('S021', { state: { dictData, isEdit: true } });
            } else {
            }
        }
    };

    const handleDeleteClick = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows.length > 0) {
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
        try {
            const selectedIds = selectedRowsForDelete.map((row: DictData) => row.dictId);
            
            const response = await request('delete', `api/system/dict/type/${selectedIds.join(',')}`);
            if (response.code === 200) {
                await fetchDictList();
            }
        } catch (error) {
        }
    };

    const handleRefreshCache = async () => {
        try {
            const response = await request('delete', 'api/system/dict/type/refreshCache');
            if (response.code === 200) {
                fetchDictList();
            }
        } catch (error) {
        }
    };

    const columnDefs: ColDef[] = [
        {
            headerName: '辞書名',
            field: 'dictName',
            sortable: true,
            width: 200
        },
        {
            headerName: '辞書の種類',
            field: 'dictType',
            sortable: true,
            width: 200,
            cellRenderer: (params: any) => {
                return (
                    <span style={{ cursor: 'pointer', color: '#1890ff' }} onClick={() => {
                        navigate('S022', { state: { dictType: params.value } });
                    }}>
                        {params.value}
                    </span>
                );
            }
        },
        {
            headerName: 'ステータス',
            field: 'status',
            sortable: true,
            width: 200,
            cellRenderer: (params: any) => {
                const statusText = params.value === '0' ? '通常' : '停止';
                return <span style={{ color: params.value === '0' ? 'green' : 'red' }}>{statusText}</span>;
            }
        },
        {
            headerName: '備考',
            field: 'remark',
            sortable: true,
            width: 200
        },
        {
            headerName: '作成日時',
            field: 'createTime',
            sortable: true,
            width: 200
        },
    ];

    const handleReset = () => {
        setSearchForm({
            dictName: '',
            dictType: '',
            status: ''
        });
        setPageNum(1);
    };

    const [sysJobStatus, setSysJobStatus] = useState([])

    useEffect(() => {

        const fetchCommonCode = async () => {
        try {
            const sysJobStatusData = await request(
            'post', 
            'api/common/options',
            { cmdOptionName: 'sys_job_status' },
            {},
            false,
            false
            );

            setSysJobStatus(sysJobStatusData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    return (
        <PageContainer title={'辞書管理'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件" border={false}>
                <SimpleForm 
                    sx={formSx.formContainer} 
                    onSubmit={handleSearch} 
                    toolbar={false}
                    defaultValues={searchForm}
                >
                    <div style={formSx.form1}>
                        <FormInput
                            type={'text'}
                            source="dictName"
                            label="辞書名"
                        />
                        <FormInput
                            type={'text'}
                            source="dictType"
                            label="辞書の種類"
                        />
                        <FormInput
                            type={'filter-select'}
                            source="status"
                            label="ステータス"
                            choices={sysJobStatus}
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
                                onClick={handleReset}
                            >
                                リセット
                            </button>
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="辞書管理リスト" border={false}>
                <div style={buttonSx.buttonBar}>
                    <button 
                        style={buttonSx.button}  
                        type="button"
                        onClick={handleAdd}
                    >
                        新規
                    </button>
                    <button 
                        style={buttonSx.button}  
                        type="button"
                        onClick={handleEdit}
                    >
                        修正
                    </button>
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
                        onClick={handleRefreshCache}
                    >
                        キャッシュのリフレッシュ
                    </button>
                </div>
                
                
    
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<DictData>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowTotal={total}
                        page={pageNum}
                        pagination
                        onPageChange={handlePageChange}
                        rowUniqueKey='id'
                        selectionMode="multiple"
                    />
                </div>
            </CustomCard>


        {/* 削除確認ダイアログ */}
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
    </PageContainer>
    );
};

export default S020;