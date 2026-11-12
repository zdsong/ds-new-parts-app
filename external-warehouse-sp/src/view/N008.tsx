import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ColDef } from 'ag-grid-community';
import { SimpleForm } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, pageSx, tableSx } from '../styles/commonSX';
import { Box, Typography } from '@mui/material';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import searchIcon from '../assets/icons/search-icon.png';
import CustomModal from '../compontent/CustomModal';

interface NokaSearch {
  itemId: string;
  itemName: string;
  janCode: string;
  dlvdeliveryFlg: string;
  sumarejiItemId: string;
  category1: string;
  category2: string;
  salesFlg: number;
  confirmFlg: number;
  salesPrice: number;
  reqCropYield: string;
  arrow: string;
  id: string;
}

// 検索フォームのプロパティインターフェース（onSubmit 不要、内部で処理）
interface SearchFormProps { }

// 農家管理画面コンポーネント 
const N008: React.FC<SearchFormProps> = () => {
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
  const newGridRef = useRef<DataGridRef<NokaSearch> | null>(null);
  // ページ遷移フック
  const navigate = useNavigate();

  /**
   * 商品IDクリック時の処理
   */
  const handleIdClick = (id: string) => {
    navigate(`/N010/${id}`);
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
  /**
   * 金額列のカスタムレンダラー（￥記号とカンマ区切り）
   */
  const CurrencyRenderer = (props: { value: number }) => {
    // 金額書式設定：￥記号と千桁カンマを追加
    const formattedValue = props.value ? `￥${props.value.toLocaleString('ja-JP')}` : '￥0';
    return <div>{formattedValue}</div>;
  };

  const IdLinkRenderer = (props: { data: NokaSearch; value: string }) => {
    const handleClick = () => {
      handleIdClick(props.data.itemId);
    };

    return (
      <div style = {{width: '100%', height: '100%'}} onClick = {handleClick}>
      <span style={{ color: 'var(--mui-page-header-color)', fontWeight: 'bold', fontSize: '14px' }}>&gt;</span>
      </div>
    );
  };

  // 5. テーブル列定義 
  const columnDefs = useMemo<ColDef<NokaSearch>[]>(
    () => [
      { headerName: 'ID', width: 60, field: 'itemId' },
      { headerName: '商品名', field: 'itemName', cellRenderer: (params: any) => <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{params.value}</div> },
      { headerName: '金額',width: 100, field: 'salesPrice', cellStyle: { textAlign: 'right' }, cellRenderer: CurrencyRenderer },
      {
        headerName: '',
        width: 50,
        cellRenderer: IdLinkRenderer,
        cellStyle: { textAlign: 'center' },
      },
    ],
    []
  );

  const searchData = async (searchData: Record<string, any>, pagination: Record<string, any>) => {
    const result = await request('get', 'api/item/list', searchData, pagination)
    setData(result.rows)
    setTotal(result.total)
  }

  const handleSearch = async (searchForm: Record<string, any>) => {
    // 4. 子コンポーネントの検索方法を呼び出す（親コンポーネントの手動要求ロジックの除去）
    setSearchForm(searchForm)
    setPageNum(1)
    searchData(searchForm, { current: 1, pageSize: newGridRef.current?.getPageSize() })
    closeModal()
  };

  const handlePageChange = async (current: number, pageSize: number) => {
    setPageNum(current)
    searchData(searchForm, { current: current, pageSize: pageSize })
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

  useEffect(() => {
    searchData({}, { current: 1, pageSize: newGridRef.current?.getPageSize() });
  }, [])

  const renderModalContent = () => {
    return (
      <Box sx={{
        margin: '0 20px 20px 20px',
        height: '100%'
      }}>
        <SimpleForm
          key={formKey}
          sx={formSx.formContainer}
          onSubmit={handleSearch} // バインド修正後の検索方法
          toolbar={false}
          defaultValues={searchForm} // 安定したデフォルト値の使用
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            flex: 1,
          }}>
           <FormInput
              type={'text'}
              source="itemName"
              label="商品名"
              sx={{
                gridColumn: "1 / 3"
              }}
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                itemName: value,
            }));}}
            />
            <FormInput
              type={'text'}
              source="itemId"
              label="商品ID"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                itemId: value,
            }));}}
            />
            <div></div>
            <FormInput
              type={'text'}
              source="janCode"
              label="JANコード"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                janCode: value,
            }));}}
            />
            <FormInput
              type={'text'}
              source="sumarejiItemId"
              label="スマレジ商品ID"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                sumarejiItemId: value,
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
  return (
    <Box sx={pageSx.pageContainer}>
      <Box sx={pageSx.titleContainer}>
      <label style={pageSx.title}>
          商品マスタ
        </label>
        <Typography sx={{ display: 'flex', color: 'var(--mui-page-header-color)' }}
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
      {/* 7. 転送汎型<NokaSearch>、型が完全に一致 */}
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
      </div>

      <CustomModal
        open={modalState.open}
        onClose={closeModal}
        maxWidth="lg"
      >
        {renderModalContent()}
      </CustomModal>
    </Box>
  );
};

export default N008;