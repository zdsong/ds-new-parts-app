import { useEffect, useMemo, useRef, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { SimpleForm, useNotify, useTranslate } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import { Modal, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import ResultGrid from '../compontent/ResultGrid';
import useApiRequest from '../adapters/apiUtil';
import deleteIcon from '../assets/icons/delete-icon.png';

interface ItemRow {
  id: string;
  itemCode: string;
  itemName: string;
  prprkn: string;
  prprkj: string;
  prkku: string;
  prhnmx: string;
  prbiko: string;
}

interface SearchFormProps { }

const PAGE_SIZE_CHOICES = [10, 20, 50];

const P008: React.FC<SearchFormProps> = () => {
  const [data, setData] = useState<ItemRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_CHOICES[0]);
  const [searchForm, setSearchForm] = useState<any>({});
  const { request } = useApiRequest();
  const [formKey, setFormKey] = useState(0);
  const [filePath, setFilePath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // エラー情報表示用の状態
  const [errorList, setErrorList] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  // 品目区分の選択肢（辞書：bss_classification）
  const [classificationOptions, setClassificationOptions] = useState<any[]>([]);
  const navigate = useNavigate();
  const notify = useNotify();
  const translate = useTranslate();

  /**
   * 品目名クリック時の処理
   */
  const handleItemClick = (itemCode: string) => {
    navigate(`/P010/${itemCode}`);
  };

  /**
   * 品目コード列のカスタムレンダラー
   */
  const ItemCodeRenderer = (props: { data: ItemRow; value: string }) => {
    return (
      <div style={tableSx.linkFontColumn} onClick={() => handleItemClick(props.value)}>
        {props.value}
      </div>
    );
  };

  /**
   * 品目区分列のカスタムレンダラー
   */
  const ClassificationRenderer = (props: { value: string }) => {
    const option = classificationOptions.find((item: any) => item.key === props.value);
    return <div>{option?.value || props.value || ''}</div>;
  };

  // 一覧列定義
  const columnDefs = useMemo<ColDef<ItemRow>[]>(
    () => [
      { headerName: '品目コード', field: 'itemCode', flex: 1, minWidth: 150, cellRenderer: ItemCodeRenderer },
      { headerName: '品目名', field: 'itemName', flex: 2, minWidth: 200 },
      { headerName: '品目名カナ', field: 'prprkn', flex: 1, minWidth: 150 },
      { headerName: '品名（伝票用）', field: 'prprkj', flex: 2, minWidth: 200 },
      { headerName: '規格', field: 'prkku', flex: 1, minWidth: 120 },
      { headerName: '品目区分', field: 'prhnmx', flex: 1, minWidth: 100, cellRenderer: ClassificationRenderer },
      { headerName: '備考', field: 'prbiko', flex: 2, minWidth: 180 },
    ],
    [classificationOptions]
  );

  const searchData = async (condition: Record<string, any>) => {
    // チェックボックスの選択値をカンマ区切りに変換する
    const params = { ...condition };
    if (Array.isArray(params.prhnmx)) {
      const classification = params.prhnmx.filter((value: string) => !!value).join(',');
      if (classification) {
        params.prhnmx = classification;
      } else {
        delete params.prhnmx;
      }
    }
    // ページ分割は ResultGrid 側で行うため、条件に合う行をまとめて取得する
    const result = await request('get', 'api/item/list', params, { current: 1, pageSize: 100000 });
    setData((result.rows || []).map((row: ItemRow) => ({ ...row, id: row.itemCode })));
  };

  const handleSearch = async (form: Record<string, any>) => {
    setSearchForm(form);
    setPage(1);
    searchData(form);
  };

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  /**
   * 検索条件クリア処理
   * フォームデータ、一覧データ、ページ情報をリセット
   */
  const handleClear = async () => {
    setSearchForm({});
    setFormKey((prevKey: number) => prevKey + 1);
    setData([]);
    setPage(1);
    setPageSize(PAGE_SIZE_CHOICES[0]);
    await searchData({});
  };

  // ファイルインポート処理
  const handleImport = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      notify(translate('ra.message.csv_not_select'), { type: 'error', raw: true });
      return;
    }
    const file = fileInputRef.current.files[0];
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await request('post', 'api/item/import', formData, {}, true, false);

      const isSuccess = (!result.code || result.code >= 200 && result.code < 300) && !result.error;

      if (isSuccess) {
        if (result.errorList && result.errorList.length > 0) {
          setErrorList(result.errorList);
          setShowErrorModal(true);
          notify(translate('ra.message.import_failed'), { type: 'error'});
        } else {
          handleClear()
        }
      }
      setFilePath('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // エラー通知は API 呼び出し側で表示する
    }
  };

  // 品目区分の辞書データを取得する
  const fetchClassificationOptions = async () => {
    const result = await request(
      'post',
      'api/common/options',
      { cmdOptionName: 'bss_classification' },
      {},
      false,
      false
    );
    setClassificationOptions(result?.data || []);
  };

  useEffect(() => {
    fetchClassificationOptions();
    searchData({});
  }, [])

  return (
    <PageContainer title={'品目マスタ'} titleUnderline bottomSpace>
      {/* 検索条件カード */}
      <CustomCard plain
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
              source="itemCode"
              label="品目コード"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                itemCode: value,
            }));}}
            />
            <FormInput
              type={'text'}
              source="itemName"
              label="品目名"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                itemName: value,
            }));}}
            />
            <FormInput
              type={'text'}
              source="prprkn"
              label="品目名カナ"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                prprkn: value,
            }));}}
            />
            <FormInput
              type={'multiple-choice'}
              source="prhnmx"
              label="品目区分"
              choices={classificationOptions}
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
              marginBottom: '22px',
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
      </CustomCard>

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
          style={{ padding: '5px 10px', border: 'none', color: 'var(--mui-page-header-color)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          ファイル選択
        </button>
        <button
          style={{ padding: '5px', border: 'none', backgroundColor: 'transparent', cursor: filePath ? 'pointer': 'not-allowed' }}
          disabled = {!filePath}
          onClick={() => {
            setFilePath('');
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
              if (fileName.endsWith('.csv') && fileName.includes('item')) {
                setFilePath(file.name);
              } else {
                notify(translate('ra.message.error_item_csv_name'), { type: 'error' });
              }
          }}
        />
      </div>

      <ResultGrid<ItemRow>
        columnDefs={columnDefs}
        rowData={data}
        showResultSummary
        showPageSize
        showBottomPagination
        pageSizeChoices={PAGE_SIZE_CHOICES}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        noRowsShow="該当する品目がありません。"
      />
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
                {errorList.map((error: any, index: number) => (
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

export default P008;
