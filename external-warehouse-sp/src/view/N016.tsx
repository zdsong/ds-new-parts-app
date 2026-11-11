import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cardSx, pageSx, ticketSx } from '../styles/commonSX';
import { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import FormTicket from '../compontent/FormTicket';
import { Box, Typography } from '@mui/material';
import { normalizeJapanesePhone } from '../utils/dataUtil';
import DataListWithPagination from '../compontent/DataListWithPagination';
import { KeyboardArrowDown } from '@mui/icons-material';

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

interface Item {
  itemId: string;
  category1: string;
  category2: string;
  itemName: string;
  reqCropYield: string;
  itemPrice: string;
  janCode: string;
  sumarejiItemId: string;
  deliveryMethod: string;
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
    kenName: '',
    cityName: '',
    townName: '',
    mailAddress: '',
    phoneNumber: '',
    memberId: '',
  });
  const mockData: NokaSearch[] = [
  ];

  const { cd } = useParams<{ cd: string }>();
  // URLパラメータを取得するためuseSearchParamsを追加
  const [searchParams] = useSearchParams();
  const { request } = useApiRequest();
  const newGridRef = useRef<DataGridRef<NokaSearch> | null>(null);
  const infiniteListRef = useRef<{ resetPage: () => void, getPageSize: ()=>number }>(null);
  const [data, setData] = useState(mockData)
  const [total, setTotal] = useState(0)
  useEffect(() => {
    if (cd) {
      fetchCustomerData(cd);
    }
  }, [cd, searchParams]);

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
  const navigate = useNavigate();
  const handleGoBack = () => {
    navigate(-1); 
  };

  const searchData = async (pagination: Record<string, any>) => {
    // customerIdパラメータのみを渡し、他の検索条件は渡さない
    const result = await request('get', 'api/order/list/byCustomerId', { customerId: cardData.customerId }, pagination, false, false)
    setData(result.rows)
    setTotal(result.total)
  }
  const handlePageChange = async (current: number, pageSize: number) => {
    searchData({ current: current, pageSize: pageSize })
  }

  const setItemCard = (item : Item) => {
    return (
      <ItemListCard item={item}></ItemListCard>
    )
  }

  return (
    <Box sx={pageSx.pageContainer}>
      <Box sx={pageSx.titleContainer}>
        <div style = {{display: 'flex', flexDirection: 'column'}}>
          <span style={{ marginRight: '4px', color: 'var(--mui-yamato-page-header-color)', }} onClick={handleGoBack}>&lt; 戻る</span>
          <label style={pageSx.title}>
        顧客詳細
        </label>
      </div>
      </Box>
      <div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 'auto', color: "#999999ff", marginTop: '5px' }}>
            <FormTicket
              structure='left-right'
              label='顧客ID'
              value={cardData.customerId || '-'}
              sx={{
                label: {
                  width: '80px'
                }
              }}
            >
            </FormTicket>
          </div>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='顧客名'
            value={cardData.customerName || '-'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
        <FormTicket
            structure='left-right'
            label='会員ID'
            value={cardData.memberId || '-'}
        ></FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='郵便番号'
            value={cardData.postalCode || '-'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='都道府県'
            value={cardData.kenName || '-'}
          ></FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='市区町村'
            value={cardData.cityName || '-'}
          ></FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='番地以下'
            value={cardData.townName || '-'}
          ></FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='電話番号'
            value={normalizeJapanesePhone(cardData.phoneNumber) || '-'}
          ></FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='e-mail'
            value={cardData.mailAddress || '-'}
          ></FormTicket>
        </div>
      </div>

      <Box sx={pageSx.titleContainer}>
        <div style = {{display: 'flex', flexDirection: 'column'}}>
          <label style={pageSx.title}>
          購入履歴
        </label>
      </div>
      </Box>
        {
          data.length > 0 ?
          <div style = {{height: 'auto'}}>
          <DataListWithPagination
            ref={infiniteListRef}
            data={data}
            renderCard={setItemCard}
            rowTotal={total}
            pageChange={handlePageChange}
          /></div> : 
          <div style={{display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center'}}> 
          <Typography variant="caption" color="text.secondary">
            {data.length > 0 ? '' : '購入履歴がありません'}
          </Typography>
          </div>
        }
    </Box >
  );
};

/**
 * 商品カードレンダラー 
 */
const ItemListCard : React.FC<{item : Item}> = ( {item} ) => {
  
const [showFlg, setShowFlg] = useState(false); 
const navigate = useNavigate();
const handleIdClick = (id: string) => {
  navigate(`/N010/${id}`);
};
const formattedPriceValue = item.itemPrice ? `￥${item.itemPrice}` : '￥0';
return (
  <Box
  sx={cardSx}
  >
    <div
      style={{
        padding: '2px 10px',
        borderBottom: '1px solid #d9d9d9',
        backgroundColor: 'var(--mui-yamato-card-header-color)'
      }}
    >
      <div style={{display: 'flex', justifyContent: 'end', fontSize: '13px', color: '#7f7f7f'}} onClick={()=>{item.itemId ? handleIdClick(item.itemId): ''}}><div>{'商品ID：' + item.itemId || ''}</div></div>
    </div>

    <Box sx = {{marginBottom: '5px'}}>
      <div style={{display: 'flex', flexDirection: 'column', margin: '2px 20px'}}>
        <FormTicket sx={ticketSx.ticket3} structure='left-right' label={'商品名'} value={item.itemName || ''} />
      </div>
      {
        !showFlg ?
        <div 
        style = {{flex: '1', display: 'flex', alignContent: 'center', justifyContent: 'center', border: '1px solid var(--mui-yamato-page-header-color)', color: 'var(--mui-yamato-page-header-color)', margin: '0 20px'}}
        onClick = {() => { setShowFlg(true) }}
        >
        残りの詳細を表示する
        <KeyboardArrowDown />
        </div> : 
        <div style={{display: 'flex', flexDirection: 'column', margin: '2px 20px'}}>
        <FormTicket sx={ticketSx.ticket3} structure='left-right' label={'必要収穫量'} value={item.reqCropYield || ''} />
        <FormTicket sx={ticketSx.ticket3} structure='left-right' label={'金額'} value={formattedPriceValue || ''} />
        <FormTicket sx={ticketSx.ticket3} structure='left-right' label={'JANコード'} value={item.janCode || ''} />
        <FormTicket sx={ticketSx.ticket3} structure='left-right' label={'スマレジ商品ID'} value={item.sumarejiItemId || ''} />
        <FormTicket sx={ticketSx.ticket3} structure='left-right' label={'配送方法'} value={item.deliveryMethod || ''} />
        </div>
      }
    </Box>
  </Box>
);
};

export default N016;