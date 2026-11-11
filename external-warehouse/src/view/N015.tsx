import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ColDef } from 'ag-grid-community';
import { SimpleForm, useNotify, useTranslate } from 'react-admin';
import SearchCard from '../compontent/SearchCard';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import { Modal, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import deleteIcon from '../assets/icons/delete-icon.png';
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
  const [filePath, setFilePath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 2. refタイプを修正する（NokaSearch定義の後でなければならない！）
  const newGridRef = useRef<DataGridRef<NokaSearch> | null>(null);
  // エラー情報表示用の状態
  const [errorList, setErrorList] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  // ページ遷移フック
  const navigate = useNavigate();
  // React-Adminの通知機能を使用
  const notify = useNotify();
  /**
   * 商品IDクリック時の処理 
   */
  const handleIdClick = (id: string) => {
    navigate(`/N016/${id}`);
  };
  /**
   * 商品ID列のカスタムレンダラー 
   */
  const IdLinkRenderer = (props: { data: NokaSearch; value: string }) => {
    // propsタイプを明確にし、anyを避ける
    const handleClick = () => {
      handleIdClick(props.data.customerId);
    };
    return (
      <div onClick={handleClick} style={tableSx.linkFontColumn}>
        {props.value}
      </div>
    );
  };
  // 5. テーブル列定義
  const columnDefs = useMemo<ColDef<NokaSearch>[]>(
    () => [
      { headerName: '顧客ID', field: 'customerId', cellRenderer: IdLinkRenderer, width: 150 },
      { headerName: '顧客名', field: 'customerName', width: 300 },
      { headerName: '住所', field: 'address'},
      { headerName: '会員ID', field: 'memberId',width: 200},
      { headerName: '電話番号', field: 'phoneNumber',cellRenderer: (props: { value: string; })=>{return (<div>{normalizeJapanesePhone(props.value)}</div>)}, width: 150 },
    ],
    []
  );
  const translate = useTranslate();

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

  // ファイルインポート処理
  const handleImport = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      notify(translate('ra.message.csv_not_select'), { type: 'error', raw: true });
      return;
    }
    const file = fileInputRef.current.files[0];
    try {
      // ファイルをAPIに送信
      const formData = new FormData();
      formData.append('file', file);
      const result = await request('post', 'api/customer/import', formData, {}, true, false);

      // レスポンス処理
      const isSuccess = (!result.code || result.code >= 200 && result.code < 300) && !result.error;

      if (isSuccess) {
        // エラーリストがある場合はエラーモーダルとエラー通知を表示
        if (result.errorList && result.errorList.length > 0) {
          setErrorList(result.errorList);
          setShowErrorModal(true);
          notify(translate('ra.message.import_failed'), { type: 'error'});
        } else {
          // 成功時にデータを再読み込み
          handleClear()
        }
      } else {
        // エラー通知を表示
        console.error('インポートエラー:', result);
      }
      // ファイルパスをクリア
      setFilePath('');
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('インポートエラー:', error);
    }
  };

  useEffect(() => {
    kenNameList();
    searchData({}, { current: 1, pageSize: newGridRef.current?.getPageSize() });
  }, [])
  return (
    <PageContainer title={'顧客マスタ'}>
      {/* 検索条件カード */}
      <SearchCard
        sx={{ width: '100%', marginBottom: '20px', }}
        titleVariant={'body1'}
        title="検索条件"
      >
        <SimpleForm
          key={formKey}
          sx={formSx.formContainer}
          onSubmit={handleSearch}
          toolbar={false}
          defaultValues={searchForm}
        >
          <div style={formSx.form1}>
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
              <button style={{ ...buttonSx.button, width: '300px' }} type="submit">
                検索
              </button>
              <button style={{ ...buttonSx.button, backgroundColor: 'gray' }} type='button' onClick={handleClear}>
                クリア
              </button>
            </div>
          </div>
        </SimpleForm>
      </SearchCard>

      {/* 一括登録エリア */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', gap: '10px' }}>
        <span style={{ fontWeight: 'bold' }}>一括登録</span>
        <input
          type="text"
          placeholder="ファイルパス"
          value={filePath}
          disabled={true}
          readOnly
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', width: '25%' }}
        />
        <button
          style={{ padding: '5px 10px', border: 'none', color: 'var(--mui-yamato-page-header-color)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          ファイル選択
        </button>
        <button
          style={{ padding: '5px', border: 'none', backgroundColor: 'transparent', cursor: filePath ? 'pointer': 'not-allowed' }}
          disabled = {!filePath}
          onClick={() => {
            setFilePath('');
            // ファイル入力をリセット
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        >
          <img
            src={deleteIcon}
            alt="deleteIcon"
            style={filePath ? {height: '20px', marginRight: '3px' } : {height: '20px', marginRight: '3px' }}
          />
        </button>
        <button
          style={{ ...buttonSx.button, width: '150px' }}
          onClick={() => handleImport()}
        >
          インポート実行
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if(!file) return

            const fileName = file.name.toLowerCase();
            // ファイルタイプと名前を検証
            if (fileName.endsWith('.csv') && fileName.includes('customer')) {
              setFilePath(file.name);
            } else {
              notify(translate('ra.message.error_customer_csv_name'), { type: 'error' });
            }
           
          }}
        />
      </div>

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
      </div>

      {/* エラー情報表示モーダル */}
      <Modal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-description"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 1000,
            maxHeight: '80vh',
            overflow: 'auto',
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="error-modal-title" variant="h6" component="h2" sx={{ mb: 2, textAlign: 'center' }}>
            {'インポートエラー情報（' + errorList.length + '）'} 
          </Typography>
          <TableContainer component={Paper}>
            <Table sx={{
              minWidth: 650,
              '& .MuiTableCell-root': {
                borderRight: '1px solid rgba(224, 224, 224, 1)',
                '&:last-child': {
                  borderRight: 0
                }
              }
            }} aria-label="error table">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'var(--mui-yamato-page-header-color)' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ファイル</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '170px' }}>行目（ヘッダ含め）</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>エラーメッセージ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errorList.map((error, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '&:last-child td, &:last-child th': { borderBottom: 0 },
                      backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'white'
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {error.objectName}
                    </TableCell>
                    <TableCell>{error.rowLine}</TableCell>
                    <TableCell>{error.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Modal>
    </PageContainer>
  );
};

export default N015;