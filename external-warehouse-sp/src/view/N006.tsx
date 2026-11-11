import React, { useEffect, useRef, useState } from 'react';
import {SimpleForm, useNotify, useTranslate } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, ticketSx, cardSx, pageSx } from '../styles/commonSX';
import { Box, Typography } from '@mui/material';
import useApiRequest from '../adapters/apiUtil';
import CustomModal from '../compontent/CustomModal';
import searchIcon from '../assets/icons/search-icon.png';
import FormTicket from '../compontent/FormTicket';
import { formatDate } from '../utils/dateUtil';
import useDisableBrowserBack from '../layout/useDisableBrowserBack';
import DataListWithPagination from '../compontent/DataListWithPagination';
import { normalizeJapanesePhone } from '../utils/dataUtil';

/**
 * 注文データのインターフェース定義
 * 注文一覧に表示される各項目の型情報
 */
interface Order {
  orderId: string;         
  orderTime: string;        
  category: string;         
  statusLabel: string;      
  itemName: string;   
  itemList: Item[];     
  qty: string;              
  status: string;          
  customerName: string;    
  deliveryCustomerName: string; 
  deliveryAddress: string; 
  deliveryPlanDate: string; 
  paymentDate: string;      
  shipDate: string;        
  deliveryDate: string;     
  deliveryTrackingNo: string; 
  dlvdeliveryFlgLabel: string; 
  id: string;               
  uniqueId: string;      
  itemCd: string;
  phoneNumber: string;
  deliveryPhoneNumber: string;
  proxyOrderChLabel: string;   
}

interface Item {
  deliveryId: string;
  farmerId: string;
  itemCd: string;
  itemId: string;
  itemName: string;
  itemPrice: number;
  itemPriceTax: number;
  itemSalasTax: number;
  orderDate: string;
  orderId: string;
  qty: number;
  status: string;
  subtotal: number;
  subtotalTax: number;
  sysItemCode: string;
}

// 検索フォームのプロパティインターフェース
interface SearchFormProps {}

