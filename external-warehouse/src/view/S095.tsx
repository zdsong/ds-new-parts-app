import React, { useState, useRef, useEffect} from 'react';
import { SimpleForm, useNotify, useTranslate } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import { ColDef } from 'ag-grid-community';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import { Schedule } from '@mui/icons-material';
import useApiRequest from '../adapters/apiUtil';
import { useNavigate } from 'react-router-dom';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
const jobApiUrl = import.meta.env.VITE_JOB_API_URL || import.meta.env.VITE_API_URL;

interface ScheduleLogData {
    id:string;
    jobLogId: string;
    jobName: string;
    jobGroup: string;
    invokeTarget: string;
    jobMessage: string;
    status: string;
    elapsedTime: number;
    exceptionInfo: string;
    createTime: any;
}

interface SearchForm {
    jobName: string;
    jobGroup: string;
    status: string;
    createTime:{ startDate?: string; endDate?: string };
}
const S095: React.FC = () => {
    const gridRef = useRef<DataGridRef<ScheduleLogData>>(null);
    const [showLogDetail, setShowLogDetail] = useState(false);
    const [currentLog, setCurrentLog] = useState<ScheduleLogData | null>(null);
    const [rowData, setRowData] = useState<ScheduleLogData[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pageNum, setPageNum] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [searchParams, setSearchParams] = useState<SearchForm>({
        jobName: '',
        jobGroup: '',
        status: '',
        createTime: {}
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<ScheduleLogData[]>([]);
    const { request } = useApiRequest();
    const navigate = useNavigate();
    const notify = useNotify();
    const createTimeRef = useRef(null);
    const translate = useTranslate();

    const fetchLogList = async (searchParamsArg?: any, pagination?: any) => {        
        try {
            let params = { ...(searchParamsArg || searchParams) };
            if(params.createTime){
                const { createTime, ...otherParams } = params;

                params = { ...otherParams };
                
                if (createTime.startDate) {
                    params.startTime = createTime.startDate;
                }
                
                if (createTime.endDate) {
                    params.endTime = createTime.endDate;
                }
            }
            const currentPage = pagination?.current || pageNum;
            const pageSize = pagination?.pageSize || 10;           
            const response = await request('get', jobApiUrl+'/api/monitor/jobLog/list', params, {
                current: currentPage,
                pageSize: pageSize
            });
            if (response.code === 200) {
                const formattedData = (response.rows || []).map((item: any) => ({
                    ...item,
                    id: item.jobLogId?.toString() || '',
                }));
                setRowData(formattedData);
                setTotal(response.total || 0);
            }
        } catch (error) {
        }
    };

    const handleSearch = async(searchData: any) => {
        if(searchParams.createTime && searchParams.createTime.startDate && searchParams.createTime.endDate){
            if ((new Date(searchParams.createTime.endDate)) < (new Date(searchParams.createTime.startDate))) {
                notify(translate('ra.message.error_date_range'), {type: 'error'})
                if (createTimeRef.current) {
                    (createTimeRef.current as any).focus();
                }
                return
            }
        }
        setSearchParams(searchData);
        setPageNum(1);
    };

    const handleDeleteClick = () => {
        if (gridRef.current) {
            const selectedRows = gridRef.current.getSelectedRows();
            if (selectedRows && selectedRows.length > 0) {
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
        if (selectedRowsForDelete.length > 0) {
            const selectedIds = selectedRowsForDelete.map((row: ScheduleLogData) => row.jobLogId).join(',');
            try {
                await request('delete', jobApiUrl+`/api/monitor/jobLog/${selectedIds}`);
                fetchLogList();
            } catch (error) {
            }
        }
    };

    const handleClearClick = () => {
        setClearDialogOpen(true);
    };

    const handleCloseClearDialog = () => {
        setClearDialogOpen(false);
    };

    const handleConfirmClear = async () => {
        handleCloseClearDialog();
        try {
            await request('delete', jobApiUrl+'/api/monitor/jobLog/clean', {}, {});
            fetchLogList();
        } catch (error) {
        }
    };

    const handleLogDetail = (jobLogId: string) => {
        const log = rowData.find((log: ScheduleLogData) => log.jobLogId === jobLogId);
        if (log) {
            setCurrentLog(log);
            setShowLogDetail(true);
        }
    };

    const handlePageChange = (current: number, pageSize: number) => {
        setPageNum(current || 1);
        setPageSize(pageSize || 10)
    };

    useEffect(() => {
        fetchLogList();
    }, [searchParams, pageNum, pageSize]);

    const columnDefs: ColDef[] = [
        { headerName: 'ログ番号', field: 'jobLogId', width: 100 },
        { headerName: 'タスク名', field: 'jobName', width: 300 },
        { headerName: 'タスクグループ名', field: 'jobGroup', width: 150 },
        { headerName: 'ターゲット文字列', field: 'invokeTarget', width: 250 },
        {
            headerName: '実行ステータス', 
            field: 'status', 
            width: 150,
            cellRenderer: (params: any) => (
                <span style={{ 
                    color: params.value === '0' ? '#52c41a' : '#f5222d' 
                }}>
                    {params.value === '0' ? '成功' : '失敗'}
                </span>
            )
        },
        {
            headerName: '例外情報', 
            field: 'exceptionInfo', 
            width: 300,
            cellRenderer: (params: any) => (
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {params.value || '無'}
                </div>
            )
        },
        { 
            headerName: '作成日時', 
            field: 'createTime', 
            width: 180,
        },
        {
            headerName: '操作',
            field: 'actions',
            width: 100,
            cellRenderer: (params: any) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span 
                        style={{ color: 'rgb(255, 13, 110)', cursor: 'pointer' }}
                        onClick={() => handleLogDetail(params.data.jobLogId)}
                    >
                        ログの詳細
                    </span>
                </div>
            ),
        },
    ];

    const defaultColDef = {
        width: 150,
        cellStyle: {},
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

    const [sysCommonStatus, setSysCommonStatus] = useState([])

    useEffect(() => {

        const fetchCommonCode = async () => {
        try {
            const sysCommonStatusData = await request(
            'post', 
            'api/common/options',
            { cmdOptionName: 'sys_common_status' },
            {},
            false,
            false
            );

            setSysCommonStatus(sysCommonStatusData.data)
        } catch (error) {
            console.error(error);
        }
        }
        fetchCommonCode();
    }, []);

    return (
        <PageContainer title={'スケジュールログ'}>
            {showLogDetail && currentLog && (
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
                            <span>ログの詳細</span>
                            <button 
                                onClick={() => setShowLogDetail(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    color: '#999'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '16px',
                            marginBottom: '24px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>ログ番号:</div>
                                <div>{currentLog.jobLogId}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>タスクグループ名:</div>
                                <div>{currentLog.jobGroup}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>タスク名:</div>
                                <div>{currentLog.jobName}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>ターゲット文字列:</div>
                                <div>{currentLog.invokeTarget}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>実行ステータス:</div>
                                <div style={{ 
                                    color: currentLog.status === '0' ? '#52c41a' : '#f5222d' 
                                }}>
                                    {currentLog.status === '0' ? '正常' : '失敗'}
                            </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>タスク情報:</div>
                                <div>{currentLog.jobMessage || '无'}</div>
                            </div>
                            {currentLog.exceptionInfo && (
                            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>例外情報:</div>
                                <div style={{ color: '#f5222d', whiteSpace: 'pre-wrap' }}>{currentLog.exceptionInfo}</div>
                            </div>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setShowLogDetail(false)}
                                style={{
                                    padding: '8px 24px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                閉める
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件" border={false}>
                <SimpleForm sx={formSx.formContainer} onSubmit={handleSearch} toolbar={false} values={searchParams}>
                    <div style={formSx.form1}>
                        <FormInput
                            type={'text'}
                            source="jobName"
                            label="タスク名"
                        />
                        <FormInput
                            type={'filter-select'}
                            source="jobGroup"
                            label="グループ名"
                            choices={sysJobGroup}
                        />
                        <FormInput
                            type={'filter-select'}
                            source="status"
                            label="実行ステータス"
                            choices={sysCommonStatus}
                        />
                        <FormInput
                            ref={createTimeRef}
                            type={'input-daterange'}
                            source="createTime"
                            label="実行時間"
                        />
                        <div></div>
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
                                onClick={() => {
                                        if (createTimeRef.current) {
                                            (createTimeRef.current as any).clear();
                                        }
                                        setSearchParams({
                                            jobName: '',
                                            jobGroup: '',
                                            status: '',
                                            createTime: {}
                                        });                                        
                                        setPageNum(1);
                                    }}
                            >
                                リセット
                            </button>
                        </div>
                    </div>
                    <div style={formSx.form2}>

                    </div>
                </SimpleForm>
            </CustomCard>
            
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="スケジュール・ログ・リスト" border={false}>
                <div style={buttonSx.buttonBar}>
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
                        onClick={handleClearClick}
                    >
                        空にする
                    </button>
                    <button 
                        style={buttonSx.button}  
                        type="button"
                        onClick={() => navigate('/S090')}
                    >
                        戻る
                    </button>
                </div>
                
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<ScheduleLogData>
                    ref={gridRef}
                    columnDefs={columnDefs}
                    rowData={rowData}
                    rowTotal={total}
                    page={pageNum}
                    pagination
                    onPageChange={handlePageChange}
                    rowUniqueKey='jobLogId'
                    selectionMode="multiple"
                    rowHeight={35}                    
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

            {/* 確認ダイアログのクリア */}
            <Dialog
                open={clearDialogOpen}
                onClose={handleCloseClearDialog}
                aria-labelledby="clear-confirm-dialog-title"
                aria-describedby="clear-confirm-dialog-description"
            >
                <DialogTitle id="clear-confirm-dialog-title">清空の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText id="clear-confirm-dialog-description">
                        すべてのログデータを削除しますか？この操作は元に戻すことができません。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseClearDialog} color="primary">
                        キャンセル
                    </Button>
                    <Button onClick={handleConfirmClear} color="primary" autoFocus>
                        確定
                    </Button>
                </DialogActions>
            </Dialog>
            </CustomCard>
        </PageContainer>
    );
};

export default S095;