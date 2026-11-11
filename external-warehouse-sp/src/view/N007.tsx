import React, { useState, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {Box} from '@mui/material';
import FormTicket from '../compontent/FormTicket';
import { useNavigate, useParams } from 'react-router';
import N020 from './N020';
import useApiRequest from '../adapters/apiUtil';
import { usePopupControl } from '../layout/usePopupMutex';
import { cardSx, pageSx, tableSx, ticketSx } from '../styles/commonSX';
import { formatDate } from '../utils/dateUtil';
import { normalizeJapanesePhone } from '../utils/dataUtil';
import FolderBox from '../compontent/FolderBox';
import CustomModal from '../compontent/CustomModal';

interface SearchFormProps {
  onSubmit?: (data: any) => void;
}

interface ProductItem {
  itemName: string; 
  qty: number;
  itemPriceTax: string;
  subtotalTax: string;
  itemCd: string;
}

const formTicketLabelStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '100px',
  marginRight: '10px',
  fontWeight: 'bold',
};

const N007: React.FC<SearchFormProps> = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { message } = useParams<{ message: string }>();
  const navigate = useNavigate();
  const [isN020Open, setIsN020Open] = useState(false);
  const { request } = useApiRequest();

  // 受注ベース情報
  const [cardData, setCardData] = useState({
    orderId: '', 
    orderTime: '',
    paymentDate: '',
    paymentType: '',
    deliveryPlanDate: '',
    deliveryTrackingNo: '',
    deliveryMethod: '',
    shipDate: '',
    deliveryDate: '',
    itemTotal: '',
    id: '', 
    totalCarriage: '',
    proxyOrderChLabel: ''
  });

  // 商品情報
  const [productData, setProductData] = useState<ProductItem[]>([]);

  const [deliveryList, setDeliveryList] = useState<any>([]);

  // お客様関連情報（注文者、期け先）
  const [clientData, setClientData] = useState({
    clientInfo: {
      customerId: '',
      customerName: '',
      address: '',
      phoneNumber: '',
      customerMemo: ''
    },
    deliveryInfo: {
      customerId: '',
      deliveryCustomerName: '',
      address: '',
      phoneNumber: '',
      memo: ''
    }
  });

  // バックグラウンドからの注文詳細データの取得
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (orderId) {
        const response = await request('get', `api/order/${orderId}/detail`);
        const resData = response.data;
        if (resData) {
          // cardDataの移入
          setCardData({ 

            orderId: resData?.orderId,
            orderTime: resData?.orderTime,
            paymentDate: resData?.paymentDate,
            paymentType: resData?.paymentType,
            deliveryPlanDate: resData?.deliveryPlanDate, 
            deliveryTrackingNo: resData?.deliveryTrackingNo,
            deliveryMethod: resData.deliveryList ? resData.deliveryList[0]?.deliveryMethod : '',
            shipDate: resData?.shipDate,
            deliveryDate: resData?.deliveryDate,
            itemTotal: resData?.itemTotalTax, 
            id: resData.id, 
            totalCarriage: resData.totalCarriage,
            proxyOrderChLabel: resData.proxyOrderChLabel
          });
          
          //商品情報
          const itemList = Array.isArray(resData.itemList) ? resData.itemList : [];
          const mappedProduct = itemList.map((item: any) => ({
            itemName: item.itemName,
            qty: item.qty,
            itemPriceTax: item.itemPriceTax,
            subtotalTax: item.subtotalTax,
            itemCd: item.itemCd
          }));
          setProductData(mappedProduct);

          const allDeliveryList = Array.isArray(resData.deliveryList) ? resData.deliveryList : [];
          setDeliveryList(allDeliveryList)
          
          //注文者情報
          const clientInfo = {
            customerId: resData.customerId,
            customerName: resData.customerName,
            address: resData.address,
            phoneNumber: resData.phoneNumber,
            customerMemo: resData.customerMemo
          };
          
          //届け先情報
          const deliveryList = Array.isArray(resData.deliveryList) ? resData.deliveryList : [];
          const deliveryFirst = deliveryList[0] || {};
          const deliveryInfo = {
            customerId: deliveryFirst.customerId, 
            deliveryCustomerName: deliveryFirst.deliveryCustomerName,
            address: deliveryFirst.address, 
            phoneNumber: deliveryFirst.phoneNumber, 
            memo: deliveryFirst.memo 
          };

          setClientData({
            clientInfo: clientInfo,
            deliveryInfo: deliveryInfo
          });
          
          if(message){
            handleToggleChat()
          }
        }
      }
    };

    fetchOrderDetail();
  }, [orderId, message]);

