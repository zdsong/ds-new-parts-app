import React, { useMemo, useState, useEffect, useRef } from 'react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm, TextInput, useNotify, useTranslate } from 'react-admin';
import CustomCard from '../compontent/CustomCard'
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface ParamData {
    id:string;
    configId: string;
    configName: string;
    configKey: string;
    configValue: string;
    configType: string;
    configTypeLabel: string;
    remark?: string;
    createTime?: string;
    updateTime?: string;
}

const S010: React.FC = () => {
    const [rowData, setRowData] = useState<ParamData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10)
    const [searchForm, setSearchForm] = useState<any>({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<ParamData[]>([]);
    const navigate = useNavigate();
    const gridRef = useRef<DataGridRef<ParamData> | null>(null);
    const { request } = useApiRequest();
    const notify = useNotify();
    const translate = useTranslate();

    const fetchData = async () => {
        try {
            const response = await request('get', 'api/system/config/list' ,searchForm, { current: pageNum, pageSize: pageSize });
            if (response.code === 200 && response.rows) {
                const formattedData = response.rows.map((item: any) => ({
                    ...item,
                    id: item.configId.toString(),
                    configId: item.configId.toString()
                }));
                setRowData(formattedData);
                setTotal(response.total);
            }
        } catch (error) {
        }
    };
    useEffect(() => {
        fetchData();
    }, [searchForm, pageNum, pageSize]);
    
    const handleSearch = (searchData: any) => {
        setSearchForm(searchData);
        setPageNum(1);
    };
    
    const handlePageChange = (current: number, pageSize: number) => {
        setPageNum(current || 1);
        setPageSize(pageSize || 10)
    };

    const handleAdd = () => {
        navigate('S011');
    };

    const handleEdit = () => {
        const selectedRows = gridRef.current?.getSelectedRows() || [];
        if (selectedRows.length === 1) {
            const paramData = selectedRows[0];
            navigate('S011', { state: { paramData, isEdit: true } });
        } else {
        }
    };

    const handleDeleteClick = () => {
        const selectedRows = gridRef.current?.getSelectedRows() || [];
        if (selectedRows.length > 0) {
            const hasBuiltIn = selectedRows.some((row: ParamData) => row.configTypeLabel === 'はい');
            if (hasBuiltIn) {
                notify(translate('ra.message.built_in_cannot_delete'), { type: 'error' });
                return;
            }
            
            setSelectedRowsForDelete(selectedRows);
            setDeleteDialogOpen(true);
        } else {
        }
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSelectedRowsForDelete([]);
    };

    const executeApiRequest = async (url: string, method: string = 'delete') => {
        try {
            await request(method, url);
            fetchData();
        } catch (error) {
        }
    };

    const handleConfirmDelete = async () => {
        handleCloseDeleteDialog();
        const selectedIds = selectedRowsForDelete.map((row: ParamData) => Number(row.configId));
        executeApiRequest(`api/system/config/${selectedIds.join(',')}`);
    };

    const handleRefreshCache = async () => {
        executeApiRequest('api/system/config/refreshCache');
    };
    const columnDefs: ColDef[] = [
        {
            headerName: 'パラメータ名',
            field: 'configName',
            sortable: true,
            width: 250
        },
        {
            headerName: 'パラメータキー名',
            field: 'configKey',
            sortable: true,
            width: 250
        },
        {
            headerName: 'パラメータキー値',
            field: 'configValue',
            sortable: true,
            width: 250
        },
        {
            headerName: 'システム組み込み',
            field: 'configTypeLabel',
            sortable: true,
            width: 200,
            cellRenderer: (params: any) => {
                return params.value || '';
            }
        },
        {
            headerName: '備考',
            field: 'remark',
            sortable: true,
            width: 200
        },
        {
            headerName: '更新日時',
            field: 'createTime',
            sortable: true,
            width: 200
        },
    ];

    const defaultColDef = useMemo(() => ({
        width: 150,
        cellStyle: {},
        sortable: true,
        filter: true
    }), []);

    const handleReset = () => {
        setSearchForm({
            configName: '',
            configKey: '',
            configType: ''
        });
        setPageNum(1);
    };

    const [sysYesNo, setSysYesNo] = useState([]);

    useEffect(() => {
        const fetchCommonCode = async () => {
            try {
                const sysYesNoData = await request(
                    'post', 
                    'api/common/options',
                    { cmdOptionName: 'sys_yes_no' },
                    {},
                    false,
                    false
                );
                setSysYesNo(sysYesNoData.data);
            } catch (error) {
                // エラー処理は apiUtil で一元管理されている
            }
        };
        fetchCommonCode();
    }, []);

    return (
        <PageContainer title={'システムパラメータ設定'}>
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
                            source="configName"
                            label="パラメータ名"
                            sx={{
                                label: {
                                    width: '140px'
                                }
                            }}
                        />
                        <FormInput
                            type={'text'}
                            source="configKey"
                            label="パラメータキー名"
                            sx={{
                                label: {
                                    width: '140px'
                                }
                            }}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="configType"
                            label="システム組み込み"
                            choices={sysYesNo}
                            sx={{
                                label: {
                                    width: '140px'
                                }
                            }}
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
                                onClick={()=>{handleReset()}}
                            >
                                リセット
                            </button>
                        </div>
                    </div>
                </SimpleForm>
            </CustomCard>

            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="システムパラメータリスト" border={false}>
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
                        style={{ ...buttonSx.button, width: '190px' }}  
                        type="button"
                        onClick={handleRefreshCache}
                    >
                        キャッシュのリフレッシュ
                    </button>
                </div>
                
                
            <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                <DataGrid<ParamData>
                    ref={gridRef}
                    columnDefs={columnDefs}
                    rowData={rowData}
                    rowTotal={total}
                    page={pageNum}
                    pagination={true}
                    onPageChange={handlePageChange}
                    rowHeight={35}
                    selectionMode='multiple'
                    rowUniqueKey='id'
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

export default S010;