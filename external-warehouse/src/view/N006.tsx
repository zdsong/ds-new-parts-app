import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ColDef } from 'ag-grid-community';
import { SimpleForm, useNotify, useTranslate } from 'react-admin';
import SearchCard from '../compontent/SearchCard';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import useApiRequest from '../adapters/apiUtil';
import { formatDate } from '../utils/dateUtil';
import useDisableBrowserBack from '../layout/useDisableBrowserBack';
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

interface SearchFormProps {}

const N006: React.FC<SearchFormProps> = () => {

  useDisableBrowserBack('');

  // ページ遷移用フック（詳細画面への遷移に使用）
  const navigate = useNavigate();

  const { request } = useApiRequest();

  // 状態管理変数
  const [data, setData] = useState<Order[]>([]) 
  const [total,setTotal] = useState(0)               
  const [pageNum, setPageNum] = useState(1)         
  const [searchForm,setSearchForm] = useState<any>({}) 
  const [statusOptions, setStatusOptions] = useState<{ id: string; name: string }[]>([]); 
  const [formKey, setFormKey] = useState(0);         

  const newGridRef = useRef<DataGridRef<Order> | null>(null);

  /**
   * 注文データ検索処理
   * @param searchData 検索条件
   * @param pagination ページネーション情報（現在ページ、ページサイズ）
   */
  const searchData = async (searchData:Record<string, any> ,pagination: Record<string, any>) => {
    const result = await request('post','api/order/list',{...searchData, pcSearchFlg: true}, pagination)
    const rowsWithUniqueId = result.rows.map((row: any, index: number) => ({
      ...row,
      uniqueId: `${row.id}-${index}`,
      orderTime: row.orderTime ? formatDate(row.orderTime) : '',
      paymentDate: row.paymentDate ? formatDate(row.paymentDate) : '',
      deliveryPlanDate: row.deliveryPlanDate ? formatDate(row.deliveryPlanDate) : '',
      shipDate: row.shipDate ? formatDate(row.shipDate) : '',
      deliveryDate: row.deliveryDate ? formatDate(row.deliveryDate) : '',
    }))
    setData(rowsWithUniqueId) 
    setTotal(result.total)  
  }

  const deliveryPlanDateRef = useRef(null);
  const orderDateRef = useRef(null);
  const notify = useNotify()
  const translate = useTranslate();

  /**
   * 検索フォーム提交時の処理
   * 検索条件を保存し、最初のページからデータを取得
   * @param searchForm フォームから渡される検索条件
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
    setSearchForm(searchForm)
    setPageNum(1)          
    searchData(searchForm,{current: 1, pageSize: newGridRef.current?.getPageSize()})
  };

  /**
   * グリッドのページ切り替え処理
   * @param current 切り替え先のページ番号
   * @param pageSize ページサイズ
   */
  const handlePageChange = async (current: number, pageSize: number) => {
    setPageNum(current) // 現在のページ番号を更新
    searchData(searchForm,{current: current, pageSize: pageSize})
  };

  /**
   * 注文IDクリック時の詳細画面遷移処理
   * @param id 注文レコードの固有ID
   */
  const handleIdClick = (orderId: string) => {
    navigate(`/N006/N007/${orderId}`);
  };

  /**
   * 注文IDセルのレンダラー
   * クリック可能なリンク形式で注文IDを表示
   * @param props グリッドセルのプロパティ（データ、表示値）
   * @returns クリック可能な注文ID要素
   */
  const IdLinkRenderer = (props: { data: Order; value: string }) => {
    const handleClick = () => {
      handleIdClick(props.data.orderId);
    };

    return (
      <div onClick={handleClick} style={tableSx.linkFontColumn}>
        {props.value}
      </div>
    );
  };

  /**
   * グリッドの列定義
   * useMemoでメモ化し、不要な再レンダリングを防止
   */
  const columnDefs = useMemo<ColDef<Order>[]>(
    () => [
      { headerName: '注文番号', field: 'orderId', cellRenderer: IdLinkRenderer, width: 150 },
      { headerName: '注文日時', field: 'orderTime', width: 200 },
      { headerName: 'ステータス', field: 'statusLabel', width: 200  },
      { headerName: '注文者名称', field: 'customerName', width: 200  },
      { headerName: '注文者（電話番号）', field: 'phoneNumber', cellRenderer: (props: { value: string; })=>{return (<div>{normalizeJapanesePhone(props.value)}</div>)}, width: 200  },
      { headerName: '届け先名称', field: 'deliveryCustomerName', width: 200  },
      { headerName: '届け先（電話番号）', field: 'deliveryPhoneNumber', cellRenderer: (props: { value: string; })=>{return (<div>{normalizeJapanesePhone(props.value)}</div>)}, width: 200  },
      { headerName: '届け先（住所）', field: 'deliveryAddress', width: 300 },
      { headerName: '受注経路区分', field: 'proxyOrderChLabel', width: 200  },
      { headerName: '決済日', field: 'paymentDate', width: 200  },
      { headerName: '集荷予定日', field: 'deliveryPlanDate', width: 200 },
      { headerName: '伝票番号', field: 'deliveryTrackingNo', width: 200  },
    ],
    [] 
  );

  /**
   * ステータス選択肢の取得処理
   * 共通APIから注文ステータスの選択肢を取得
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
    }
  };

  useEffect(() => {
    fetchStatusOptions();
  }, []);

  // 自動クエリーの初期化
  useEffect(() => {
    const initSearch = async () => {
      const defaultPageSize = newGridRef.current?.getPageSize();
      await searchData({}, { current: 1, pageSize: defaultPageSize });
    };

    initSearch();
  }, []);

  /**
   * 検索条件クリア処理
   * フォームデータ、一覧データ、ページ情報をリセット
   */
  const handleClear = async () => {
    if (deliveryPlanDateRef.current) {
      (deliveryPlanDateRef.current as any).clear();
    }
    if (orderDateRef.current) {
        (orderDateRef.current as any).clear();
    }
    setSearchForm({
      discontinuedFlg: sysBssProxyOrderCh.filter((item: { isDefault: string; }) => item.isDefault === 'Y')?.map((item: { key: any; }) => item.key),
    });
    setFormKey(prevKey => prevKey + 1); 
    setTotal(0); 
    setPageNum(1); 
    const defaultPageSize = newGridRef.current?.getPageSize();
    await searchData({}, { current: 1, pageSize: defaultPageSize });
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

          setSearchForm((prev: any)=>({
              ...prev,
              discontinuedFlg: prev.discontinuedFlg ? prev.discontinuedFlg : sysBssProxyOrderChData.data?.filter((item: { isDefault: string; }) => item.isDefault === 'Y')?.map((item: { key: any; }) => item.key),
          }))
      } catch (error) {
          console.error(error);
      }
      }
      fetchCommonCode();
    }, []);

  return (
    <PageContainer title={'注文一覧'}>
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
          values={searchForm}
        >
          <div style={formSx.form1}>
            <FormInput
              ref={deliveryPlanDateRef}
              type={'input-daterange'}
              source="deliveryPlanDate"
              label="集荷予定日"
              onChange={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                deliveryPlanDate: value,
            }));}}
              />
            <FormInput
              ref={orderDateRef}
              type={'input-daterange'}
              source="orderDate"
              label="注文日時"
              onChange={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                orderDate: value,
            }));}}
              />
            <FormInput
              type={'filter-select'}
              source="status"
              label="ステータス"
              choices={statusOptions}
              onChange={(value)=>{setSearchForm((prev: any) => ({
                ...prev,
                status: value.key,
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
              type={'multiple-choice'}
              source="proxyOrderChList"
              choices={sysBssProxyOrderCh}
              label="受注経路"
              onBlur={(value)=>{setSearchForm((prev: any) => ({
                  ...prev,
                  proxyOrderChList: value,
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
                gap:'30px',
                marginTop: '20px',
            }}>
              <button style={{...buttonSx.button, width: '300px'}} type="submit">
                検索 
              </button>
              <button style={{...buttonSx.button, backgroundColor: 'gray'}} type='button' onClick={handleClear}>
                クリア
              </button>
            </div>
          </div>
        </SimpleForm>
      </SearchCard>

        {/* 注文一覧グリッド */}
        <div className="ag-theme-alpine" style={tableSx.tableContainer}>
          <DataGrid<Order>
            ref={newGridRef}
            columnDefs={columnDefs} 
            rowData={data} 
            rowTotal={total}
            page={pageNum} 
            pagination = {true} 
            onPageChange={handlePageChange}
            rowUniqueKey="uniqueId"
          />
        </div>
    </PageContainer>
  );
};

export default N006;