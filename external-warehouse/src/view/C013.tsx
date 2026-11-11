import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import {SimpleForm } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';

// ユーザー・リストのデータ・インタフェースの定義
interface UserSearch {
  userId: string;
  userName: string;
  nickName: string;
  status: any;
  statusLabel: string;
  roleLabel: string;
  roleId: any;
  id: string;
}

// 検索フォームのプロパティインターフェース
interface SearchFormProps {}

// ユーザ管理画面コンポーネント
const C013: React.FC<SearchFormProps> = () => {
  const navigate = useNavigate();
  const { request } = useApiRequest();

  // テーブルデータ関連ステータスの初期化
  const [data, setData] = useState<UserSearch[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [searchForm, setSearchForm] = useState<any>({
    uesrId: '',
    userName: '',
    roleId: [],
    status: []
  });
  
  const newGridRef = useRef<DataGridRef<UserSearch> | null>(null);

  /**
   * APIを呼び出してユーザーリストデータを取得する
   */
  const searchData = async (searchData: Record<string, any>, pagination: Record<string, any>) => {
    setData([]);
    const result = await request('get', 'api/system/user/list', searchData, pagination);
    setData(result.rows);
    setTotal(result.total);
  };

  /**
   * 検索フォーム送信時の処理
   */
  const handleSearch = async (formData: Record<string, any>) => {
    setSearchForm(formData)
    const formattedSearch = {
      ...formData,
      roleId: Array.isArray(formData.roleId) ? formData.roleId.join(',') : formData.roleId || '',
      status: Array.isArray(formData.status) ? formData.status.join(',') : formData.status || ''
    };
    setPageNum(1);
    searchData(formattedSearch, { current: 1, pageSize: newGridRef.current?.getPageSize() });
  };

  /**
   * ページング変更処理方法
   */
  const handlePageChange = async (current: number, pageSize: number) => {
    setPageNum(current);
    searchData(searchForm, { current: current, pageSize: pageSize });
  };

  /**
   * ユーザIDクリック時の処理
   */
  const handleIdClick = (userId: string) => {
    navigate(`/C013/C014/${userId}`);
  };

  /**
   * 新規登録画面（C015）へ遷移
   */
  const navigateC015 = () => {
    navigate(`/C013/C015`);
  };

  /**
   * ユーザID列のカスタムレンダラー
   */
  const IdLinkRenderer = (props: { data: UserSearch; value: string }) => {
    const handleClick = () => {
      handleIdClick(props.data.userId);
    };

    return (
      <div onClick={handleClick} style={tableSx.linkFontColumn}>
        {props.value}
      </div>
    );
  };

  // テーブル列定義
  const columnDefs = useMemo<ColDef<UserSearch>[]>(
    () => [
      { headerName: 'ユーザID', field: 'userName', cellRenderer: IdLinkRenderer, width: 600, sort: "asc" },
      { headerName: 'ユーザ名', field: 'nickName', width: 300 },
      { headerName: '権限', field: 'roleLabel', width: 150 },
      { headerName: '利用状態', field: 'statusLabel', width: 150 },
    ],
    []
  );

  // 利用状態の選択肢定義
  const [sysUsageStatus, setSysUsageStatus] = useState([])

  useEffect(() => {

      const fetchCommonCode = async () => {
      try {
          const sysUsageStatusData = await request(
          'post', 
          'api/common/options',
          { cmdOptionName: 'sys_usage_status' },
          {},
          false,
          false
          );

          setSysUsageStatus(sysUsageStatusData.data)

          setSearchForm((prev: any) =>({
            ...prev,
            status: prev.status ? prev.status : sysUsageStatusData.data?.filter((item: { isDefault: string; }) => item.isDefault === 'Y')?.map((item: { key: any; }) => item.key),
        }))
      } catch (error) {
          console.error(error);
      }
      }
      fetchCommonCode();
  }, []);

  const handleClear = () =>{
    setSearchForm({
      status: sysUsageStatus.filter((item: { isDefault: string; }) => item.isDefault === 'Y')?.map((item: { key: any; }) => item.key),
    })
  }

  return (
    <PageContainer title={'ユーザ管理'}>
      <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="検索条件">
        <SimpleForm
          sx={formSx.formContainer}
          onSubmit={handleSearch}
          toolbar={false}
          defaultValues={searchForm}
        >
          <div style={formSx.form1}>
            <FormInput
              type={'text-halfwidth'}
              source="userName"
              label="ユーザID"
              slotProps={{
                htmlInput: {
                    maxLength: 20
                }
              }}
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                userName: value,
            }));}}
            />
            <FormInput
              type={'text'}
              source="nickName"
              label="ユーザ名"
              slotProps={{
                htmlInput: {
                    maxLength: 128
                }
              }}
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                nickName: value,
            }));}}
            />
            <FormInput
              type={'multiple-choice'}
              choices={[
                { key: '2', value: '一般' },
                { key: '3', value: '管理者' },
              ]}
              source="roleId"
              label="権限"
              onChange={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                roleId: value,
            }));}}
            />
            <FormInput
              type={'multiple-choice'}
              choices={sysUsageStatus}
              source="status"
              label="利用状態"
              onChange={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                status: value,
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

      <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title={'ユーザ一覧'} border={false}>
        <div style={{...buttonSx.buttonBar, paddingRight: '20px'}}>
          <button
            style={buttonSx.button}
            type="button"
            onClick={navigateC015}
          >
            新規登録
          </button>
        </div>

        <div className="ag-theme-alpine" style={tableSx.tableContainer}>
          <DataGrid<UserSearch>
            ref={newGridRef}
            columnDefs={columnDefs}
            rowData={data}
            rowTotal={total}
            page={pageNum}
            pagination={true}
            rowUniqueKey="userId"
            onPageChange={handlePageChange}
          />
        </div>
      </CustomCard>
    </PageContainer>
  );
};

export default C013;