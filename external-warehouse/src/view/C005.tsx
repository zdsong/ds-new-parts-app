import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm,
    useNotify,
    useTranslate
 } from 'react-admin';

import CustomCard from '../compontent/CustomCard'

import { useNavigate} from 'react-router-dom';

import PageContainer from '../compontent/PageContainer';

import FormInput from '../compontent/FormInput';

import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import { formatDate } from '../utils/dateUtil';

import { ColDef } from 'ag-grid-community';

// ユーザー・リストのデータ・インタフェースの定義
interface NokaSearch {
  talkTime: string;
  farmerId: string;
  farmerName: string;
  orderId: string;
  statusLabel:string;
  unreadCount: string;
  id: string; 
}

// 検索フォームのプロパティインターフェース
interface SearchFormProps {}

const C005: React.FC<SearchFormProps> = () => {
    const navigate = useNavigate();
    const notify = useNotify();
    const translate = useTranslate();
    const { request } = useApiRequest();

    const [data, setData] = useState<NokaSearch[]>([]);
    const [total, setTotal] = useState(0);
    const [pageNum, setPageNum] = useState(1);
    const [searchForm, setSearchForm] = useState<Record<string, any>>({
        orderId: '',
        farmerId: '',
        farmerName: '',
        talkTime: null,
        status: [],
        readStatus: ['0'],
        keyword: ''
    });

    const gridRef = useRef<DataGridRef<NokaSearch> | null>(null);

    const [askMessageTitleStatusData, setAskMessageTitleStatusData] = useState([]);
    const [askMessageStatusData, setAskMessageStatusData] = useState([]);
    useEffect(() => {
        const fetchCommonCode = async () => {
            try {
                const getAskMessageTitleStatusData = await request(
                        'post', 
                        'api/common/options',
                        { cmdOptionName: 'bss_ask_message_title_status' },
                        {},
                        false,
                        false
                    );

                const getAskMessageStatusData = await request(
                        'post', 
                        'api/common/options',
                        { cmdOptionName: 'bss_ask_message_status' },
                        {},
                        false,
                        false
                );
        
                setAskMessageTitleStatusData(getAskMessageTitleStatusData.data)
                setAskMessageStatusData(getAskMessageStatusData.data)
                handleSearch(searchForm)
            } catch (error) {
                console.error(error);
            }
          }
          fetchCommonCode();
      }, []);

    const handleIdClick = (farmerId: string, orderId: string) => {
        navigate(orderId ? `/C005/C006/${farmerId}/${orderId}` : `/C005/C006/${farmerId}`);
    };
    
    /**
     * 新規登録画面（C006）へ遷移
     */
    const navigateC006 = () => {
        const pageUrl = '/C005/C006/';
        window.open('#' + pageUrl, '_blank');
    }

    const searchData = async (searchData: Record<string, any>, pagination: Record<string, any>) => {
        try {
            const result = await request('post', 'api/ask/message/title/list', searchData, pagination, false, false);
            setData(result.rows);
            setTotal(result.total);
        } catch (error) {
            setData([]);
            setTotal(0);
        }
    };

    const handleSearch = async (searchForm: Record<string, any>) => {
         if(searchForm.talkTime && searchForm.talkTime.startDate && searchForm.talkTime.endDate){
            if ((new Date(searchForm.talkTime.endDate)) < (new Date(searchForm.talkTime.startDate))) {
                notify(translate('ra.message.error_date_range'), {type: 'error'})
                if (dataInputRef.current) {
                    (dataInputRef.current as any).focus();
                }
                return
            }
        }
        setSearchForm(searchForm);
        setPageNum(1);
        searchData(searchForm, { 
            current: 1, 
            pageSize: gridRef.current?.getPageSize() || 10 
        });
    };

    const handlePageChange = async (current: number, pageSize: number) => {
        setPageNum(current);
        searchData(searchForm, { current: current, pageSize: pageSize });
    };

    const dateLinkRenderer = (props: { data: NokaSearch; value: string }) => {
        const handleClick = () => {
            handleIdClick(props.data.farmerId, props.data.orderId);
        };
    
        return (
            <div onClick={handleClick} style={tableSx.linkFontColumn}>{formatDate(props.value)}</div>
        );
    };

    const columnDefs = useMemo<ColDef<NokaSearch>[]>(
        () => [
            { headerName: '受信日時', field: 'talkTime', width: 200,cellRenderer: dateLinkRenderer, sort: "desc", sortIndex: 1},
            { headerName: '農家ID', field: 'farmerId', width: 150, sort: "asc", sortIndex: 0},
            { headerName: '農家名', field: 'farmerName', width: 300},
            { headerName: '注文ID', field: 'orderId', width: 200},
            { headerName: 'ステータス', field: 'statusLabel', width: 200},
            { headerName: '未読件数', field: 'unreadCount', width: 200}
        ],
        [] 
    );

    const dataInputRef = useRef(null);

    const handleClear = () =>{
        if (dataInputRef.current) {
            (dataInputRef.current as any).clear();
        }
        setSearchForm({
            orderId: '',
            farmerId: '',
            farmerName: '',
            talkTime: null,
            status: [],
            readStatus: ['0'],
            keyword: ''
        })
    }

    return (
        <PageContainer title={'農家メッセージ一覧'}>
            <CustomCard sx={{width: '100%'}} titleVariant={'body1'} title="検索条件">
                <SimpleForm 
                    sx={formSx.formContainer} 
                    onSubmit={handleSearch} 
                    toolbar={false} 
                    defaultValues={searchForm}
                >
                    
                    <div style={formSx.form1}>
                        <FormInput
                            type={'text-halfwidth'}
                            source="orderId"
                            label="注文ID"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 20
                                }
                            }}
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                orderId: value,
                            }));}}
                        />
                        <FormInput
                            type={'text-halfwidth'}
                            source="farmerId"
                            label="農家ID"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 20
                                }
                            }}
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                farmerId: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="farmerName"
                            label="農家名"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 64
                                }
                            }}                            
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                farmerName: value,
                            }));}}
                        />
                        <FormInput
                            ref={dataInputRef}
                            type={'input-daterange'}
                            source="talkTime"
                            label="受信日"
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                    ...prev,
                                    talkTime: value,
                                }));
                             }}
                        />
                        <FormInput
                            type={'multiple-choice'}
                            choices={askMessageTitleStatusData}
                            source="status"
                            label="ステータス"
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                status: value,
                            }));}}
                        />
                         <FormInput
                            type={'multiple-choice'}
                            choices={askMessageStatusData}
                            source="readStatus"
                            label="新着"
                            onChange={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                readStatus: value,
                            }));}}
                        />
                        <FormInput
                            type={'text'}
                            source="keyword"
                            label="キーワード"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 250
                                }
                            }}                            
                            onBlur={(value)=>{setSearchForm((prev: any) => ({
                                ...prev,
                                keyword: value,
                            }));}}
                        />
                    </div>
                    <div style={buttonSx.buttonBar}>
                        <button 
                            style={buttonSx.button}  
                            type="submit"
                        >
                            検索 
                        </button>
                        <button style={{...buttonSx.button, backgroundColor: 'gray'}} type='button' onClick={handleClear}>
                            クリア
                        </button>
                    </div>
                </SimpleForm>
            </CustomCard>
            <CustomCard sx={{width: '100%'}} titleVariant={'body1'} title={'農家メッセージ一覧'} border={false}>
                <div style={{...buttonSx.buttonBar, paddingRight: '20px'}}>
                    <button 
                        style={buttonSx.button}  
                        type="button"
                        onClick={navigateC006}
                    >
                        新規メッセージ 
                    </button>
                </div>
                <div className="ag-theme-alpine" style={tableSx.tableContainer}>
                    <DataGrid<NokaSearch>
                        ref={gridRef}
                        columnDefs={columnDefs}
                        rowData={data}
                        rowTotal={total}
                        page={pageNum}
                        pagination={true}
                        onPageChange={handlePageChange}
                    />
                </div>
            </CustomCard>
        </PageContainer>
    );
};

export default C005;