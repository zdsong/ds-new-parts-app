import React, { useState, useEffect } from 'react';
import { SimpleForm, useNotify, required } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useLocation } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';

interface DictFormData {
    dictId?: string;
    dictName: string;
    dictType: string;
    status: string;
    remark?: string;
}

const S021: React.FC = () => {
    const { request } = useApiRequest();
    const location = useLocation();
    const [formDefaultValues, setFormDefaultValues] = useState<DictFormData>({
        dictName: '',
        dictType: '',
        status: '',
        remark: ''
    });
    const [isEditMode, setIsEditMode] = useState(false);
    const notify = useNotify();

    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.dictData) {
            const stateDictData = location.state.dictData;
            setFormDefaultValues({
                dictId: stateDictData.dictId || '',
                dictName: stateDictData.dictName || '',
                dictType: stateDictData.dictType || '',
                status: stateDictData.status?.toString() || '',
                remark: stateDictData.remark || ''
            });
            setIsEditMode(true);
        } else {
            setIsEditMode(false);
            setFormDefaultValues({
                dictName: '',
                dictType: '',
                status: '',
                remark: ''
            });
        }

    }, [location.state]);

    const handleSubmit = async (data: any) => {
        try {
            const paramsData = {
                dictName: data.dictName,
                dictType: data.dictType,
                status: data.status,
                remark: data.remark
            };
            
            if (isEditMode && location.state?.dictData?.dictId) {
                await request('put', 'api/system/dict/type', {
                    ...paramsData,
                    dictId: Number(location.state.dictData.dictId)
                });
            } else {
                await request('post', 'api/system/dict/type',
                    paramsData);
            }
            
            navigate('/S020');
        } catch (error) {
        }
    };

    const handleCancel = () => {
        navigate('/S020');
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
        <PageContainer title={isEditMode ? '辞書の変更' : '新しい辞書'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="辞書情報">
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
                            source="dictName"
                            label="辞書名"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="dictType"
                            label="辞書の種類"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
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

export default S021;