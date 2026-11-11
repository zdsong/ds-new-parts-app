import React, { useState, useEffect } from 'react';
import { SimpleForm, useNotify, required } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useLocation } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';

interface MenuFormData {
    menuId?: string;
    menuName: string;
    menuType: string;
    parentId: string;
    orderNum: string;
    path: string;
    component: string;
    query: string;
    routeName: string;
    isFrame: string;
    isCache: string;
    visible: string;
    status: string;
    perms: string;
    icon: string;
    remark: string;
}

const S051: React.FC = () => {
    const { request } = useApiRequest();
    const location = useLocation();
    const [formDefaultValues, setFormDefaultValues] = useState<MenuFormData>({
        menuName: '',
        menuType: 'C',
        parentId:'',
        orderNum: '',
        path: '',
        component: '',
        query: '',
        routeName: '',
        isFrame: '',
        isCache: '',
        visible: '',
        status: '',
        perms: '',
        icon: '',
        remark: ''
    });
    const [isEditMode, setIsEditMode] = useState(false);
    const [parentMenuOptions, setParentMenuOptions] = useState<Array<{ key: string; value: string }>>([]);
    const notify = useNotify();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.menuData) {
            const stateMenuData = location.state.menuData;
            setFormDefaultValues({
                menuId: stateMenuData.menuId || '',
                menuName: stateMenuData.menuName || '',
                menuType: 'C',
                parentId: stateMenuData.parentId?.toString() || '',
                orderNum: stateMenuData.orderNum || '',
                path: stateMenuData.path || '',
                component: stateMenuData.component || '',
                query: stateMenuData.query || '',
                routeName: stateMenuData.routeName || '',
                isFrame: stateMenuData.isFrame?.toString() || '',
                isCache: stateMenuData.isCache?.toString() || '',
                visible: stateMenuData.visible?.toString() || '',
                status: stateMenuData.status?.toString() || '',
                perms: stateMenuData.perms || '',
                icon: stateMenuData.icon || '',
                remark: stateMenuData.remark || ''
            });
            setIsEditMode(true);
        } else {
            setIsEditMode(false);
            setFormDefaultValues({
                menuName: '',
                menuType: 'C',
                parentId:'',
                orderNum: '',
                path: '',
                component: '',
                query: '',
                routeName: '',
                isFrame: '',
                isCache: '',
                visible: '',
                status: '',
                perms: '',
                icon: '',
                remark: ''
            });
        }
    }, [location.state]);

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

    const handleSubmit = async (data: any) => {
        try {
            const paramsData = {
                menuName: data.menuName,
                menuType: data.menuType,
                parentId: data.parentId ? Number(data.parentId) : null,
                orderNum: Number(data.orderNum),
                path: data.path,
                component: data.component,
                query: data.query,
                routeName: data.routeName,
                isFrame: data.isFrame,
                isCache: data.isCache,
                visible: data.visible,
                status: data.status,
                perms: data.perms,
                icon: data.icon,
                remark: data.remark
            };
            
            if (isEditMode && location.state?.menuData?.menuId) {
                await request('put', 'api/system/menu', {
                    ...paramsData,
                    menuId: Number(location.state.menuData.menuId)
                });
            } else {
                await request('post', 'api/system/menu', paramsData);
            }
            
            navigate('/S050');
        } catch (error) {
        }
    };

    const handleCancel = () => {
        navigate('/S050');
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

    const [sysShowHide, setSysShowHide] = useState([])

    useEffect(() => {

        const fetchCommonCode = async () => {
        try {
            const sysShowHideData = await request(
            'post', 
            'api/common/options',
            { cmdOptionName: 'sys_show_hide' },
            {},
            false,
            false
            );

            setSysShowHide(sysShowHideData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    const [sysYesNo, setSysYesNo] = useState([])

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

            setSysYesNo(sysYesNoData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    const renderFormFields = () => {
                return (
                    <>
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="menuName"
                            label="メニュー名"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'filter-select'}
                            source="parentId"
                            label="親メニューID"
                            choices={parentMenuOptions}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="orderNum"
                            label="表示順序"
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="path"
                            label="ルーティングアドレス"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="component"
                            label="コンポーネントパス"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="query"
                            label="ルーティングパラメータ"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="routeName"
                            label="ルート名"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'filter-select'}
                            source="isFrame"
                            label="フレーム内かどうか"
                            choices={sysYesNo}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'filter-select'}
                            source="isCache"
                            label="キャッシュするかどうか"
                            choices={sysYesNo}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'filter-select'}
                            source="visible"
                            label="表示状態"
                            choices={sysShowHide}
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
                            source="perms"
                            label="権限文字列"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="icon"
                            label="メニューICON"
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="remark"
                            label="備考"
                            multiline
                        />
                    </>
                );
    };

    return (
        <PageContainer title={isEditMode ? 'メニューの変更' : '新しいメニュー'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="メニュー情報">
                <SimpleForm
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={formDefaultValues}
                >
                    <div style={formSx.form2}>
                        {renderFormFields()}
                    </div>
                    <div style={buttonSx.buttonBar}>
                        <button
                            style={buttonSx.button}
                            type="submit"
                        >
                            確定
                        </button>
                        <button
                            style={{
                                ...buttonSx.button,
                                backgroundColor: '#f5f5f5',
                                color: '#333'
                            }}
                            type="button"
                            onClick={handleCancel}
                        >
                            キャンセル
                        </button>
                    </div>
                </SimpleForm>
            </CustomCard>
        </PageContainer>
    );
};

export default S051;