const formatPrice = (price: number | string | undefined) => {
  if (!price) return '0';
  return String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

  const navigateN020 = (id: string) => {
    setIsN020Open(true);
  }

  const handleGoBack = () => {
    navigate(-1); 
  };

  const navigateN016 = (id: string) => {
    navigate('/N016/' + id)
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#f2f2f2', 
    color: '#333', 
    border: '1px solid #CCC', 
    borderRadius: '5px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    width: '100%',
  };

  const labelValueGapStyle: React.CSSProperties = {
    marginRight: '10px'
};

  // 顧客IDの緑色スタイル
  const customerIdGreenStyle = {
    input: {
      color: 'var(--mui-yamato-page-header-color)',
    }
  };

  const { activePopup, setActivePopup, closeAllPopups, PopupParam, setPopupParam } = usePopupControl();

  const isChatOpen = (activePopup === 'message');

  const handleToggleChat = () => {
    if (isChatOpen) {
      closeAllPopups();
    } else {
      closeAllPopups();
      setPopupParam(null)
      setPopupParam({orderId: orderId})
      setActivePopup('message');
    }
  };

  return (
    <Box sx={pageSx.pageContainer}>
      <Box sx={pageSx.titleContainer}>
        <div style = {{display: 'flex', flexDirection: 'column'}}>
          <span style={tableSx.linkFontColumn} onClick={handleGoBack}>&lt; 戻る</span>
          <label style={pageSx.title}>
        注文詳細
        </label>
      </div>
      </Box>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              fontSize: '15px',
             
            }}>
              <div style={{
                whiteSpace: 'nowrap',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div>
                  <span style={labelValueGapStyle}>注文番号</span>
                  {cardData.orderId}
                </div>
                <div>
                  <span style={labelValueGapStyle}>注文日時</span>
                  {cardData.orderTime ? formatDate(cardData.orderTime) : ''}
                </div>
              </div>
            </div>

          {/* PH2で実装予定*/}
          <div>
          </div>
          <FormTicket label={'決済日'} value={cardData.paymentDate ? formatDate(cardData.paymentDate) : ''} structure="left-right" />
          <FormTicket label={'決済方法'} value={cardData.paymentType} structure="left-right" />
          <FormTicket label={'集荷予定日'} value={cardData.deliveryPlanDate ? formatDate(cardData.deliveryPlanDate) : ''} structure="left-right" />
          <FormTicket label={'受注経路区分'} value={cardData.proxyOrderChLabel} structure="left-right" />
          <FormTicket label={'伝票番号'} value={cardData.deliveryTrackingNo} structure="left-right" />
          <FormTicket label={'配送方法'} value={cardData.deliveryMethod} structure="left-right" />
          <FormTicket label={'出荷日'} value={cardData.shipDate ? formatDate(cardData.shipDate) : ''} structure="left-right" />
          <FormTicket label={'配送完了日'} value={cardData.deliveryDate ? formatDate(cardData.deliveryDate) : ''} structure="left-right" />

          {/* 問い合わせ履歴 + メッセージ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              style={buttonStyle}
              onClick={()=>{navigateN020(cardData.id)}}
            >
              問い合わせ履歴
            </button>
            <button 
             style={buttonStyle}
             onClick={()=>{handleToggleChat()}}
            >
              メッセージ
            </button>
          </div>
        </div>

        {/* 注文者情報 */}
        <Box sx={pageSx.titleContainer}>
            <div style = {{display: 'flex', flexDirection: 'column'}}>
            <label style={pageSx.title}>
              注文者情報
              </label>
            </div>
          </Box>

          <div>
            <FormTicket label={'顧客ID'} value={clientData.clientInfo.customerId} structure="left-right" onClick={()=> {navigateN016(clientData.clientInfo.customerId)}} sx={customerIdGreenStyle} />
            <FormTicket label={'注文者名称'} value={clientData.clientInfo.customerName} structure="left-right" />
            <FormTicket label={'住所'} value={clientData.clientInfo.address} structure="left-right" />
            <FormTicket label={'電話番号'} value={normalizeJapanesePhone(clientData.deliveryInfo.phoneNumber)} structure="left-right" />
            <FormTicket label={'メモ'} value={clientData.clientInfo.customerMemo} structure="left-right" />
          </div>

        {/* 注文者・届け先情報*/}
        <div style={{ 
          margin: '1rem 0', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '1rem',
        }}>
          
        {/* 商品情報*/}
        <div style={{ margin: '1rem 0' }}>
            <Box sx={pageSx.titleContainer}>
              <div style = {{display: 'flex', flexDirection: 'column'}}>
              <label style={pageSx.title}>
                商品情報
                </label>
              </div>
            </Box>
            <FolderBox folderHeight = '358px'>
            {productData.map((item) => (
              <Box
              sx={cardSx}
              >
                <div
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #d9d9d9',
                    color: 'var(--mui-yamato-page-header-color)'
                  }}
                >
                  <div>{item.itemName}</div>
                </div>
                <Box>
                <div style={{display: 'flex', flexDirection: 'column', margin: '2px 20px'}}>
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'商品コード'} value={item.itemCd} />
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'数量'} value={JSON.stringify(item.qty)} />
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'価格(税込)'} value={'¥' + formatPrice(item.itemPriceTax)} />
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'金額'} value={'¥' + formatPrice(item.subtotalTax)} />
                </div>
                </Box>
              </Box>
            ))}
            </FolderBox>
            <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 'bold' }}>
              <span style={formTicketLabelStyle}>合計送料</span>
              ¥{formatPrice(cardData.totalCarriage)}
            </div>
            <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 'bold' }}>
              <span style={formTicketLabelStyle}>合計請求金額</span>
              ¥{formatPrice(cardData.itemTotal)}
            </div>
          </div>
          {/* 届け先情報 */}
          <Box sx={pageSx.titleContainer}>
            <div style = {{display: 'flex', flexDirection: 'column'}}>
            <label style={pageSx.title}>
              届け先情報
              </label>
            </div>
          </Box>
          <div>
          {
          deliveryList.map((item: any, index: any) => (
          <div>
          <FolderBox folderHeight = '358px'>
          {item.itemList.map((item: any) => (
              <Box
              sx={cardSx}
              >
                <div
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #d9d9d9',
                    color: 'var(--mui-yamato-page-header-color)'
                  }}
                >
                  <div>{item.itemName}</div>
                </div>
                <Box>
                <div style={{display: 'flex', flexDirection: 'column', margin: '2px 20px'}}>
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'商品コード'} value={item.itemCd} />
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'数量'} value={JSON.stringify(item.qty)} />
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'価格(税込)'} value={'¥' + formatPrice(item.itemPriceTax)} />
                  <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'金額'} value={'¥' + formatPrice(item.subtotalTax)} />
                </div>
                </Box>
              </Box>
            ))}
            </FolderBox>
            <FormTicket label={'送料'} value={`¥${formatPrice(item.shippingFee)}`} structure="left-right" />
            <FormTicket label={'合計請求金額'} value={`¥${formatPrice(item.itemTotalTax)}`} structure="left-right" />
            <FormTicket label={'届け先名称'} value={item.deliveryCustomerName} structure="left-right"></FormTicket>
            <FormTicket label={'住所'} value={item.deliveryAddress} structure="left-right" />
            <FormTicket label={'電話番号'} value={normalizeJapanesePhone(item.deliveryPhoneNumber)} structure="left-right" />
            <FormTicket label={'メモ'} value={item.memo} structure="left-right" />
            {(index < deliveryList.length - 1 ) && (
              <div
                style={{
                  width: '100%',
                  borderBottom: '2px solid #7F7F7F',
                  margin: '10px 0',
                }}
              />
            )}
            </div>
          ))}
          </div>
        </div>

      {/* 問い合わせ履歴弹窗 */}
        <CustomModal
          open={isN020Open}
          onClose={() => setIsN020Open(false)}
          title={'問い合わせ履歴'}
          maxWidth="lg"
        >
           <N020 orderId={cardData.orderId} />
        </CustomModal>
    </Box>
  );
};

export default N007;