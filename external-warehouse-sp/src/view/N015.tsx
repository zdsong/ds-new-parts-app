import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ColDef } from 'ag-grid-community';
import { SimpleForm } from 'react-admin';;
import { useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, pageSx, tableSx } from '../styles/commonSX';
import { Box, Typography } from '@mui/material';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import CustomModal from '../compontent/CustomModal';
import searchIcon from '../assets/icons/search-icon.png';
import { normalizeJapanesePhone } from '../utils/dataUtil';

interface NokaSearch {
  customerId: string;
  customerName: string;
  address: string;
  phoneNumber: string;
  memberId: string;
  id: string;
}
// 検索フォームのプロパティインターフェース
interface SearchFormProps { }
const N015: React.FC<SearchFormProps> = () => {

  const mockData: NokaSearch[] = [
  ];
  //初期化設定
  const [data, setData] = useState(mockData)
  // const pageSize = 20
  const [total, setTotal] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [searchForm, setSearchForm] = useState<any>({})
  const { request } = useApiRequest();
  const [formKey, setFormKey] = useState(0);
  // 2. refタイプを修正する（NokaSearch定義の後でなければならない！）
  const newGridRef = useRef<DataGridRef<NokaSearch> | null>(null);
  // ページ遷移フック
  const navigate = useNavigate();
  /**
   * 顧客IDクリック時の処理 
   */
  const handleIdClick = (id: string) => {
    navigate(`/N016/${id}`);
  };

  const [modalState, setModalState] = useState({
    open: false,
  });

  const closeModal = () => {
    setModalState({ ...modalState, open: false });
  };

  const handleToggleChat = () => {
    if (modalState.open) {
      closeModal();
    } else {
      setModalState({ ...modalState, open: true });
    }
  };

  const IdLinkRenderer = (props: { data: NokaSearch; value: string }) => {
    const handleClick = () => {
      handleIdClick(props.data.customerId);
    };

    return (
      <div style = {{width: '100%', height: '100%'}} onClick = {handleClick}>
      <span style={{ color: 'var(--mui-yamato-page-header-color)', fontWeight: 'bold', fontSize: '14px' }}>&gt;</span>
      </div>
    );
  };

  // 5. テーブル列定義
  const columnDefs = useMemo<ColDef<NokaSearch>[]>(
    () => [
      { headerName: '顧客ID', field: 'customerId' },
      { headerName: '顧客名', field: 'customerName' },
      { headerName: '電話番号',cellRenderer: (props: { value: string; })=>{return (<div>{normalizeJapanesePhone(props.value)}</div>)}, field: 'phoneNumber' },
      {
        headerName: '',
        cellStyle: { textAlign: 'center' },
        cellRenderer: IdLinkRenderer,
      },
    ],
    []
  );

  const searchData = async (searchData: Record<string, any>, pagination: Record<string, any>) => {
    const result = await request('get', 'api/customer/list', searchData, pagination)
    setData(result.rows)
    setTotal(result.total)
  }
  const handleSearch = async (searchForm: Record<string, any>) => {
    // 4. 子コンポーネントの検索方法を呼び出す（親コンポーネントの手動要求ロジックの除去）
    
    // 都道府県が空の場合は市区町村も空にする
    const processedSearchForm = { ...searchForm };
    if (!processedSearchForm.kenName) {
      processedSearchForm.cityName = '';
    }
    
    setSearchForm(processedSearchForm)
    setPageNum(1)
    searchData(processedSearchForm, { current: 1, pageSize: newGridRef.current?.getPageSize() })
    closeModal()
  };

  const handlePageChange = async (current: number, pageSize: number) => {
    setPageNum(current)
    searchData(searchForm, { current: current, pageSize: pageSize })
  };

  // 都道府県API
  const kenNameList = async () => {
    const askData = await request('get', 'api/common/ken/options',{},{},false,false);
    if (askData.data && Array.isArray(askData.data)) {
      const kenNameListChoices = askData.data.map((ask: { key: string; value: string }) => ({
        key: ask.key,
        value: ask.value
      }));

      setKenNameListChoices(kenNameListChoices);
    }
  };
  // 都道府県ドロップダウンボックスの内容を検索する
  const [kenNameListChoices, setKenNameListChoices] = useState<{ key: string; value: string; }[]>([
  ]);

  //都道府県が変更されると、市区町村 がその変更を取得します。
  const cityNameChange = async (kenName: string) => {
    setSearchForm((prev: any) => ({
      ...prev,
      kenName: kenName,
      cityName: ''
    }))
  };

  /**
   * 検索条件クリア処理
   * フォームデータ、一覧データ、ページ情報をリセット
   */
  const handleClear = async () => {
    setSearchForm({});
    setFormKey(prevKey => prevKey + 1);
    setData([]);
    setTotal(0);
    setPageNum(1);
    const defaultPageSize = newGridRef.current?.getPageSize();
    await searchData({}, { current: 1, pageSize: defaultPageSize });
  };

  const renderModalContent = () => {
    return (
      <Box sx={{
        margin: '0 20px 20px 20px',
        height: '100%'
      }}>
        <SimpleForm
          key={formKey}
          sx={formSx.formContainer}
          onSubmit={handleSearch}
          toolbar={false}
          defaultValues={searchForm}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            flex: 1,
          }}>
            <FormInput
              type={'text'}
              source="customerName"
              label="顧客名"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                customerName: value,
            }));}}
            slotProps={{
              htmlInput: {
                  maxLength: 20
              }
            }}
            />
            <FormInput
              type={'text-number'}
              source="phoneNumber"
              label="電話番号"
              format={(value: string) => {
                if (!value) return '';
                return normalizeJapanesePhone(value)
              }}
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                phoneNumber: value,
              }));}}
              slotProps={{
                htmlInput: {
                    maxLength: 13,
                }
              }}
            />

            <FormInput
              type={'text-number'}
              source="postalCode"
              label="郵便番号"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                postalCode: value,
              }));}}
              slotProps={{
                htmlInput: {
                    maxLength: 8, 
              }}}
            />
            <FormInput
              type={'text-halfwidth'}
              source="memberId"
              label="会員ID"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                memberId: value,
              }));}}
              slotProps={{
                htmlInput: {
                    maxLength: 128,
                }
              }}
            />
            <FormInput
              type={'filter-select'}
              source="kenName"
              label="都道府県"
              choices={kenNameListChoices}
              onChange={(e) => {
                cityNameChange(e.key);
              }}
            />
            <FormInput
              type="text"
              source="cityName"
              label="市区町村"
              onChange={(value)=>{
                setSearchForm((prev: any) => ({
                ...prev,
                cityName: value,
            }));}}
            />
          </div>
          <div
            style={{
              width: '100%'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '30px',
              marginTop: '20px',
            }}>
              <button style={{ ...buttonSx.button, width: '200px' }} type="submit">
                検索
              </button>
              <button style={{ ...buttonSx.button, backgroundColor: 'gray',width: '100px' }} type='button' onClick={handleClear}>
                クリア
              </button>
            </div>
          </div>
        </SimpleForm>
      </Box>
    )
  }
  useEffect(() => {
    kenNameList();
    searchData({}, { current: 1, pageSize: newGridRef.current?.getPageSize() });
  }, [])
  return (
    <Box sx={pageSx.pageContainer}>
      <Box sx={pageSx.titleContainer}>
      <label style={pageSx.title}>
          顧客マスタ
        </label>
        <Typography sx={{ display: 'flex', color: 'var(--mui-yamato-page-header-color)' }}
          component="h2"
          onClick={handleToggleChat}
        >
          <img
            src={searchIcon}
            alt="searchIcon"
            style={{ height: '20px', marginRight: '3px' }}
          />
          検索条件
        </Typography>
      </Box>
      {/*転送汎型<NokaSearch>、型が完全に一致 */}
      <div className="ag-theme-alpine" style={tableSx.tableContainer}>
        <DataGrid<NokaSearch>
          ref={newGridRef}
          columnDefs={columnDefs}
          rowData={data}
          rowTotal={total}
          page={pageNum}
          pagination={true}
          onPageChange={handlePageChange}
        />

        <CustomModal
          open={modalState.open}
          onClose={closeModal}
          maxWidth="lg"
        >
          {renderModalContent()}
        </CustomModal>
      </div>
    </Box>
  );
};
export default N015;