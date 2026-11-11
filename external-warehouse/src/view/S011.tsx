import React, { useState, useEffect } from 'react';
import { SimpleForm ,required} from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useLocation } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';

interface ParamFormData {
    configId?: string;
    configName: string;
    configKey: string;
    configValue: string;
    configTypeLabel?: string;
    remark?: string;
}

const S011: React.FC = () => {
    const { request } = useApiRequest();
    const location = useLocation();
    const [formDefaultValues, setFormDefaultValues] = useState<ParamFormData>({
        configName: '',
        configKey: '',
        configValue: '',
        configTypeLabel: undefined,
        remark: ''
    });
    const [isEditMode, setIsEditMode] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.paramData) {
            const stateParamData = location.state.paramData;
            setFormDefaultValues({
                configId: stateParamData.configId || '',
                configName: stateParamData.configName || '',
                configKey: stateParamData.configKey || '',
                configValue: stateParamData.configValue || '',
                configTypeLabel: stateParamData.configType,
                remark: stateParamData.remark || ''
            });
            setIsEditMode(true);
        } else {
            setFormDefaultValues(prev => ({
                ...prev,
                configTypeLabel: undefined
            }));
            setIsEditMode(false);
        }
    }, [location.state]);

    const handleSubmit = async (data: any) => {
        try {
            const configTypeValue = data.configTypeLabel !== undefined ? data.configTypeLabel : 'N';
      
            const paramsData = {
                configName: data.configName,
                configKey: data.configKey,
                configValue: data.configValue,
                configType: configTypeValue,
                remark: data.remark
            };
            
            if (isEditMode && location.state?.paramData?.configId) {
                await request('put', 'api/system/config', {
                    ...paramsData,
                    configId: location.state.paramData.configId
                });
            } else {
                await request('post', 'api/system/config', {
                    ...paramsData,
                    configId: Date.now()
                });
            }
            
            navigate('/S010');
        } catch (error) {
        }
    };

    const handleCancel = () => {
        navigate('/S010');
    };

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

            setFormDefaultValues(prev => ({
                ...prev,
                configTypeLabel: sysYesNoData.data?.find((item: { isDefault: string; }) => item.isDefault === 'Y')?.key,
            }));
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    return (
        <PageContainer title={isEditMode ? 'システムパラメータの変更' : '新しいシステムパラメータ'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="パラメータ情報">
                <SimpleForm
                    sx={formSx.formContainer}
                    onSubmit={handleSubmit}
                    toolbar={false}
                    defaultValues={formDefaultValues}
                    key={isEditMode ? 'edit' : 'create'}
                >
                    <div style={formSx.form2}>
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="configName"
                            label="パラメータ名"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="configKey"
                            label="パラメータキー名"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="configValue"
                            label="パラメータキー値"
                            multiline
                            sx={{
                                input: {
                                    '& .MuiInputBase-root': {
                                        height: '400px',
                                        '& .MuiInputBase-input': {
                                            height: '400px !important',
                                            overflow: 'auto !important' 
                                        }
                                    }
                                }
                            }}
                        />

                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="remark"
                            label="備考"
                            multiline
                            sx={{
                                input: {
                                    '& .MuiInputBase-root': {
                                        height: '400px',
                                        '& .MuiInputBase-input': {
                                            height: '400px !important',
                                            overflow: 'auto !important' 
                                        }
                                    }
                                }
                            }}
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'radio'}
                            source="configTypeLabel"
                            label="システム組み込み"
                            choices={sysYesNo}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
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

export default S011;