// 農家管理画面コンポーネント 
const N006: React.FC<SearchFormProps> = () => {

  useDisableBrowserBack('');
  
  // ページ遷移用フック
  const navigate = useNavigate();
  const { request } = useApiRequest();

  const [data, setData] = useState<Order[]>([]) 
  const [total,setTotal] = useState(0)                   
  const [searchForm,setSearchForm] = useState<any>({}) 
  const [statusOptions, setStatusOptions] = useState<{ id: string; name: string }[]>([]); 
  const [formKey, setFormKey] = useState(0);

  const infiniteListRef = useRef<{ resetPage: () => void, getPageSize: ()=>number }>(null);

  /**
   * 注文データ検索処理
   * @param searchData 検索条件
   * @param pagination ページネーション情報（現在ページ、ページサイズ）
   */
  const searchData = async (searchData:Record<string, any> ,pagination: Record<string, any>) => {
      const result = await request('post','api/order/list',{...searchData, pcSearchFlg: false}, pagination,false,false);
      const rowsWithUniqueId = result?.rows?.map((row: any, index: number) => ({
        ...row,
        uniqueId: `${row.id}-${index}`
      }));
      setData(rowsWithUniqueId || [])
      setTotal(result.total);  
  };

  const deliveryPlanDateRef = useRef(null);
  const orderDateRef = useRef(null);
  const notify = useNotify()
  const translate = useTranslate();

  /**
   * 検索フォーム提交時の処理
   */
  const handleSearch = async (searchForm: Record<string, any>) => {
    if(searchForm.deliveryPlanDate && searchForm.deliveryPlanDate.startDate && searchForm.deliveryPlanDate.endDate){
      if ((new Date(searchForm.deliveryPlanDate.endDate)) < (new Date(searchForm.deliveryPlanDate.startDate))) {
        notify(translate('ra.message.error_date_range'), {type: 'error'})
          if (deliveryPlanDateRef.current) {
              (deliveryPlanDateRef.current as any).focus();
          }
          return
      }
      
    }
    if(searchForm.orderDate && searchForm.orderDate.startDate && searchForm.orderDate.endDate){
      if ((new Date(searchForm.orderDate.endDate)) < (new Date(searchForm.orderDate.startDate))) {
        notify(translate('ra.message.error_date_range'), {type: 'error'})
          if (orderDateRef.current) {
              (orderDateRef.current as any).focus();
          }
          return
      }
    }
    setSearchForm(searchForm);
    setData([]);
    
    infiniteListRef.current?.resetPage();
    
    const pageSize = infiniteListRef.current?.getPageSize();
    await searchData({...searchForm, proxyOrderChList: searchForm.proxyOrderCh ? [searchForm.proxyOrderCh] : [] }, { current: 1, pageSize: pageSize });
    
    setModalState(prev => ({ ...prev, open: false }));
  };

  /**
   * グリッドのページ切り替え処理 
   */
  const handlePageChange = async (current: number, pageSize: number) => {
    await searchData(searchForm, { current, pageSize });
  };

  /**
   * 注文番号クリック時の詳細画面遷移処理
   */
  const handleIdClick = (orderId: string) => {
    navigate(`/N006/N007/${orderId}`);
  };

  /**
   * ステータス選択肢の取得処理 
   */
  const fetchStatusOptions = async () => {
    try {
      const cmdOptionName = 'bss_order_status';
      const res = await request(
        'post',
        'api/common/options',
        { cmdOptionName },
        {},
        false,
        false
      );
      if (res.code === 200 && Array.isArray(res.data)) { 
        setStatusOptions(res.data); 
      }
    } catch (error) {
      console.error('ステータス選択肢取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchStatusOptions();
  }, []);

  /**
   * 初期データ読み込み
   */
  useEffect(() => {
    const initSearch = async () => {
      const defaultPageSize = infiniteListRef.current?.getPageSize() || 10;
      await searchData({}, { current: 1, pageSize: defaultPageSize });
    };
    initSearch();
  }, []);

  /**
   * 検索条件クリア処理
   */
  const handleClear = async () => {
    if (deliveryPlanDateRef.current) {
      (deliveryPlanDateRef.current as any).clear();
    }
    if (orderDateRef.current) {
      (orderDateRef.current as any).clear();
    }
    setSearchForm({});
    setFormKey(prevKey => prevKey + 1); 
    setTotal(0); 
    
    infiniteListRef.current?.resetPage();
    
    const defaultPageSize = infiniteListRef.current?.getPageSize();
    await searchData({}, { current: 1, pageSize: defaultPageSize });
  };

  const [modalState, setModalState] = useState({
    open: false,
  });

  const closeModal = () => {
    setModalState({ ...modalState, open: false });
  };

  const handleToggleChat = () => {
    setModalState(prev => ({ ...prev, open: !prev.open }));
  };

  /**
   * 商品カードレンダラー
   */
  const itemListCard = (item: any) => {
    return (
      <Box
      sx={cardSx}
      >
        <div
          style={{
            padding: '10px',
            borderBottom: '1px solid #d9d9d9',
          }}
        >
          <div>{item.itemName}</div>
        </div>
        <Box>
        <div style={{display: 'flex', flexDirection: 'column', margin: '2px 20px'}}>
          <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'商品コード'} value={item.itemCd || ''} />
          <FormTicket sx={ticketSx.ticket1} structure='left-right' label={'数量'} value={item.qty} />
        </div>
        </Box>
      </Box>
    );
  };

  /**
   * 注文カードレンダラー 
   */
  const orderListCard = (order: Order) =>{
    return (
      <Box
      sx={cardSx}
      onClick={()=>{handleIdClick(order.orderId)}}
      >
        <div
          style={{
            padding: '2px 10px',
            borderBottom: '1px solid #d9d9d9',
            backgroundColor: 'var(--mui-yamato-card-header-color)'
          }}
        >
          <div>{order.paymentDate ? formatDate(order.paymentDate) : ''}</div>
          <div style={{display: 'flex', justifyContent: 'end', fontSize: '13px', color: '#7f7f7f'}}><div>{'注文番号：' + (order.orderId || '')}</div></div>
        </div>
        <Box>
          <div style={{display: 'flex', flexDirection: 'column', margin: '2px 20px'}}>
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={'注文者名称'} value={order.customerName ? order.customerName + '  様' : ''} />
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={'電話番号'} value={normalizeJapanesePhone(order.deliveryPhoneNumber) || ''} />
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={'届け先名称'} value={order.deliveryAddress || ''} />
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={''} value={order.deliveryCustomerName ? order.deliveryCustomerName + '  様' : ''} />
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={'電話番号'} value={normalizeJapanesePhone(order.phoneNumber) || ''} />
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={'集荷予定日'} value={formatDate(order.deliveryPlanDate) || ''} />
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={'伝票番号'} value={order.deliveryTrackingNo || ''} />
            <FormTicket sx={ticketSx.ticket2} structure='left-right' label={'受注経路区分'} value={order.proxyOrderChLabel || ''} />
          </div>
        </Box>
      </Box>
    );
  };

  const [sysBssProxyOrderCh, setSysBssProxyOrderCh] = useState([])

  useEffect(() => {

      const fetchCommonCode = async () => {
      try {
          const sysBssProxyOrderChData = await request(
              'post', 
              'api/common/options',
              { cmdOptionName: 'bss_proxy_order_ch' },
              {},
              false,
              false
              );

              setSysBssProxyOrderCh(sysBssProxyOrderChData.data.map((item: { key: string; }) => {
                if(item.key === '00'){
                  return {...item, value: '経路なし'}
                }
                return item
              }))
      } catch (error) {
          console.error(error);
      }
      }
      fetchCommonCode();
    }, []);

  /**
   * 検索モーダルコンテンツレンダラー
   */
  const renderModalContent = () => {
    return (
      <Box sx={{
        margin: '0 20px',
        height: '100%'
      }}>
        <SimpleForm
          sx={{...formSx.formContainer, height: '100%'}}
          onSubmit={handleSearch}
          toolbar={false}
          values={searchForm}
          key={formKey} // クリア時にフォームリセットするためのkey
        >
          <Box sx={formSx.form}>
            <FormInput
              ref={deliveryPlanDateRef}
              type={'input-daterange'}
              source="deliveryPlanDate"
              label="集荷予定日"
              onChange={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                deliveryPlanDate: {
                  ...prev.deliveryPlanDate,
                  ...value
                },
            }));}}
              />
            <FormInput
              ref={orderDateRef}
              type={'input-daterange'}
              source="orderDate"
              label="注文日時"
              onChange={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                orderDate: {
                  ...prev.orderDate,
                  ...value
                },
            }));}}
              />
            <FormInput
              type={'filter-select'}
              source="status"
              label="ステータス"
              choices={statusOptions}
              onChange={(e)=>{setSearchForm((prev: any) => ({
                ...prev,
                status: e.key,
            }));}}
            />
            <FormInput
              type={'text'}
              source="deliveryTrackingNo" 
              label="伝票番号"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                deliveryTrackingNo: value,
            }));}}
              />
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
              type={'text-halfwidth'}
              source="itemCd"
              label="商品コード"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                  ...prev,
                  itemCd: value,
              }));}}
            />
            <FormInput
              type={'text'}
              source="customerName"
              label="注文者名称"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                  ...prev,
                  customerName: value,
              }));}}
            />
            <FormInput
              type={'text'}
              source="deliveryCustomerName"
              label="届け先名称"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                deliveryCustomerName: value,
            }));}}
            />
            <FormInput
              type={'text-number'}
              source="phoneNumber"
              label="電話番号"
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
              type={'filter-select'}
              source="proxyOrderCh"
              choices={sysBssProxyOrderCh}
              label="受注経路"
              onBlur={(e)=>{setSearchForm((prev: any) => ({
                  ...prev,
                  proxyOrderCh: e.key,
              }));}}
            />
            
          </Box>
            <div style={buttonSx.buttonBar}>
              <button style={{...buttonSx.button, width: '200px'}} type="submit">
                検索 
              </button>
              <button 
                style={{...buttonSx.button, backgroundColor: 'gray',width: '100px'}} 
                type='button'
                onClick={handleClear}
              >
                クリア
              </button>
          </div>
        </SimpleForm>
      </Box>
    );
  };

  return (
    <Box sx={pageSx.pageContainer}>
      {/* ヘッダー */}
      <Box sx={pageSx.titleContainer}>
      <label style={pageSx.title}>
          注文一覧 
        </label>
        <Typography 
          sx={{ display: 'flex', color: 'var(--mui-yamato-page-header-color)', cursor: 'pointer' }}
          component="h2" 
          onClick={handleToggleChat}
        >
          <img 
            src={searchIcon} 
            alt="searchIcon" 
            style={{ height: '20px', marginRight: '3px'}}
          />
          検索条件
        </Typography>
      </Box>
      {
        data.length > 0 ?
        <DataListWithPagination
          ref={infiniteListRef}
          data={data}
          renderCard={orderListCard}
          rowTotal={total}
          pageChange={handlePageChange}
        />: 
        <div style={{display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center'}}> 
        <Typography variant="caption" color="text.secondary">
          {data.length > 0 ? '' : '該当するデータはありません。'}
        </Typography>
        </div>
      }
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

export default N006;