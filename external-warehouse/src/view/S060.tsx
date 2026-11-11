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

interface RoleData {
    id: string;
    roleId: string;
    roleName: string;
    roleKey: string;
    roleSort: string;
    dataScope: string;
    status: string;
    delFlag: string;
    version?: number;
    createTime?: string;
    updateTime?: string;
    remark?: string;
    menuCheckStrictly?: string;
}

interface SearchForm {
    roleName: string;
    roleKey: string;
    status: string;
}

const S060: React.FC = () => {
    const [rowData, setRowData] = useState<RoleData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [searchForm, setSearchForm] = useState<SearchForm>({
        roleName: '',
        roleKey: '',
        status: ''
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusDialogRoleId, setStatusDialogRoleId] = useState<string>('');
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<RoleData[]>([]);
    const navigate = useNavigate();
    const gridRef = useRef<DataGridRef<RoleData>>(null);
    const { request } = useApiRequest();
    const notify = useNotify();

    const fetchRoleList = async (searchData: any = null) => {
        try {
            const response = await request('get', 'api/system/role/list', {
                ...(searchData || searchForm),
                pageNum,
                pageSize
            });
            if (response.code === 200) {
                const formattedData = (response.rows || []).map((item: any) => ({
                    ...item,
                    id: item.roleId?.toString() || '',
                    version: item.version,
                }));
                setRowData(formattedData);
                setTotal(response.total);
            }
        } catch (error) {
        }
    };

    const handleSearch = async(searchData: any) => {
        setSearchForm(searchData);
        setPageNum(1);
    };

    const handleReset = () => {
        setSearchForm({
            roleName: '',
            roleKey: '',
            status: ''
        });
        setPageNum(1);
    };

    const handleAdd = () => {
        navigate('S061');
    };

    const handleEdit = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows.length === 1) {
                const roleData = selectedRows[0];
                navigate('S061', { state: { roleData, isEdit: true } });
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
            for (const role of selectedRowsForDelete) {
                await request('post', 'api/system/role/delLogicRole', {
                    roleId: parseInt(role.roleId),
                    version: role.version
                });
            }
            fetchRoleList();
        } catch (error) {
        }
    };

    const handleStatusDialogOpen = (roleId: string) => {
        setStatusDialogRoleId(roleId);
        setStatusDialogOpen(true);
    };

    const handleStatusDialogClose = () => {
        setStatusDialogOpen(false);
        setStatusDialogRoleId('');
    };

    const handleConfirmStatusToggle = async () => {
        if (!statusDialogRoleId) return;
        const role = rowData.find(r => r.roleId === statusDialogRoleId);
        if (!role) {
            handleStatusDialogClose();
            return;
        }
        const currentStatus = role.status;
        const newStatus = currentStatus === '0' ? '1' : '0';

        try {
            const updatedRowData = rowData.map(r => 
                r.roleId === statusDialogRoleId ? { ...r, status: newStatus } : r
            );
            setRowData(updatedRowData);

            let menuIds: string[] = [];
            try {
                const menuResponse = await request('get', `api/system/menu/roleMenuTreeSelect/${statusDialogRoleId}`);
                if (menuResponse?.checkedKeys) {
                    menuIds = menuResponse.checkedKeys.map((id: any) => id.toString());
                }
            } catch (error) {
            }

            await request('put', 'api/system/role', {
                roleId: parseInt(statusDialogRoleId),
                status: newStatus,
                version: role.version,
                roleName: role.roleName,
                roleKey: role.roleKey,
                roleSort: parseInt(role.roleSort),
                dataScope: role.dataScope,
                menuIds: menuIds,
                menuCheckStrictly: role.menuCheckStrictly ? parseInt(role.menuCheckStrictly) : 0
            });
            fetchRoleList();
        } catch (error) {
        }
        handleStatusDialogClose();
    };

    const handlePageChange = (current: number, pageSize: number) => {
        setPageNum(current || 1);
        setPageSize(pageSize || 10)
    };

    const columnDefs: ColDef[] = [
        { headerName: 'ロール番号', field: 'roleId', width: 200 },
        { headerName: 'ロール名', field: 'roleName', width: 200 },
        { headerName: 'ロールキー', field: 'roleKey', width: 200 },
        { headerName: '表示順序', field: 'roleSort', width: 150 },
        {
            headerName: 'データ範囲',
            field: 'dataScope',
            width: 200,
            cellRenderer: (params: any) => (
                <span>
                    {params.value === '1' ? 'すべてのデータ権限' :
                     params.value === '2' ? 'カスタムデータ権限' :
                     params.value === '3' ? '自部門データ権限' :
                     params.value === '4' ? '自部門および以下データ権限' :
                     params.value === '5' ? '自分自身のデータ権限' : params.value}
                </span>
            ),
        },
        {
            headerName: 'ステータス',
            field: 'status',
            width: 200,
            cellRenderer: (params: any) => (
                <span style={{ 
                    color: params.value === '0' ? '#52c41a' : '#f5222d' 
                }}>
                    {params.value === '0' ? '正常' : '停止'}
                </span>
            ),
        },
        { headerName: '作成日時', field: 'createTime', width: 180 },
        {
            headerName: '操作',
            field: 'actions',
            width: 150,
            cellRenderer: (params: any) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span 
                        style={{ color: 'rgb(255, 13, 110)', cursor: 'pointer' }}
                        onClick={() => handleStatusDialogOpen(params.data.roleId)}
                    >
                        {params.data.status === '0' ? '停止' : '運行'}
                    </span>
                </div>
            ),
        },
    ];

    const defaultColDef = {
        width: 150,
        cellStyle: {},
    };

    useEffect(() => {
        fetchRoleList();
    }, [pageNum, pageSize, searchForm]);

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
        <PageContainer title={'ロール管理'}>
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
                            source="roleName"
                            label="ロール名"
                        />
                        <FormInput
                            type={'text'}
                            source="roleKey"
                            label="ロールキー"
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
            
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="ロールリスト" border={false}>
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
                </div>
                
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<RoleData>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowTotal={total}
                        page={pageNum}
                        pagination
                        onPageChange={handlePageChange}
                        rowUniqueKey='roleId'
                        selectionMode="multiple"
                        rowHeight={35}
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
                    open={statusDialogOpen}
                    onClose={handleStatusDialogClose}
                    aria-labelledby="status-confirm-dialog-title"
                    aria-describedby="status-confirm-dialog-description"
                >
                    <DialogTitle id="status-confirm-dialog-title">ステータス変更の確認</DialogTitle>
                    <DialogContent>
                        <DialogContentText id="status-confirm-dialog-description">
                            ロールのステータスを変更しますか？
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleStatusDialogClose} color="primary">
                            キャンセル
                        </Button>
                        <Button onClick={handleConfirmStatusToggle} color="primary" autoFocus>
                            確定
                        </Button>
                    </DialogActions>
                </Dialog>
            </CustomCard>
        </PageContainer>
    );
};

export default S060;