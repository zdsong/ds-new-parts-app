import React, { useState, useEffect} from 'react';
import {SimpleForm, required } from 'react-admin';
import CustomCard from '../compontent/CustomCard'
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import useApiRequest from '../adapters/apiUtil';
const jobApiUrl = import.meta.env.VITE_JOB_API_URL || import.meta.env.VITE_API_URL;

interface TaskFormData {
    jobName: string;
    jobGroup: string;
    invokeTarget: string;
    cronExpression: string;
    misfirePolicy: string;
    concurrent: string;
    status:string;
}

const S091: React.FC = () => {
    const { request } = useApiRequest();
    const { jobId } = useParams<{ jobId: string }>();
    const location = useLocation();
    const [formDefaultValues, setFormDefaultValues] = useState<TaskFormData>({
        jobName: '',
        jobGroup: '',
        invokeTarget: '',
        cronExpression: '',
        misfirePolicy: '',
        concurrent: '',
        status:''
    });
    const [isEditMode, setIsEditMode] = useState(false);

    const navigate = useNavigate();

    const fetchTaskData = async (id: string) => {
        try {
            const data = await request('get', jobApiUrl+`/api/monitor/job/${id}`);
            if (data?.data) {
                setFormDefaultValues({
                    jobName: data.data.jobName || '',
                    jobGroup: data.data.jobGroup || '',
                    invokeTarget: data.data.invokeTarget || '',
                    cronExpression: data.data.cronExpression || '',
                    misfirePolicy: data.data.misfirePolicy || '',
                    concurrent: data.data.concurrent || '',
                    status: data.data.status || '',
                });
            }
        } catch (error) {
        }
    };

    useEffect(() => {
        if (location.state?.taskData) {
            const stateTaskData = location.state.taskData;
            setFormDefaultValues({
                jobName: stateTaskData.jobName || '',
                jobGroup: stateTaskData.jobGroup || '',
                invokeTarget: stateTaskData.invokeTarget || '',
                cronExpression: stateTaskData.cronExpression || '',
                misfirePolicy: stateTaskData.misfirePolicy || '0',
                concurrent: stateTaskData.concurrent || '1',
                status: stateTaskData.status || '',
            });
            setIsEditMode(true);
        } else if (jobId) {
            fetchTaskData(jobId);
            setIsEditMode(true);
        } else{
            setIsEditMode(false);
            setFormDefaultValues({
                jobName: '',
                jobGroup: '',
                invokeTarget: '',
                cronExpression: '',
                misfirePolicy: '',
                concurrent: '',
                status: '',
            });
        }

    }, [jobId, location.state]);

    const handleSubmit = async (data: any) => {
        try {
            if (isEditMode) {
                // タスクの変更
                await request('put', jobApiUrl+'/api/monitor/job', {
                    ...data,
                    jobId: jobId || location.state?.taskData?.jobId
                });
            } else {
                // 新規タスク
                await request('post', jobApiUrl+'/api/monitor/job', data);
            }
            navigate('/S090');
        } catch (error) {
        }
    };

    const handleCancel = () => {
        navigate('/S090');
    };

    const [sysJobGroup, setSysJobGroup] = useState([])

    useEffect(() => {

        const fetchCommonCode = async () => {
        try {
            const sysJobGroupData = await request(
            'post', 
            'api/common/options',
            { cmdOptionName: 'sys_job_group' },
            {},
            false,
            false
            );

            setSysJobGroup(sysJobGroupData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    return (
        <PageContainer title={isEditMode ? 'タスクの変更' : 'タスクの追加'}>
            <CustomCard sx={{width: '100%'}} titleVariant={'body1'}
            title="タスク情報"
            >
                 <SimpleForm sx={formSx.formContainer} onSubmit={handleSubmit} toolbar={false}defaultValues={formDefaultValues}>
                    <div style={formSx.form2}>
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="jobName"
                            label="タスク名"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'filter-select'}
                            source="jobGroup"
                            label="タスクグループ名"
                            choices={sysJobGroup}
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="invokeTarget"
                            label="呼び出し先文字列"
                            helperText="入力してください呼び出し先文字列"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'text'}
                            source="cronExpression"
                            label="cronExpression"
                            validate={[required()]}
                            required={true}
                            placeholder='入力する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'radio'}
                            source="concurrent"
                            label="同時実行"
                            choices={[
                                { key: '0', value: '许可' },
                                { key: '1', value: '禁止' },
                            ]}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'radio'}
                            source="status"
                            label="タスクステータス"
                            choices={[
                                { key: '0', value: '正常' },
                                { key: '1', value: '一時停止' },
                            ]}
                            validate={[required()]}
                            required={true}
                            placeholder='選択する必要があります'
                        />
                        <FormInput
                            structure='top-bottom'
                            type={'radio'}
                            source="misfirePolicy"
                            label="計画ポリシー"
                            choices={[
                                { key: '0', value: 'デフォルト' },
                                { key: '1', value: '即時実行' },
                                { key: '2', value: '1回実行' },
                                { key: '3', value: '即時実行' },
                            ]}
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

export default S091;