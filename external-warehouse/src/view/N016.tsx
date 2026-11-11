import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ColDef } from 'ag-grid-community';
import { SimpleForm } from 'react-admin';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import { formSx, tableSx } from '../styles/commonSX';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import FormTicket from '../compontent/FormTicket';
import { normalizeJapanesePhone } from '../utils/dataUtil';

// 検索フォームのプロパティインターフェース
interface SearchFormProps { }
// カードデータインターフェース
interface CardData {
  id: string;
  customerId: string;
  customerName: string;
  postalCode: string;
  memberId: string;
  kenName: string;
  cityName: string;
  townName: string;
  mailAddress: string;
  phoneNumber: string;
}

interface NokaSearch {
  itemId: string;
  itemName: string;
  janCode: string;
  dlvdelivery: string;
  sumarejiItemId: string;
  category1: string;
  category2: string;
  salesFlg: number;
  confirmFlg: number;
  itemPrice: number;
  reqCropYield: string;
  id: string;
}
// 管理画面コンポーネント 
const N016: React.FC<SearchFormProps> = () => {
  const [cardData, setCardData] = useState<CardData>({
    id: '',
    customerId: '',
    customerName: '',
    postalCode: '',
    memberId: '',
    kenName: '',
    cityName: '',
    townName: '',
    mailAddress: '',
    phoneNumber: '',
  });
  const mockData: NokaSearch[] = [
  ];

  // ページ遷移フック
  const navigate = useNavigate();
  //初期化設定
  const [data, setData] = useState(mockData)
  // const pageSize = 20
  const [total, setTotal] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const { cd } = useParams<{ cd: string }>();
  // URLパラメータを取得するためuseSearchParamsを追加
  const [searchParams] = useSearchParams();
  const { request } = useApiRequest();
  const newGridRef = useRef<DataGridRef<NokaSearch> | null>(null);
  useEffect(() => {
    if (cd) {
      fetchCustomerData(cd);
    }
  }, [cd, searchParams]);
  
  // cardData.customerIdが変化すると、テーブルデータを再ロードする
  useEffect(() => {
    if (cardData.customerId) {
      searchData({ current: 1, pageSize: newGridRef.current?.getPageSize() || 10 });
    }
  }, [cardData.customerId]);
  // お客様の詳細を取得し、テーブルデータをロードする
  const fetchCustomerData = async (id: string) => {
    const data = await request('get', 'api/customer/info/' + id);
    setCardData(data?.data || {});
  };

  /**
    * 金額列のカスタムレンダラー（￥記号とカンマ区切り）
    */
  const CurrencyRenderer = (props: { value: number }) => {
    const formattedValue = props.value ? `￥${props.value.toLocaleString('ja-JP')}` : '￥0';
    return <div>{formattedValue}</div>;
  };

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

  // 5. テーブル列定義
  const columnDefs = useMemo<ColDef<NokaSearch>[]>(
    () => [
      { headerName: '商品ID', field: 'itemId', cellRenderer: IdLinkRenderer,  width: 180 },
      { headerName: '商品名', field: 'itemName', width: 295 },
      { headerName: '必要収穫量', field: 'reqCropYield', width: 180, cellStyle: { textAlign: 'right' } },
      { headerName: '金額', field: 'itemPrice', width: 180, cellStyle: { textAlign: 'right' }, cellRenderer: CurrencyRenderer },
      { headerName: 'JANコード', field: 'janCode', width: 180 },
      { headerName: 'スマレジ商品ID', field: 'sumarejiItemId', width: 180 },
      { headerName: '配送方法', field: 'dlvdelivery' },
    ],
    []
  );
  const searchData = async (pagination: Record<string, any>) => {
    // customerIdパラメータのみを渡し、他の検索条件は渡さない
    const result = await request('get', 'api/order/list/byCustomerId', { customerId: cardData.customerId }, pagination, false, false)
    setData(result.rows)
    setTotal(result.total)
  }
  const handlePageChange = async (current: number, pageSize: number) => {
    setPageNum(current)
    searchData({ current: current, pageSize: pageSize })
  }
  return (
    <PageContainer title={'顧客詳細'} returnButton={true}>
      <SimpleForm
        sx={formSx.formContainer}
        toolbar={false}
      >
        <div
          style={formSx.form1}
        >
          <FormTicket
            structure='left-right'
            label='顧客ID'
            value={cardData.customerId || '-'}
          >
          </FormTicket>
          <div></div>
          <FormTicket
            structure='left-right'
            label='顧客名'
            value={cardData.customerName || '-'}
          >
          </FormTicket>
          <div></div>
          <FormTicket
            structure='left-right'
            label='郵便番号'
            value={cardData.postalCode || '-'}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='会員ID'
            value={cardData.memberId || '-'}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='都道府県'
            value={cardData.kenName || '-'}
          ></FormTicket>
          <FormTicket
            structure='left-right'
            label='市区町村'
            value={cardData.cityName || '-'}
          ></FormTicket>
          <FormTicket
            structure='left-right'
            label='番地以下'
            value={cardData.townName || '-'}
          ></FormTicket>
          <div></div>
          <FormTicket
            structure='left-right'
            label='電話番号'
            value={normalizeJapanesePhone(cardData.phoneNumber) || '-'}
          ></FormTicket>
          <FormTicket
            structure='left-right'
            label='e-mail'
            value={cardData.mailAddress || '-'}
          ></FormTicket>

        </div>

        <div
          style={{ marginTop: 20 }}
        >
          <h3>購入履歴</h3>
        </div>
      </SimpleForm>
      <div className="ag-theme-alpine" style={tableSx.tableContainer}>
        <DataGrid<NokaSearch>
          ref={newGridRef}
          columnDefs={columnDefs}
          rowData={data}
          rowTotal={total}
          page={pageNum}
          pagination={true}
          onPageChange={handlePageChange}
          rowUniqueKey="itemId"
          noRowsShow = '購入履歴がありません'
        />
      </div>
    </PageContainer>
  );
};
export default N016;