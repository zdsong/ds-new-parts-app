import React, { useMemo, useState, useEffect, useRef } from 'react';

import { SimpleForm, TextInput, useNotify } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import { ColDef } from 'ag-grid-community';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
const jobApiUrl = import.meta.env.VITE_JOB_API_URL || import.meta.env.VITE_API_URL;

interface TaskData {
    id: string;
    jobId: string;
    jobName: string;
    remark: string;
    invokeTarget: string;
    cronExpression: string;
    status: string;
    jobGroup: string;
    misfirePolicy: string;
    concurrent: string;
    createTime?: string;
    nextValidTime?: string;
    updateTime: string;
}

interface TaskDetailData {
    jobId: string;
    jobName: string;
    jobGroup: string;
    createTime: string;
    cronExpression: string;
    nextValidTime: string;
    invokeTarget: string;
    status: string;
    concurrent: string;
    misfirePolicy: string;
    updateTime: string;
}

const S090: React.FC = () => {
    const [showTaskDetail, setShowTaskDetail] = useState(false);
    const [currentTask, setCurrentTask] = useState<TaskDetailData | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusDialogJobId, setStatusDialogJobId] = useState<string>('');
    const [runOnceDialogOpen, setRunOnceDialogOpen] = useState(false);
    const [runOnceDialogJobId, setRunOnceDialogJobId] = useState<string>('');
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<TaskData[]>([]);
    const navigate = useNavigate();
    const gridRef = useRef<DataGridRef<TaskData>>(null);
    const { request } = useApiRequest();
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const notify = useNotify();

    interface SearchForm {
        jobId: string;
        jobName: string;
        status: string;
    }
    
    const [searchForm, setSearchForm] = useState<SearchForm>({
        jobId: '',
        jobName: '',
        status: ''
    });

    const handleRunOnceDialogOpen = (jobId: string) => {
        setRunOnceDialogJobId(jobId);
        setRunOnceDialogOpen(true);
    };
    
    const handleRunOnceDialogClose = () => {
        setRunOnceDialogOpen(false);
        setRunOnceDialogJobId('');
    };
    
    const handleConfirmRunOnce = async () => {
        if (!runOnceDialogJobId) return;
        
        try {
            await request ('put', jobApiUrl+'/api/monitor/job/run', { 
                    jobId: parseInt(runOnceDialogJobId),
                    misfirePolicy:'0',
                    params:{}
                });
        }catch (error){
        }
        handleRunOnceDialogClose();
    };
    
    const handleTaskDetail = (jobId: string) => {
        const taskData = fetchTaskData(jobId);
        
        if (taskData) {
            const taskDetail: TaskDetailData = {
                jobId: taskData.jobId,
                jobName: taskData.jobName,
                jobGroup: taskData.jobGroup,
                createTime: taskData.createTime || '',
                cronExpression: taskData.cronExpression,
                nextValidTime: taskData.nextValidTime || '',
                invokeTarget: taskData.invokeTarget,
                status: taskData.status,
                concurrent: taskData.concurrent,
                misfirePolicy: taskData.misfirePolicy,
                updateTime: taskData.updateTime
            };
            setCurrentTask(taskDetail);
            setShowTaskDetail(true);
        } else {
        }
    };
    
    const handleScheduleLog = () => {
        navigate('S095');
    };
    
    const handleStatusDialogOpen = (jobId: string) => {
        setStatusDialogJobId(jobId);
        setStatusDialogOpen(true);
    };
    
    const handleStatusDialogClose = () => {
        setStatusDialogOpen(false);
        setStatusDialogJobId('');
    };
    
    const handleConfirmStatusToggle = async () => {
        if (!statusDialogJobId) return;
        const task = rowData.find(t => t.jobId === statusDialogJobId);
        if (!task) {
            handleStatusDialogClose();
            return;
        }
        const currentStatus = task.status;
        const newStatus = currentStatus === '0' ? '1' : '0';

        try {
            const updatedRowData = rowData.map(t => 
                t.jobId === statusDialogJobId ? { ...t, status: newStatus } : t
            );
            setRowData(updatedRowData);
            await request('put', jobApiUrl+'/api/monitor/job/changeStatus', {
                jobId: parseInt(statusDialogJobId),
                status: newStatus
            });
            fetchTaskList();
        } catch (error) {
            setRowData(rowData.map(t => 
                t.jobId === statusDialogJobId ? { ...t, status: currentStatus } : t
            ));
        }
        handleStatusDialogClose();
    };

    const [rowData, setRowData] = useState<TaskData[]>([]);

    const fetchTaskList = async (searchData: any = null) => {
        try {
            const response = await request('get', jobApiUrl+'/api/monitor/job/list', {
                ...(searchData || searchForm),
                pageNum,
                pageSize
            });
            if (response.code === 200) {
                setRowData(response.rows);
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
            jobId: '',
            jobName: '',
            status: ''
        });
        setPageNum(1);
    };

    interface DetailLinkRendererProps {
        value: string;
        data: any;
    }

    const IdLinkRenderer = (props: DetailLinkRendererProps) => {
        const handleClick = () => {
        };

        return (
            <div onClick={handleClick} style={{ cursor: 'pointer' }}>
                {props.value}
            </div>
        );
    };

    const handleAdd = () => {
        navigate('S091');
    };

    const fetchTaskData = (jobId: string): TaskData | undefined => {
        return rowData.find(task => task.jobId === jobId);
    };

    const handleEdit = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows.length === 1) {
                const taskData = selectedRows[0];
                navigate('S091', { state: { taskData, isEdit: true } });
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
            const selectedIds = selectedRowsForDelete.map((row: TaskData) => row.jobId);
            await request('delete', jobApiUrl+`/api/monitor/job/${selectedIds.join(',')}`);
            fetchTaskList();
        } catch (error) {
        }
    };

    const handlePageChange = (current: number, pageSize: number) => {
        setPageNum(current || 1);
        setPageSize(pageSize || 10)
    };

    const columnDefs: ColDef[] = [
        { headerName: 'タスク番号', field: 'jobId', cellRenderer: IdLinkRenderer, width:110 },
        { headerName: 'タスク名', field: 'jobName', width:320 },
        { headerName: 'タスクグループ名', field: 'jobGroup', width:140 },
        { headerName: '呼び出し先文字列', field: 'invokeTarget', width:400 },
        { headerName: 'cronExpression', field: 'cronExpression', width:140},
        {
            headerName: '同時実行',
            field: 'concurrent',
            width:120,
            cellRenderer: (params: any) => (
                <span>{params.value === '0' ? '许可' : '禁止'}</span>
            ),
        },
        {
            headerName: '計画ポリシー',
            field: 'misfirePolicy',
            width:140,
            cellRenderer: (params: any) => (
                <span>
                    {params.value === '0' ? 'デフォルト' : 
                     params.value === '1' ? '即時実行' : 
                     params.value === '2' ? '1回実行' : 
                     params.value === '3' ? '即時実行' : params.value}
                </span>
            ),
        },
        {
            headerName: 'タスクステータス',
            field: 'status',
            width:150,
            cellRenderer: (params: any) => (
                <span>{params.value === '0' ? '正常' : '一時停止'}</span>
            ),
        },
        {
            headerName: '操作',
            field: 'actions',
            width:380,
            cellRenderer: (params: any) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span 
                        style={{ color: 'rgb(255, 13, 110)', cursor: 'pointer' }}
                        onClick={() => handleStatusDialogOpen(params.data.jobId )}
                    >
                        {params.data.status === '0' ? '停止' : '運行'}
                    </span>
                    <span 
                        style={{ color: 'rgb(255, 13, 110)', cursor: 'pointer' }}
                        onClick={() => handleRunOnceDialogOpen(params.data.jobId)}
                    >
                        1回実行
                    </span>
                    <span 
                        style={{ color: 'rgb(255, 13, 110)', cursor: 'pointer' }}
                        onClick={() => handleTaskDetail(params.data.jobId)}
                    >
                        タスクの詳細
                    </span>
                </div>
            ),
        },
    ];

    useEffect(() => {
        fetchTaskList();
    }, [pageNum, pageSize, searchForm]);

    const defaultColDef = useMemo(() => ({
        width: 150,
        cellStyle: {},
    }), []);

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
        <PageContainer title={'スケジュールタスク管理'}>
            {showTaskDetail && currentTask && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        width: '600px',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}>
                            <span>タスクの詳細</span>
                            <button 
                                onClick={() => setShowTaskDetail(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    color: '#999'
                                }}
                            >
                                x
                            </button>
                        </div>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '16px',
                            marginBottom: '24px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>タスク番号:</div>
                                <div>{currentTask.jobId}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>タスクグループ名:</div>
                                <div>{currentTask.jobGroup}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>タスク名:</div>
                                <div>{currentTask.jobName}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>作成日時:</div>
                                <div>{currentTask.createTime}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>cronExpression:</div>
                                <div>{currentTask.cronExpression}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>次の実行時間:</div>
                                <div>{currentTask.nextValidTime}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>呼び出し先文字列:</div>
                                <div>{currentTask.invokeTarget}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>タスクステータス:</div>
                                <div>{currentTask.status === '0' ? '正常' : '一時停止'}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>同時実行:</div>
                                <div>{currentTask.concurrent === '0' ? '许可' : '禁止'}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>計画ポリシー:</div>
                                <div>{currentTask.misfirePolicy === '0' ? 'デフォルト' : currentTask.misfirePolicy === '1' ? '即時実行' : currentTask.misfirePolicy === '2' ? '1回実行がトリガーされ' : '即時実行がトリガーされない'}</div></div>
                            </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setShowTaskDetail(false)}
                                style={{
                                    padding: '8px 24px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                            source="jobId"
                            label="タスク番号"
                        />
                        <FormInput
                            type={'text'}
                            source="jobName"
                            label="タスク名"
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
            
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="スケジュールタスクリスト" border={false}>
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
                    <button 
                        style={buttonSx.button}  
                        type="button"
                        onClick={handleScheduleLog}
                    >
                        スケジュールログ
                    </button>
                </div>
                
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<TaskData>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowTotal={total}
                        page={pageNum}
                        pagination
                        onPageChange={handlePageChange}
                        rowUniqueKey='jobId'
                        selectionMode="multiple"
                    />
                </div>

                {/* 削除確認ダイアログ */}
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

                 {/* ステータス切替確認ダイアログ */}
                 <Dialog
                     open={statusDialogOpen}
                     onClose={handleStatusDialogClose}
                     aria-labelledby="status-confirm-dialog-title"
                     aria-describedby="status-confirm-dialog-description"
                 >
                     <DialogTitle id="status-confirm-dialog-title">
                         {rowData.find(t => t.jobId === statusDialogJobId)?.status === '0' ? '停止の確認' : '開始の確認'}
                     </DialogTitle>
                     <DialogContent>
                         <DialogContentText id="status-confirm-dialog-description">
                             {rowData.find(t => t.jobId === statusDialogJobId)?.status === '0' ? 'このタスクを停止しますか？' : 'このタスクを開始しますか？'}
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
                 
                 {/* 1回実行確認ダイアログ */}
                 <Dialog
                     open={runOnceDialogOpen}
                     onClose={handleRunOnceDialogClose}
                     aria-labelledby="run-once-confirm-dialog-title"
                     aria-describedby="run-once-confirm-dialog-description"
                 >
                     <DialogTitle id="run-once-confirm-dialog-title">1回実行の確認</DialogTitle>
                     <DialogContent>
                         <DialogContentText id="run-once-confirm-dialog-description">
                             このタスクをすぐに実行しますか？
                         </DialogContentText>
                     </DialogContent>
                     <DialogActions>
                         <Button onClick={handleRunOnceDialogClose} color="primary">
                             キャンセル
                         </Button>
                         <Button onClick={handleConfirmRunOnce} color="primary" autoFocus>
                             確定
                         </Button>
                     </DialogActions>
                 </Dialog>
            </CustomCard>
        </PageContainer>
    );
};

export default S090;