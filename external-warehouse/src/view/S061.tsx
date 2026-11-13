import React, { useState, useEffect } from 'react';
import { SimpleForm, useNotify, required } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useLocation } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Checkbox, ListItemText, useMediaQuery } from '@mui/material';
import CheckboxTreeSelect, { TreeSelectNode } from '../compontent/Tree';
const apiUrl = import.meta.env.VITE_API_URL;

interface RoleFormData {
    roleName: string;
    roleKey: string;
    roleSort: string;
    dataScope: string;
    status: string;
    remark: string;
    menuIds: string[];
    menuCheckStrictly: string;
}

interface RoleUser {
    userId: string;
    userName: string;
    nickName?: string;
    status?: string;
}

const userTableHeadCell: React.CSSProperties = {
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: 600,
    borderRight: '1px solid rgba(255,255,255,0.25)'
};

const userTableBodyCell: React.CSSProperties = {
    padding: '6px 8px',
    borderRight: '1px solid #eeeeee'
};

const S061: React.FC = () => {
    const { request } = useApiRequest();
    const location = useLocation();
    const [formDefaultValues, setFormDefaultValues] = useState<RoleFormData>({
        roleName: '',
        roleKey: '',
        roleSort: '0',
        dataScope: '',
        status: '',
        remark: '',
        menuIds: [],
        menuCheckStrictly: '0'
    });

    const [mockTreeData, setMockTreeData] = useState<TreeSelectNode[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [roleId, setRoleId] = useState<string>('');
    const [roleVersion, setRoleVersion] = useState<number>(0);
    const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
    // 父子連動の設定（0:連動する、1:連動しない）
    const [menuCheckStrictly, setMenuCheckStrictly] = useState<string>('0');
    // ロールに所属するユーザー一覧
    const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
    // ユーザー選択ダイアログの状態
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<RoleUser[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    // 削除対象のユーザー
    const [deleteUser, setDeleteUser] = useState<RoleUser | null>(null);
    const navigate = useNavigate();
    const notify = useNotify();
    // 画面幅が狭い場合は項目を縦に並べる
    const isNarrow = useMediaQuery('(max-width: 900px)');

    const fetchRoleData = async (id: string) => {
        try {
            const response = await request('get', `api/system/role/${id}`);
            if (response?.data) {
                const roleData = response.data;
                setFormDefaultValues({
                    roleName: roleData.roleName || '',
                    roleKey: roleData.roleKey || '',
                    roleSort: roleData.roleSort?.toString() || '0',
                    dataScope: roleData.dataScope?.toString() || '',
                    status: roleData.status || '',
                    remark: roleData.remark || '',
                    menuIds: [],
                    menuCheckStrictly: roleData.menuCheckStrictly?.toString() || '0'
                });
                setRoleId(id);
                setRoleVersion(roleData.version || 0);
                setMenuCheckStrictly(roleData.menuCheckStrictly?.toString() || '0');
            }
        } catch (error) {
        }
    };

    const fetchRoleMenus = async (id: string) => {
        try {
            if(id !== ''){
                const response = await request('get', `api/system/menu/roleMenuTreeSelect/${id}`);
                if(response?.menus){
                    setMockTreeData(response.menus);
                }
                if (response?.checkedKeys) {
                    setSelectedMenuIds(response.checkedKeys.map((id: any) => id.toString()));
                }
            } else {
                const response = await request('get', `api/system/menu/treeSelect`);
                if(response?.data){
                    setMockTreeData(response.data);
                }
            }
           
        } catch (error) {
        }
    };

    useEffect(() => {        
        if (location.state?.roleData) {
            const stateRoleData = location.state.roleData;
            setFormDefaultValues({
                roleName: stateRoleData.roleName || '',
                roleKey: stateRoleData.roleKey || '',
                roleSort: stateRoleData.roleSort?.toString() || '0',
                dataScope: stateRoleData.dataScope || '',
                status: stateRoleData.status || '',
                remark: stateRoleData.remark || '',
                menuIds: [],
                menuCheckStrictly: stateRoleData.menuCheckStrictly?.toString() || '0'
            });
            setRoleId(stateRoleData.roleId);
            setRoleVersion(stateRoleData.version || 0);
            setMenuCheckStrictly(stateRoleData.menuCheckStrictly?.toString() || '0');
            setIsEditMode(true);
            fetchRoleMenus(stateRoleData.roleId);
        } else {
            setIsEditMode(false);
            setFormDefaultValues({
                roleName: '',
                roleKey: '',
                roleSort: '0',
                dataScope: '',
                status: '',
                remark: '',
                menuIds: [],
                menuCheckStrictly: '0'
            });
            setSelectedMenuIds([]);
            setMenuCheckStrictly('0');
            fetchRoleMenus('');
        }
    }, [location.state]);

    // ロールに所属するユーザー一覧を取得
    const fetchRoleUsers = async (id: string) => {
        if (!id) {
            setRoleUsers([]);
            return;
        }
        try {
            const response = await request('get', 'api/system/role/authUser/allocatedList', {}, { roleId: id }, false);
            setRoleUsers(response?.data || []);
        } catch (error) {
            setRoleUsers([]);
        }
    };

    useEffect(() => {
        if (isEditMode && roleId) {
            fetchRoleUsers(roleId);
        }
    }, [isEditMode, roleId]);

    // ユーザー選択ダイアログを開く
    const handleOpenUserDialog = async () => {
        setSelectedUserIds([]);
        setAvailableUsers([]);
        setUserDialogOpen(true);
        try {
            const response = await request('get', 'api/system/role/authUser/unallocatedList', {}, { roleId }, false);
            setAvailableUsers(response?.data || []);
        } catch (error) {
            setAvailableUsers([]);
        }
    };

    // ユーザー選択の切り替え
    const handleToggleUser = (userId: string, checked: boolean) => {
        setSelectedUserIds((prev) => checked
            ? [...prev, userId]
            : prev.filter((id) => id !== userId));
    };

    // 選択したユーザーをロールに追加
    const handleAddUsers = async () => {
        if (selectedUserIds.length === 0) return;
        try {
            await request('post', 'api/system/role/authUser', { roleId, roleIds: selectedUserIds });
            setUserDialogOpen(false);
            // 追加後、ロール所属ユーザー一覧を即時更新する
            await fetchRoleUsers(roleId);
        } catch (error) {
        }
    };

    // 選択したユーザーをロールから削除
    const handleConfirmDeleteUser = async () => {
        if (!deleteUser) return;
        try {
            await request('post', 'api/system/role/authUser/delete', { roleId, userId: deleteUser.userId });
            setDeleteUser(null);
            // 削除後、ロール所属ユーザー一覧を即時更新する
            await fetchRoleUsers(roleId);
        } catch (error) {
        }
    };

    const handleSubmit = async (data: any) => {
        try {
            const roleData = {
                ...data,
                roleSort: parseInt(data.roleSort || '0'), // 数値型に変換する
                dataScope: data.dataScope || '1', // デフォルト値を保証する
                status: data.status || '0', // デフォルト値を保証する
                menuIds: selectedMenuIds,
                menuCheckStrictly: parseInt(menuCheckStrictly || '0')
            };
            
            if (isEditMode) {
                await request('put', 'api/system/role', {
                    ...roleData,
                    roleId: roleId,
                    version: roleVersion
                });
            } else {
                await request('post', 'api/system/role', roleData);
            }
            navigate('/S060');
        } catch (error) {
        }
    };

    const handleBack = () => {
        navigate('/S060');
    };

    const handleSelectedItemsChange = (
        event: React.SyntheticEvent<Element, Event> | null,
        itemIds: string[]
    ) => {
        setSelectedMenuIds(itemIds);
    };

    const handleTreeSelectChange = (selectedValue: string | string[] | null) => {
        if (Array.isArray(selectedValue)) {
            setSelectedMenuIds(selectedValue);
        }
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
        <PageContainer title={isEditMode ? 'ロール編集' : 'ロール新規作成'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="ロール情報" border={false}>
                <SimpleForm 
                    sx={formSx.formContainer} 
                    onSubmit={handleSubmit} 
                    toolbar={false}
                    defaultValues={formDefaultValues}
                >
                    <Box sx={{
                        display: 'flex',
                        flexDirection: isNarrow ? 'column' : 'row',
                        gap: isNarrow ? 0 : '5rem',
                        width: '100%'
                    }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <FormInput
                                structure='top-bottom'
                                type={'text'}
                                source="roleName"
                                label="ロール名"
                                validate={[required()]}
                                required={true}
                                placeholder='入力する必要があります'
                            />
                            <FormInput
                                structure='top-bottom'
                                type={'number'}
                                source="roleSort"
                                label="表示順序"
                            />
                            <FormInput
                                structure='top-bottom'
                                type={'filter-select'}
                                source="status"
                                label="ステータス"
                                choices={sysJobStatus}
                                validate={[required()]}
                                required={true}
                                placeholder='選択する必要があります'
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <FormInput
                                structure='top-bottom'
                                type={'text'}
                                source="roleKey"
                                label="ロールキー"
                                validate={[required()]}
                                required={true}
                                placeholder='入力する必要があります'
                            />
                            <FormInput
                                structure='top-bottom'
                                type={'filter-select'}
                                source="dataScope"
                                label="データ範囲"
                                choices={[
                                    { key: '1', value: 'すべてのデータ権限' },
                                    { key: '2', value: 'カスタムデータ権限' },
                                    { key: '3', value: '自部門データ権限' },
                                    { key: '4', value: '自部門および以下データ権限' },
                                    { key: '5', value: '自分自身のデータ権限' },
                                ]}
                                validate={[required()]}
                                required={true}
                                placeholder='選択する必要があります'
                            />
                            <FormInput
                                structure='top-bottom'
                                type={'text'}
                                source="remark"
                                label="備考"
                            />

                            {isEditMode && (
                                <Box sx={{
                                    width: '100%',
                                    marginTop: '8px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        backgroundColor: '#f5f5f5'
                                    }}>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            ユーザー情報
                                        </Typography>
                                        <Button variant="contained" size="small" onClick={handleOpenUserDialog}>
                                            ユーザー追加
                                        </Button>
                                    </Box>
                                    {roleUsers.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ padding: '16px' }}>
                                            該当するユーザーはいません。
                                        </Typography>
                                    ) : (
                                        <Box sx={{ maxHeight: '360px', overflowY: 'auto', overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#2f8ee5', color: '#ffffff' }}>
                                                        <th style={userTableHeadCell}>ユーザーID</th>
                                                        <th style={userTableHeadCell}>ユーザー名</th>
                                                        <th style={userTableHeadCell}>ニックネーム</th>
                                                        <th style={userTableHeadCell}>操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {roleUsers.map((user) => (
                                                        <tr key={user.userId} style={{ borderBottom: '1px solid #eeeeee' }}>
                                                            <td style={userTableBodyCell}>{user.userId}</td>
                                                            <td style={userTableBodyCell}>{user.userName}</td>
                                                            <td style={userTableBodyCell}>{user.nickName}</td>
                                                            <td style={userTableBodyCell}>
                                                                <span
                                                                    style={{ color: '#ff0d6e', cursor: 'pointer' }}
                                                                    onClick={() => setDeleteUser(user)}
                                                                >
                                                                    削除
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>
                    
                    <Box sx={{ marginTop: '20px', marginBottom: '20px' }}>
                        <Typography variant="h6" gutterBottom>
                            メニュー権限
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <CheckboxTreeSelect
                                treeData={mockTreeData}
                                mode="multiple"
                                defaultValue={selectedMenuIds}
                                onChange={handleTreeSelectChange}
                                defaultExpandedItems={['1', '900']}
                                showToolbar={true}
                                checkStrictly={menuCheckStrictly === '1'}
                                onCheckStrictlyChange={(strictly) => setMenuCheckStrictly(strictly ? '1' : '0')}
                            />
                        </Box>
                    </Box>
                    
                    <div style={buttonSx.buttonBar}>
                        <button 
                            style={buttonSx.button}  
                            type="submit"
                        >
                            {isEditMode ? '更新' : '登録'}
                        </button>
                        <button 
                            style={buttonSx.button}
                            type="button"
                            onClick={handleBack}
                        >
                            戻る
                        </button>
                    </div>
                </SimpleForm>
            </CustomCard>

            <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>ユーザー選択</DialogTitle>
                <DialogContent dividers>
                    {availableUsers.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            追加可能なユーザーはいません。
                        </Typography>
                    ) : (
                        <Box sx={{ maxHeight: '320px', overflowY: 'auto' }}>
                            {availableUsers.map((user) => (
                                <Box key={user.userId} sx={{ display: 'flex', alignItems: 'center', paddingY: '2px' }}>
                                    <Checkbox
                                        checked={selectedUserIds.includes(user.userId)}
                                        onChange={(event) => handleToggleUser(user.userId, event.target.checked)}
                                    />
                                    <ListItemText
                                        primary={`${user.userName}${user.nickName ? `（${user.nickName}）` : ''}`}
                                        secondary={`ユーザーID: ${user.userId}`}
                                    />
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUserDialogOpen(false)}>キャンセル</Button>
                    <Button onClick={handleAddUsers} disabled={selectedUserIds.length === 0}>追加</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteUser !== null} onClose={() => setDeleteUser(null)}>
                <DialogTitle>削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        選択したユーザーをロールから削除しますか？
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteUser(null)}>キャンセル</Button>
                    <Button onClick={handleConfirmDeleteUser} color="primary" autoFocus>
                        確定
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};

export default S061;