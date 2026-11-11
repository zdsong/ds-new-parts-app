import React, { useState, useEffect } from 'react';
import { SimpleForm, useNotify, required } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useLocation } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';

interface DictDetailFormData {
    dictCode?: string;
    dictLabel: string;
    dictValue: string;
    dictSort: string;
    status: string;
    isDefault: string;
    remark?: string;
    dictType: string;
}

const S023: React.FC = () => {
    const { request } = useApiRequest();
    const location = useLocation();
    const [formDefaultValues, setFormDefaultValues] = useState<DictDetailFormData>({
        dictLabel: '',
        dictValue: '',
        dictSort: '0',
        status: '0',
        isDefault:'',
        remark: '',
        dictType: ''
    });
    const [isEditMode, setIsEditMode] = useState(false);

    const navigate = useNavigate();
    const notify = useNotify();

    useEffect(() => {
        if (location.state?.dictData) {
            const stateDictData = location.state.dictData;
            setFormDefaultValues({
                dictCode: stateDictData.dictCode || '',
                dictLabel: stateDictData.dictLabel || '',
                dictValue: stateDictData.dictValue || '',
                dictSort: stateDictData.dictSort?.toString() || '0',
                status: stateDictData.status?.toString() || '0',
                isDefault:stateDictData.isDefault || '',
                remark: stateDictData.remark || '',
                dictType: stateDictData.dictType || ''
            });
            setIsEditMode(true);
        } else if (location.state?.dictType) {
            setFormDefaultValues({
                dictLabel: '',
                dictValue: '',
                dictSort: '0',
                status: '0',
                isDefault: '',
                remark: '',
                dictType: location.state.dictType
            });
            setIsEditMode(false);
        } else {
            setIsEditMode(false);
            setFormDefaultValues({
                dictLabel: '',
                dictValue: '',
                dictSort: '0',
                status: '0',
                isDefault:'',
                remark: '',
                dictType: ''
            });
        }

    }, [location.state]);

    const handleSubmit = async (data: any) => {
        try {
            const currentDictType = formDefaultValues.dictType;
            const paramsData = {
                dictLabel: data.dictLabel,
                dictValue: data.dictValue,
                dictSort: data.dictSort,
                status: data.status,
                isDefault: data.isDefault,
                remark: data.remark,
                dictType: currentDictType
            };
            
            if (isEditMode && data.dictCode) {
                await request('put', 'api/system/dict/data', {
                    ...paramsData,
                    dictCode: data.dictCode
                });
            } else {
                await request('post', 'api/system/dict/data', paramsData);
            }
            
            navigate('/S020/S022', { state: { dictType: currentDictType } });
        } catch (error) {
        }
    };

    const handleCancel = () => {
        navigate('/S020/S022', { state: { dictType: formDefaultValues.dictType } });
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
        <PageContainer title={isEditMode ? '辞書明細の変更' : '新しい辞書明細'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="辞書明細情報">
                <SimpleForm
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={formDefaultValues}
                >
                    <div style={formSx.form2}>
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="dictLabel"
                            label="辞書ラベル"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="dictValue"
                            label="辞書キー値"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'number'}
                            source="dictSort"
                            label="辞書ソート"
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
                            type={'filter-select'}
                            source="isDefault"
                            label="デフォルト"
                            choices={[
                                { key: 'Y', value: 'Yes' },
                                { key: 'N', value: 'No' },
                            ]}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="dictType"
                            label="辞書の種類"
                            disabled
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="remark"
                            label="備考"
                            multiline
                        />
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

export default S023;