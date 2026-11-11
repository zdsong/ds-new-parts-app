import React, { useState, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Typography, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close'; 
import PageContainer from '../compontent/PageContainer';
import { formSx, tableSx } from '../styles/commonSX';
import FormTicket from '../compontent/FormTicket';
import { useNavigate, useParams } from 'react-router';
import N020 from './N020';
import useApiRequest from '../adapters/apiUtil';
import { usePopupControl } from '../layout/usePopupMutex';
import { formatDate } from '../utils/dateUtil';
import { normalizeJapanesePhone } from '../utils/dataUtil';

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
    proxyOrderChLabel: '',
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

  const navigateN016 = (id: string) => {
    navigate('/N016/' + id)
  };

  const handleGoBack = () => {
    navigate(-1); 
  };

  // 分割線スタイルぶんかつせんすたいる
  const dividerStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '3px solid #999',
    margin: '1.5rem 0',
    width: '100%'
  };

  const priceLabelStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '100px',
    marginRight: '10px',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#f2f2f2', 
    color: '#333', 
    border: '1px solid #CCC', 
    borderRadius: '5px',
    padding: '0.5rem 1rem', 
    cursor: 'pointer',
    width: '100%'
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
    <PageContainer>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem' 
      }}>
        <Typography style={{ fontWeight: 'bold', marginTop: '2rem'}}>注文詳細</Typography>
        {/* 戻る按钮 */}
        <button
          onClick={handleGoBack}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            color: '#64cf95',
            display: 'flex',
            alignItems: 'center',
            marginTop: '2rem'
          }}
        >
          <span style={tableSx.linkFontColumn}>&lt; 戻る</span>
          
        </button>
      </div>

      <style>{`
        .customer-id-value-green h3:nth-child(2) {
          color: var(--mui-yamato-page-header-color) !important;
          cursor: pointer;
          width: 100px;
        }
        .customer-id-value-green h3:nth-child(1) {
          color: inherit !important;
        }
      `}</style>

      <div style={{ 
        ...(formSx.form2 as React.CSSProperties),
        gap: '3px',

      }}>
        <div style={{ gridRow: '1 / 9', ...formSx.form2, gap: '3px' }}>
          <FormTicket label={'注文番号'} value={cardData.orderId} structure="left-right"></FormTicket>
          <FormTicket label={'注文日時'} value={formatDate(cardData.orderTime)} structure="left-right"></FormTicket>
          <FormTicket label={'決済日'} value={formatDate(cardData.paymentDate)} structure="left-right"></FormTicket>
          <FormTicket label={'決済方法'} value={cardData.paymentType} structure="left-right"></FormTicket>
          <FormTicket label={'集荷予定日'} value={formatDate(cardData.deliveryPlanDate)} structure="left-right"></FormTicket>
          <FormTicket label={'受注経路区分'} value={cardData.proxyOrderChLabel} structure="left-right"></FormTicket>
          <FormTicket label={'伝票番号'} value={cardData.deliveryTrackingNo} structure="left-right"></FormTicket>
          <FormTicket label={'配送方法'} value={cardData.deliveryMethod} structure="left-right"></FormTicket>
          <FormTicket label={'出荷日'} value={formatDate(cardData.shipDate)} structure="left-right"></FormTicket>
          <FormTicket label={'配送完了日'} value={formatDate(cardData.deliveryDate)} structure="left-right"></FormTicket>
        </div>

        <div>
        </div>

        <div style={{ 
          gridRow: '8 / 10', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          justifySelf: 'end',
          width: '400px', 
        }}>
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

      <hr style={dividerStyle} />

      {/* 注文者情報 */}
      <div style={{ minWidth: '48%' }} >
          <Typography style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>注文者情報</Typography>
          <div className="customer-id-value-green" >
            <FormTicket 
              label={'顧客ID'} 
              value={clientData.clientInfo.customerId} 
              structure="left-right"
              onClick={()=> {navigateN016(clientData.clientInfo.customerId)}}
              sx = {{width: '300px'}}
            ></FormTicket>
          </div>
          <div style = {formSx.form1}> 
          <FormTicket label={'注文者名称'} value={clientData.clientInfo.customerName} structure="left-right"></FormTicket>
          <FormTicket label={'住所'} value={clientData.clientInfo.address} structure="left-right"></FormTicket>
          <FormTicket label={'電話番号'} value={normalizeJapanesePhone(clientData.deliveryInfo.phoneNumber)} structure="left-right"></FormTicket>
          <FormTicket label={'メモ'} value={clientData.clientInfo.customerMemo} structure="left-right"></FormTicket>
          </div>
        </div>

      <hr style={dividerStyle} />

      {/* 注文者・届け先情報*/}
      <div style={{ 
        margin: '1rem 0', 
        display: 'flex', 
        justifyContent: 'space-between' 
      }}>
        
        {/* 商品情報*/}
        <div style={{ width: '100%' }}>
          <Typography style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>全ての商品情報</Typography>
          <div style={{maxHeight: '292px', overflow: 'auto', gap: '0.5rem',display: 'flex', flexDirection: 'column'}}>
          {productData.map((item, index) => (
            <div key={index} style={{ border: '1px solid #d0d0d0', padding: '0.5rem'}}>
              <div style={{ color: 'var(--mui-yamato-page-header-color)', marginBottom: '0.25rem' }}>{item.itemName}</div>
              <div>
                <span style={priceLabelStyle}>商品コード</span>
                {item.itemCd}
              </div>
              <div>
                <span style={priceLabelStyle}>数量</span>
                {item.qty}
              </div>
              <div>
                <span style={priceLabelStyle}>価格(税込)</span>
                ¥{formatPrice(item.itemPriceTax)}
              </div>
              <div>
                <span style={priceLabelStyle}>金額</span>
                ¥{formatPrice(item.subtotalTax)}
              </div>
            </div>
          ))}
          </div>
          <div style={{ textAlign: 'right', marginTop: '0.5rem',fontWeight: 'bold' }}>
            <span style={{ ...priceLabelStyle}}>合計送料</span>
            ¥{formatPrice(cardData.totalCarriage)}
          </div>
          <div style={{ textAlign: 'right', marginTop: '0.5rem',fontWeight: 'bold' }}>
            <span style={{ ...priceLabelStyle}}>合計請求金額</span>
            ¥{formatPrice(cardData.itemTotal)}
          </div>
        </div>
      </div>
      {
        deliveryList.map((item: any, index: any) => (
          <div>
            <hr style={dividerStyle} />
            <div style={{ 
              margin: '1rem 0', 
              display: 'flex', 
              justifyContent: 'space-between' 
            }}>
              
              {/* 商品情報*/}
              <div style={{ width: '40%' }}>
                <Typography style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>商品情報</Typography>
                <div style={{maxHeight: '292px', overflow: 'auto', gap: '0.5rem',display: 'flex', flexDirection: 'column'}}>
                {item.itemList.map((item: any, index: number) => (
                  <div key={index} style={{ border: '1px solid #d0d0d0', padding: '0.5rem'}}>
                    <div style={{ color: 'var(--mui-yamato-page-header-color)', marginBottom: '0.25rem' }}>{item.itemName}</div>
                    <div>
                      <span style={priceLabelStyle}>商品コード</span>
                      {item.itemCd}
                    </div>
                    <div>
                      <span style={priceLabelStyle}>数量</span>
                      {item.qty}
                    </div>
                    <div>
                      <span style={priceLabelStyle}>価格(税込)</span>

                      ¥{formatPrice(item.itemPriceTax)}
                    </div>
                    <div>
                      <span style={priceLabelStyle}>金額</span>
                      ¥{formatPrice(item.subtotalTax)}
                    </div>
                  </div>
                ))}
                </div>
                <div style={{ textAlign: 'left', marginTop: '0.5rem',fontWeight: 'bold' }}>
                  <span style={{ ...priceLabelStyle}}>送料</span>
                  ¥{formatPrice(item.shippingFee)}
                </div>
                <div style={{ textAlign: 'left', marginTop: '0.5rem',fontWeight: 'bold' }}>
                  <span style={{ ...priceLabelStyle}}>合計請求金額</span>
                  ¥{formatPrice(item.itemTotalTax)}
                </div>
              </div>
      
              {/* 届け先情報 */}
              <div style={{ minWidth: '48%' }}>
                <Typography style={{ fontWeight: 'bold' }}>届け先情報</Typography>
                <FormTicket label={'届け先名称'} value={item.deliveryCustomerName} structure="left-right"></FormTicket>
                <FormTicket label={'住所'} value={item.deliveryAddress} structure="left-right"></FormTicket>
                <FormTicket label={'電話番号'} value={normalizeJapanesePhone(item.deliveryPhoneNumber)} structure="left-right"></FormTicket>
                <FormTicket label={'メモ'} value={item.memo} structure="left-right"></FormTicket>
              </div>
            </div>
          </div>
        ))
      }

      {/* 問い合わせ履歴*/}
      <Dialog 
        open={isN020Open} 
        onClose={() => setIsN020Open(false)}
        maxWidth="xl" 
        fullWidth
      >
        <DialogTitle sx={{ 
          padding: '8px', 
          margin: 0, 
          display: 'flex', 
          justifyContent: 'flex-end', 
        }}>
          <IconButton 
            size="small"
            onClick={() => setIsN020Open(false)}
            sx={{ color: '#666' }}
          >
            <CloseIcon/>
          </IconButton>
        </DialogTitle>
        <DialogContent style={{ padding: '20px' }}>
           <N020 orderId={cardData.orderId} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default N007;