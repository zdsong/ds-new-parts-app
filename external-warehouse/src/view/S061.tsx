import React, { useState, useEffect } from 'react';
import { SimpleForm, useNotify, required } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useLocation } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';
import { Box, Typography } from '@mui/material';
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
    const navigate = useNavigate();
    const notify = useNotify();

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
                    roleId: parseInt(roleId),
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
                    <div style={formSx.form1}>
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
                            type={'text'}
                            source="roleKey"
                            label="ロールキー"
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
                            type={'filter-select'}
                            source="status"
                            label="ステータス"
                            choices={sysJobStatus}
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
                    </div>
                    
                    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                        <Typography variant="h6" gutterBottom>
                            メニュー権限
                        </Typography>
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto', maxWidth: '800px' }}>
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
                        </div>
                    </div>
                    
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
        </PageContainer>
    );
};

export default S061;