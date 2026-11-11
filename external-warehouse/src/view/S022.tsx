import React, { useState, useEffect, useRef } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm,useNotify } from 'react-admin';

import CustomCard from '../compontent/CustomCard'
import { ColDef } from 'ag-grid-community';
import { useNavigate, useLocation} from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

export interface DictDetailData {
    id: string;
    dictCode: string;
    dictLabel: string;
    dictValue: string;
    dictSort: string;
    status: string;
    isDefault: string;
    remark?: string;
    createTime?: string;
    updateTime?: string;
    dictType: string;
}

const S022: React.FC = () => {
    const [rowData, setRowData] = useState<DictDetailData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10)
    const [dictType, setDictType] = useState<string>('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<DictDetailData[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    const gridRef = useRef<DataGridRef<DictDetailData>>(null);
    const [searchForm, setSearchForm] = useState({
        dictLabel: '',
        dictValue: '',
        status: ''
    });
    const { request } = useApiRequest();
    const notify = useNotify();
    
    useEffect(() => {
        if (location.state && location.state.dictType) {
            setDictType(location.state.dictType);
        }
    }, [location]);
    
    useEffect(() => {
        if (dictType) {
            fetchDictDetailList(searchForm, { current: pageNum });
        }
    }, [searchForm, pageNum, dictType, pageSize]);
        
    const fetchDictDetailList = async (searchParams?: any, pagination?: any) => {
        try {
            const currentPage = pagination?.current || pageNum;
            const params = {
                ...(searchParams || searchForm),
                dictType: dictType
            };
            const response = await request('get', 'api/system/dict/data/list', params, { current: currentPage, pageSize: pageSize });
            if (response.code === 200) {
                const formattedData = (response.rows || []).map((item: any) => ({
                    ...item,
                    id: item.dictCode
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
        setSearchForm(searchData);
        setPageNum(1);
    };

    const handleAdd = () => {
        navigate('/S020/S023', { state: { dictType } });
    };

    const handleEdit = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows.length === 1) {
                const dictData = selectedRows[0];
                navigate('/S020/S023', { state: { dictData } });
            } else {
            }
        }
    };

    const handleDeleteClick = () => {
        if(gridRef.current){
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
            const selectedIds = selectedRowsForDelete.map((row: DictDetailData) => row.dictCode);
            
            const response = await request('delete', `api/system/dict/data/${selectedIds.join(',')}`);
            if (response.code === 200) {
                await fetchDictDetailList(searchForm, { current: pageNum });
            }
        } catch (error) {
        }
    };

    const handleClose = () => {
        navigate('/S020');
    };

    const columnDefs: ColDef[] = [
        {
            headerName: '辞書ラベル',
            field: 'dictLabel',
            sortable: true,
            width: 200
        },
        {
            headerName: '辞書キー値',
            field: 'dictValue',
            sortable: true,
            width: 200
        },
        {
            headerName: '辞書ソート',
            field: 'dictSort',
            sortable: true,
            width: 200
        },
        {
            headerName: 'ステータス',
            field: 'status',
            sortable: true,
            width: 200,
            cellRenderer: (params: any) => {
                const statusText = params.value === '0' ? '正常' : '停止';
                return <span style={{ color: params.value === '0' ? 'green' : 'red' }}>{statusText}</span>;
            }
        },
        {
            headerName: 'デフォルト',
            field: 'isDefault',
            sortable: true,
            width: 200,
            cellRenderer: (params: any) => {
                const defaultText = params.value === 'Y' ? 'Yes' : 'No';
                return <span>{defaultText}</span>;
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
            dictLabel: '',
            dictValue: '',
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
        <PageContainer title={'辞書明細 - ' + dictType}>
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
                            source="dictLabel"
                            label="辞書ラベル"
                        />
                        <FormInput
                            type={'text'}
                            source="dictValue"
                            label="辞書キー値"
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
            
            <CustomCard sx={{ width: '100%', padding: 0 }} titleVariant={'body1'} title="辞書明細リスト" border={false}>
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
                        onClick={handleClose}
                    >
                        閉める
                    </button>
                </div>
                
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<DictDetailData>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowTotal={total}
                        page={pageNum}
                        pagination
                        onPageChange={handlePageChange}
                        rowUniqueKey='dictCode'
                        selectionMode="multiple"
                    />
                </div>

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
            </CustomCard>
        </PageContainer>
    );
};

export default S022;