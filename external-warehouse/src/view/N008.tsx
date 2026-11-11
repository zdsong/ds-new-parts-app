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
  id: string;
}

// 検索フォームのプロパティインターフェース（无需 onSubmit，内部处理）
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
  const [filePath, setFilePath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newGridRef = useRef<DataGridRef<NokaSearch> | null>(null);
  // エラー情報表示用の状態
  const [errorList, setErrorList] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  // ページ遷移フック
  const navigate = useNavigate();
  // React-Adminの通知機能を使用
  const notify = useNotify();
  const translate = useTranslate();

  /**
   * 商品IDクリック時の処理 
   */
  const handleIdClick = (id: string) => {
    navigate(`/N010/${id}`);
  };
  /**
   * 商品ID列のカスタムレンダラー 
   */
  const IdLinkRenderer = (props: { data: NokaSearch; value: string }) => {
    // propsタイプを明確にし、anyを避ける
    const handleClick = () => {
      handleIdClick(props.value);
    };
    return (
      <div onClick={handleClick} style={tableSx.linkFontColumn}>
        {props.value}
      </div>
    );
  };
  /**
   * 金額列のカスタムレンダラー（￥記号とカンマ区切り）
   */
  const CurrencyRenderer = (props: { value: number }) => {
    // 金額書式設定：￥記号と千桁カンマを追加
    const formattedValue = props.value ? `￥${props.value.toLocaleString('ja-JP')}` : '￥0';
    return <div>{formattedValue}</div>;
  };

  /**
   * 状態列のカスタムレンダラー（0: -, 1: ✓）
   */
  const StatusRenderer = (props: { value: number }) => {
    if (props.value == 1) {
      return (
        <div style={{
          textAlign: 'center',
          justifyContent: 'center',
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          color: '#00b441',
          fontWeight: 'bold'
        }}>
          ✓
        </div>
      );
    } else {
      return (
        <div style={{
          textAlign: 'left',
        }}>
          -
        </div>
      );
    }
  };
  // 5. テーブル列定義
  const columnDefs = useMemo<ColDef<NokaSearch>[]>(
    () => [
      { headerName: '商品ID', field: 'itemId', cellRenderer: IdLinkRenderer, width: 150 },
      { headerName: '商品名', field: 'itemName', width: 295 },
      { headerName: '必要収穫量', field: 'reqCropYield', width: 150, cellStyle: { textAlign: 'right' } },
      { headerName: '金額', field: 'salesPrice', width: 150, cellStyle: { textAlign: 'right' }, cellRenderer: CurrencyRenderer },
      { headerName: 'JANコード', field: 'janCode', width: 150 },
      { headerName: 'スマレジ商品ID', field: 'sumarejiItemId', width: 150 },
      { headerName: '配送方法', field: 'dlvdeliveryFlg',},
      { headerName: '販売停止', field: 'salesFlg', width: 100, cellRenderer: StatusRenderer },
      { headerName: '要確認', field: 'confirmFlg', width: 100, cellRenderer: StatusRenderer },
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
      const result = await request('post', 'api/item/import', formData, {}, true, false);

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
    searchData({}, { current: 1, pageSize: newGridRef.current?.getPageSize() });
  }, [])
  return (
    <PageContainer title={'商品マスタ'}>
      {/* 検索条件カード */}
      <SearchCard
        sx={{ width: '100%', marginBottom: '20px', }}
        titleVariant={'body1'}
        title="検索条件"
      >
        <SimpleForm
          key={formKey}
          sx={formSx.formContainer}
          onSubmit={handleSearch} // バインド修正後の検索方法
          toolbar={false}
          defaultValues={searchForm} // 安定したデフォルト値の使用
        >
          <div style={formSx.form1}>
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
            style={{ height: '20px', marginRight: '3px' }}
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
              if (fileName.endsWith('.csv') && fileName.includes('item')) {
                setFilePath(file.name);
              } else {
                notify(translate('ra.message.error_item_csv_name'), { type: 'error' });
              }
          }}
        />
      </div>

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

export default N008;