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

// 画面遷移時の状態からフォーム初期値を組み立てる
const buildFormDefaultValues = (state: any): MenuFormData => {
    if (state?.menuData) {
        const m = state.menuData;
        return {
            menuId: m.menuId != null ? String(m.menuId) : '',
            menuName: m.menuName ?? '',
            menuType: m.menuType ?? 'C',
            parentId: m.parentId != null ? String(m.parentId) : '',
            orderNum: m.orderNum != null ? String(m.orderNum) : '',
            path: m.path ?? '',
            component: m.component ?? '',
            query: m.query ?? '',
            routeName: m.routeName ?? '',
            isFrame: m.isFrame != null ? String(m.isFrame) : '',
            isCache: m.isCache != null ? String(m.isCache) : '',
            visible: m.visible != null ? String(m.visible) : '',
            status: m.status != null ? String(m.status) : '',
            perms: m.perms ?? '',
            icon: m.icon ?? '',
            remark: m.remark ?? ''
        };
    }
    // 親メニューから子メニューを追加する場合、親IDと種別を引き継ぐ
    const parentId = state?.parentId != null ? String(state.parentId) : '';
    const parentMenuType = state?.parentMenuType;
    return {
        menuName: '',
        menuType: parentId ? (parentMenuType === 'M' ? 'C' : 'F') : 'C',
        parentId,
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
    };
};

const S051: React.FC = () => {
    const { request } = useApiRequest();
    const location = useLocation();
    // 初期値は初回描画時に確定させる。
    // useEffect で setState すると SimpleForm のマウント後に defaultValues が変わり、
    // 編集時に入力欄が空のまま（＝未入力で送信され、既存値が更新されない）になるため。
    const [formDefaultValues, setFormDefaultValues] = useState<MenuFormData>(() => buildFormDefaultValues(location.state));
    const [isEditMode, setIsEditMode] = useState<boolean>(!!location.state?.menuData);
    const [parentMenuOptions, setParentMenuOptions] = useState<Array<{ key: string; value: string }>>([]);
    const notify = useNotify();
    const navigate = useNavigate();

    useEffect(() => {
        // 同一画面内で遷移状態が変わった場合のみ再適用する
        setFormDefaultValues(buildFormDefaultValues(location.state));
        setIsEditMode(!!location.state?.menuData);
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
            // メニューID／親メニューID は 19 桁の雪花IDを含むため、Number 変換すると
            // 精度が落ちて別のIDになる。文字列のまま送信すること。
            const paramsData = {
                menuName: data.menuName,
                menuType: data.menuType,
                parentId: data.parentId ? String(data.parentId) : null,
                orderNum: data.orderNum === '' || data.orderNum === undefined || data.orderNum === null
                    ? null
                    : Number(data.orderNum),
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
                    menuId: String(location.state.menuData.menuId)
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
                            type={'filter-select'}
                            source="menuType"
                            label="種別"
                            choices={[
                                { key: 'M', value: 'ディレクトリ' },
                                { key: 'C', value: 'メニュー' },
                                { key: 'F', value: 'ボタン' },
                            ]}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
                        />
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
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'filter-select'}
                            source="isCache"
                            label="キャッシュするかどうか"
                            choices={sysYesNo}
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
                    key={isEditMode ? `edit-${formDefaultValues.menuId}` : 'new'}
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