import React, { useState, useRef, useEffect } from 'react';
import { SimpleForm, useNotify } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface MenuData {
    id: string;
    menuId: string;
    menuName: string;
    parentName: string;
    parentId: string;
    orderNum: string;
    path: string;
    component: string;
    query: string;
    routeName: string;
    isFrame: string;
    isCache: string;
    menuType: string;
    visible: string;
    status: string;
    perms: string;
    icon: string;
    remark: string;
    createTime?: string;
    updateTime?: string;
}

interface SearchForm {
    menuName: string;
    menuType: string;
    status: string;
    parentId: string;
}

const S050: React.FC = () => {
    const [rowData, setRowData] = useState<MenuData[]>([]);
    const [searchForm, setSearchForm] = useState<SearchForm>({
        menuName: '',
        menuType: '',
        status: '',
        parentId: '',
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<MenuData[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(10)
    const [parentMenuOptions, setParentMenuOptions] = useState<Array<{ key: string; value: string }>>([]);
    const navigate = useNavigate();
    const gridRef = useRef<DataGridRef<MenuData>>(null);
    const { request } = useApiRequest();
    const notify = useNotify();

    const fetchMenuList = async (searchData: any = null) => {
        try {
            const response = await request('get', 'api/system/menu/list', {
                ...(searchData || searchForm)
            });
            if (response.code === 200) {
                const menuData = response.rows || response.data || [];
                
                const formattedData = menuData.map((item: any) => ({
                    ...item,
                    id: item.menuId?.toString() || '',
                }));
                setRowData(formattedData)
            }
        } catch (error) {
        }
    };

    const handleSearch = async(searchData: any) => {
        setSearchForm(searchData);
    };

    const handleReset = () => {
        setSearchForm({
            menuName: '',
            menuType: '',
            status: '',
            parentId: ''
        });
    };

    const handleAdd = () => {
        navigate('S051');
    };

    const handleEdit = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows.length === 1) {
                const menuData = selectedRows[0];
                navigate('S051', { state: { menuData, isEdit: true } });
            } else {
            }
        }
    };

    const handleDelete = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows.length > 0) {
                setSelectedRowsForDelete(selectedRows);
                setDeleteDialogOpen(true);
            } else {
            }
        }
    };

    const handleConfirmDelete = async () => {
        try {
            for (const row of selectedRowsForDelete) {
                await request('delete', `api/system/menu/${row.menuId}`);
            }
            setDeleteDialogOpen(false);
            setSelectedRowsForDelete([]);
            fetchMenuList();
        } catch (error) {
        }
    };

    const handlePageChange = (current: number, pageSize: number) => {
        setPage(current || 1);
        setPageSize(pageSize || 10)
    };

    useEffect(() => {
        const fetchParentMenuOptions = async () => {
            try {
                const response = await request('get', 'api/system/menu/parent/options');
                if (response && response.data) {
                    const options = response.data.map((item: any) => ({
                        key: item.key,
                        value: item.value
                    }));
                    setParentMenuOptions(options);
                }
            } catch (error) {
            }
        };

        fetchParentMenuOptions();
    }, []);

    useEffect(() => {
        fetchMenuList(searchForm );
    }, [ searchForm, page, pageSize ]);

    const columnDefs: ColDef<MenuData>[] = [
        { headerName: 'メニュー名', field: 'menuName', width: 200 },
        { headerName: 'Parent メニュー名', field: 'parentName', width: 200 },
        { headerName: '表示順序', field: 'orderNum', width: 100 },
        { headerName: 'ルーティングアドレス', field: 'path', width: 200 },
        { headerName: 'コンポーネントパス', field: 'component', width: 250 },
        { headerName: 'ルーティングパラメータ', field: 'query', width: 200 },
        { headerName: 'ルート名', field: 'routeName', width: 150 },
        { headerName: 'フレーム内かどうか', field: 'isFrame', width: 200,
            cellRenderer: (params: any) => (
                <span>
                    {params.value === '0' ? 'Yes' : 'No'}
                </span>
            )
        },
        { headerName: 'キャッシュするかどうか', field: 'isCache', width: 200,
            cellRenderer: (params: any) => (
                <span>
                    {params.value === '0' ? 'Yes' : 'No'}
                </span>
            )
        },
        { headerName: 'タイプ', field: 'menuType', width: 200,
            cellRenderer: (params: any) => (
                <span>
                    {params.value === 'M' ? 'ディレクトリ' : params.value === 'C' ? 'メニュー' : 'ボタン'}
                </span>
            )
        },
        { headerName: '表示状態', field: 'visible', width: 100,
            cellRenderer: (params: any) => (
                <span style={{ color: params.value === '0' ? '#52c41a' : '#f5222d' }}>
                    {params.value === '0' ? '表示' : '非表示'}
                </span>
            )
        },
        { headerName: 'メニュー ステータス', field: 'status', width: 100,
            cellRenderer: (params: any) => (
                <span style={{ color: params.value === '0' ? '#52c41a' : '#f5222d' }}>
                    {params.value === '0' ? '正常' : '停止'}
                </span>
            )
        },
        { headerName: '権限文字列', field: 'perms', width: 200 },
        { headerName: 'メニューICON', field: 'icon', width: 200 },
        { headerName: '作成時間', field: 'createTime', width: 200 },
        { headerName: '更新時間', field: 'updateTime', width: 200 },
        { headerName: '備考', field: 'remark', width: 200 }
    ];

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
        <PageContainer title={'メニュー管理'}>
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
                            type={'filter-select'}
                            source="parentId"
                            label="親メニューID"
                            choices={parentMenuOptions}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="status"
                            label="ステータス"
                            choices={sysJobStatus}
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

            <CustomCard sx={{ width: '100%', marginTop: 2 }} titleVariant={'body1'} title="メニュー一覧" border={false}>
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
                        onClick={handleDelete}
                    >
                        削除
                    </button>
                </div>
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<MenuData>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowUniqueKey='id'
                        selectionMode="multiple"
                        rowHeight={35}
                        page={page}
                        onPageChange={handlePageChange}
                        pagination={false}
                    />
                </div>

                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    aria-labelledby="delete-confirm-dialog-title"
                    aria-describedby="delete-confirm-dialog-description"
                >
                    <DialogTitle id="delete-confirm-dialog-title">削除の確認</DialogTitle>
                    <DialogContent>
                        <DialogContentText id="delete-confirm-dialog-description">
                            選択したメニューを削除しますか？
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
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

export default S050;