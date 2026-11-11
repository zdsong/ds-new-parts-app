import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm, required } from 'react-admin';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import CustomCard from '../compontent/CustomCard'
import { ColDef, RowClassParams, RowStyle } from 'ag-grid-community';
import { useParams } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx, tableSx } from '../styles/commonSX';
import useApiRequest from '../adapters/apiUtil';
import CustomModal from '../compontent/CustomModal';
import C022 from './C022';
import DataGrid, { DataGridRef } from '../compontent/DataGrid';
import { normalizeJapanesePhone } from '../utils/dataUtil';
import { farmerPasswordShow, setCredentialsAndAutoFills } from '../utils/linkUtil';
import { radioButtonStyle } from '../styles/gridSx';
import { formatDate } from '../utils/dateUtil';

// 検索フォームのプロパティインターフェース
interface SearchFormProps {
    onSubmit?: (data: any) => void;
}

// 注文明細アイテムのインターフェース
interface OrderDetailItem {
    id: string;
    itemName: string;
    qty: number | string;
    itemPriceTax: number | string,
    itemPrice: number | string;
}

// メッセージ履歴アイテムのインターフェース
interface MessageHistoryItem {
    id: string;
    sendTime: string;
    sendUser: string;
    messages: string;
    readStatusLabel: string;
    readStatus: string;
    sysMessageFlg: string;
}

// メッセージ送信パラメータのインターフェース
interface SendMessageParams {
    farmerId: string;
    messages: string;
    orderId: string;
}

// メッセージ詳細のインターフェース
interface MessageDetail {
    farmerId: string;
    farmerName: string;
    orderId: string;
}

const C006: React.FC<SearchFormProps> = () => {
    const { request } = useApiRequest();
    const { cd, farmerId, orderId } = useParams<{ 
        cd?: string,
        farmerId?: string,
        orderId?: string
    }>();
 
    const farmerRef = useRef(null)
    const messageRef = useRef(null)

    // 詳細画面から遷移してきたか判定
    const isFromDetail = !!cd || !!farmerId;
    const [showFarmSearch, setShowFarmSearch] = useState(!isFromDetail);
    const [orderIdDisabled, setOrderIdDisabled] = useState(isFromDetail);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false); // 確認ダイアログ表示状態
    const [orderFarmerId, setOrderFarmerId] = useState<string>('');
    const [orderData, setOrderData] = useState<any>(null);
    const [orderIdForConfirm, setOrderIdForConfirm] = useState<string>('');

    const [delivery,setDelivery] = useState<any>([])
    const [deliveryVoLst, setDeliveryVoLst] = useState<any>([])
    const [deliveryVoId,setDeliveryVoId] = useState<string>('')
    const [allFlg,setAllFlg] = useState<Boolean>(true)
    const user = JSON.parse(sessionStorage.getItem('user') || '{}')
    const [solveButtonShowFlg, setSolveButtonShowFlg] = useState(false)

    // カード表示用データ
    const [cardData, setCardData] = useState({
        id: '',
        farmerId: '',
        farmerName: '',
        representativeName: '',
        discontinuedFlg: '',
        mailAddress: '',
        phoneNumber: '',
        address: '',
        rakuuruCartId: '',
        rakuuruCartPwd: '',
        postalCode: '',
        discontinuedFlgLabel: '',
        orderId: '',
        orderTime: '',
        statusLabel: '',
        customerName: '',
        customerAdd: '',
        customerTel: '',
        deliveryCustomerName: '',
        deliveryCustomerAdd: '',
        deliveryCustomerTel: '',
        orderDetailDeliveryVoLst: []
    });

    // 注文明細データ
    const [orderDetailItems, setOrderDetailItems] = useState<OrderDetailItem[]>([]);
    // 農家名選択肢
    const [farmNmChoices, setFarmNmChoices] = useState<{ key: string; value: string }[]>([]);

    // 注文明細ページ番号
    const [orderDetailPage, setOrderDetailPage] = useState(1);

    // 注文情報インターフェース
    interface Order {
        orderCd: string
        login: boolean
        farmSearch: string
        farmId: string
        farmNm: string
        representativeName: string
        farmTel: string
        rakuuruCartId: string
        rakuuruCartPwd: string
        orderId: string
        orderTime: string
        statusLabel: string
        customerName: string
        customerAdd: string
        customerTel: string
        deliveryCustomerName: string
        deliveryCustomerAdd: string
        deliveryCustomerTel: string
        sendTime: string  
        messages: string  
        sendMessage: string
        [key: string]: any 
    }
    
    // 注文情報ステート
    const [Order, setOrder] = useState<Order>({
        orderCd: '',
        login: true,
        farmSearch: '',
        farmId: '',
        farmNm: '',
        representativeName: '',
        farmTel: '',
        rakuuruCartId: '',
        rakuuruCartPwd: '',
        orderId: '',
        orderTime: '',
        statusLabel: '', 
        customerName: '',
        customerAdd: '',
        customerTel: '',
        deliveryCustomerName: '',
        deliveryCustomerAdd: '',
        deliveryCustomerTel: '',
        sendTime: '',  
        messages: '',
        sendMessage: ''  
    });

    // メッセージ履歴データ
    const [messageHistoryData, setMessageHistoryData] = useState<MessageHistoryItem[]>([]);
    // グリッド参照
    const orderDetailGridRef = useRef<DataGridRef<OrderDetailItem> | null>(null);
    const messageHistoryGridRef = useRef<DataGridRef<MessageHistoryItem> | null>(null);
    // メッセージ履歴ページ情報
    const [messageHistoryPage, setMessageHistoryPage] = useState(1);
    const [messageHistoryTotal, setMessageHistoryTotal] = useState(0);
    // 検索キー（一意なID生成用）
    const [searchKey, setSearchKey] = useState(Date.now());
    const [ycsRakuuruCartDataList, setYcsRakuuruCartDataList] = useState<any>([]);
    const [ycsRakuuruCartData, setYcsRakuuruCartData] = useState<any>({});

    // モーダル状態管理
    const [modalState, setModalState] = useState({
        open: false,
        type: '',
        title: '',
        data: null,
    });

    /**
     * C022モーダルのレスポンス処理
     * @param data モーダルから返却されたデータ
     */
    const handleModalPesponseC022 = (data: any) => {
        setModalState(prev => ({ ...prev, responseData: data }));
        if (data.action === 'confirm' && data.selectedRows && data.selectedRows.length > 0) {
            const selectedOrder = data.selectedRows[0];
            handleOrderSelect(selectedOrder.orderId);
        }
        closeModal()
    }

    /**
     * モーダルを開く
     * @param type モーダルタイプ
     * @param title モーダルタイトル
     * @param data 渡すデータ
     */
    const openModal = (type: string, title: string, data: any = null) => {
        setModalState({ open: true, type, data, title });
    };

    // モーダルを閉じる
    const closeModal = () => {
        setModalState({ open: false, type: 'create', data: null, title: '' });
    };

    /**
     * モーダルコンテンツのレンダリング
     * @returns 対応するモーダルコンポーネント
     */
    const renderModalContent = () => {
        switch (modalState.type) {
            case 'C022':
                return (<C022 onConfirm={handleModalPesponseC022}></C022>);
            default:
                return null;
        }
    };

    /**
     * 確認ダイアログを閉じる（データリセット付き）
     */
    const handleCloseConfirmDialog = () => {
        setCardData(prev => ({
            ...prev,
            orderId: '',
            orderTime: '',
            statusLabel: '',
            customerName: '',
            customerAdd: '',
            customerTel: '',
            deliveryCustomerName: '',
            deliveryCustomerAdd: '',
            deliveryCustomerTel: '',
        }));

        setOrder(prev => ({
            ...prev,
            orderId: '',
            orderTime: '',
            statusLabel: '',
            customerName: '',
            customerAdd: '',
            customerTel: '',
            deliveryCustomerName: '',
            deliveryCustomerAdd: '',
            deliveryCustomerTel: '',
        }));

        setOrderDetailItems([]);
        setConfirmDialogOpen(false);
        setOrderFarmerId('');
        setOrderData(null);
        setOrderIdForConfirm('');

        setPriceTotalRow([]);
        setDeliveryVoLst([]);
        setDeliveryVoId('');
        setDelivery(null)
        // setAllFlg(true);
    };

    /**
     * 金額フォーマット関数
     * @param price 金額
     * @returns フォーマットされた金額文字列
     */
    const formatPrice = (price: any) => {
        if (!price) return '';
        // 文字列を数字に変換し、カンマ区切りを追加します
        const num = parseInt(String(price).replace(/,/g, ''), 10);
        return isNaN(num) ? price : num.toLocaleString();
    };

    /**
     * 空値フォーマッター
     * @param value 値
     * @returns 空値の場合は空白を返す
     */
    const emptyValueFormatter = (value: any) => {
        // 値が空、未定義、null、または「Invalid Number」の場合、空白を表示します
        if (!value || value === 'Invalid Number') {
            return '';
        }
        return value;
    };
    const [priceTotalRow,setPriceTotalRow] = useState<any>([])

    /**
     * 農家情報変更の確定処理
     */
    const handleConfirmChange = async () => {
        if (!orderData || !orderIdForConfirm) {
            handleCloseConfirmDialog();
            return;
        }

        try {
            // 農家情報取得
            const farmerResponse = await request('get', `api/farmer/info/byFarmId?farmId=${orderFarmerId}`);

            // カードデータ更新
            setCardData(prev => ({
                ...prev,
                ...orderData
            }));

            // 注文情報更新
            setOrder(prev => ({
                ...prev,
                'orderId': orderIdForConfirm,
                'orderTime': formatDate(orderData.orderTime),
                'statusLabel': orderData.statusLabel,
                'customerName': orderData.customerName,
                'customerAdd': orderData.address,
                'customerTel': orderData.phoneNumber,
            }));

            // 農家情報更新
            if (farmerResponse?.data) {
                setOrder(prev => ({
                    ...prev,
                    'farmSearch': orderFarmerId,
                    'farmId': farmerResponse.data.farmerId,
                    'farmNm': farmerResponse.data.farmerName,
                    'representativeName': farmerResponse.data.representativeName,
                    'farmTel': farmerResponse.data.phoneNumber,
                    'rakuuruCartId': farmerResponse.data.rakuuruCartId,
                    'rakuuruCartPwd': farmerResponse.data.rakuuruCartPwd,
                }));
                setYcsRakuuruCartDataList(farmerResponse?.data?.farmerRakuuruCartList || [])
                setYcsRakuuruCartData(farmerResponse?.data?.farmerRakuuruCartList?.length > 0 ? {...farmerResponse?.data?.farmerRakuuruCartList[0], selectedIndex: 0 } : {})
                setCardData(prev => ({
                    ...prev,
                    farmerId: farmerResponse.data.farmerId,
                    farmerName: farmerResponse.data.farmerName,
                    representativeName: farmerResponse.data.representativeName,
                    mailAddress: farmerResponse.data.mailAddress,
                    phoneNumber: farmerResponse.data.phoneNumber,
                    address: farmerResponse.data.address,
                    rakuuruCartId: farmerResponse.data.rakuuruCartId,
                    rakuuruCartPwd: farmerResponse.data.rakuuruCartPwd,
                    discontinuedFlg: farmerResponse.data.discontinuedFlg,
                    postalCode: farmerResponse.data.postalCode,
                }));
            }

        } catch (error) {
        } finally {
            setConfirmDialogOpen(false);
            setOrderFarmerId('');
            setOrderData(null);
            setOrderIdForConfirm('');
        }
    };

    /**
     * 農家リストを取得
     */
    const farmList = async () => {
        try {
            const res = await request('get', 'api/common/farmer/options');
            if (res.code === 200 && Array.isArray(res.data)) { 
            setFarmNmChoices(res.data); 
        }
    } catch (error) {
    }
};
    /**
     * 農家選択時の処理
     * @param farmId 選択された農家ID
     */
    const handleFarmerSelect = async (farmId: string | null | undefined) => {

        setPriceTotalRow([]);
        setOrderDetailItems([]);
        setDeliveryVoLst([]);
        setDeliveryVoId('');
        setDelivery(null)

        if (!farmId) {
            // 農家IDが空の場合データリセット
            setCardData(prev => ({
                ...prev,
                farmerId: '',
                farmerName: '',
                representativeName: '',
                mailAddress: '',
                phoneNumber: '',
                address: '',
                rakuuruCartId: '',
                rakuuruCartPwd: '',
            }));

            setOrder(prev => ({
                ...prev,
                'farmSearch': '',
                'farmId': '',
                'farmNm': '',
                'representativeName': '',
                'farmTel': '',
                'rakuuruCartId': '',
                'rakuuruCartPwd': '',
                orderId: '',
                orderTime: '',
                statusLabel: '',
                customerName: '',
                customerAdd: '',
                customerTel: '',
                deliveryCustomerName: '',
                deliveryCustomerAdd: '',
                deliveryCustomerTel: '',
            }));
            setYcsRakuuruCartDataList([])
            setYcsRakuuruCartData({})
            return;
        }

        try {
            // 農家詳細情報取得
            const response = await request('get', `api/farmer/info/byFarmId?farmId=${farmId}`);

            if (response?.data) {
                // カードデータ更新
                setCardData(prev => ({
                    ...prev,
                    ...response.data,
                    orderId: '',
                    orderTime: '',
                    status: '',
                    customerName: '',
                    address: '',
                    phoneNumber: '',
                    deliveryCustomerName: '',
                    deliveryCustomerAdd: '',
                    deliveryCustomerTel: '',
                    orderDetailDeliveryVoLst: []
                }));

                setYcsRakuuruCartDataList(response?.data?.farmerRakuuruCartList || [])
                setYcsRakuuruCartData(response?.data?.farmerRakuuruCartList?.length > 0 ? {...response?.data?.farmerRakuuruCartList[0], selectedIndex: 0 } : {})
                
                setOrderDetailItems([]);

                // 注文情報更新
                setOrder(prev => ({
                    ...prev,
                    'farmSearch': farmId,
                    'farmId': response.data.farmerId,
                    'farmNm': response.data.farmerName,
                    'representativeName': response.data.representativeName,
                    'farmTel': response.data.phoneNumber,
                    'rakuuruCartId': response.data.rakuuruCartId,
                    'rakuuruCartPwd': response.data.rakuuruCartPwd,
                }));
            }
        } catch (error) {
        }
    };

    /**
     * 注文選択時の処理
     * @param orderId 選択された注文番号
     */
    const handleOrderSelect = async (orderId: string | null | undefined) => {
        if (!orderId) {
            // 注文番号が空の場合データリセット
            setCardData(prev => ({
                ...prev,
                orderId: '',
                orderTime: '',
                statusLabel: '',
                customerName: '',
                customerAdd: '',
                customerTel: '',
                deliveryCustomerName: '',
                deliveryCustomerAdd: '',
                deliveryCustomerTel: '',
            }));

            setOrder(prev => ({
                ...prev,
                orderId: '',
                orderTime: '',
                statusLabel: '',
                customerName: '',
                customerAdd: '',
                customerTel: '',
                deliveryCustomerName: '',
                deliveryCustomerAdd: '',
                deliveryCustomerTel: '',
            }));
            setOrderDetailItems([]);
            setPriceTotalRow([]);
            setDeliveryVoLst([]);
            setDeliveryVoId('');
            setDelivery(null)
            // setAllFlg(true);
            return;
        }
        try {
            // 注文詳細取得
            const encodedOrderId = encodeURIComponent(orderId.replace(/%/g, '%25'));
            const response = await request('get', `api/order/info/byOrderId?orderId=${encodedOrderId}`);

            if(response && response.data) {
                // setAllFlg(true)
                setDeliveryVoLst(response.data.orderDeliveryVoLst)
                setDeliveryVoId('')
                setDelivery(response.data)
                setScrollOffset(0)
                if(response.data.orderDeliveryVoLst[0]) deliveryVoChange(response.data.orderDeliveryVoLst[0])
            }

            
            if (response?.data) {
                const orderFarmerId = response.data.farmerId;
                const currentFarmSearch = Order.farmSearch;
                const shouldUpdateFarm = !currentFarmSearch;
                
                // 農家情報が不一致の場合確認ダイアログ表示
                if (response?.data.farmerId && currentFarmSearch && currentFarmSearch !== orderFarmerId) {
                    setOrderFarmerId(orderFarmerId);
                    setOrderData(response.data);
                    setOrderIdForConfirm(orderId);
                    setConfirmDialogOpen(true);
                    return;
                }
                // カードデータ更新
                setCardData(prev => ({
                    ...prev,
                    ...response.data
                }));

                // 注文情報更新
                setOrder(prev => ({
                    ...prev,
                    'orderId': orderId,
                    'orderTime': formatDate(response.data.orderTime),
                    'statusLabel': response.data.statusLabel,
                    'customerName': response.data.customerName,
                    'customerAdd': response.data.address,
                    'customerTel': response.data.phoneNumber,
                }));

                // 農家情報未選択の場合更新
                if (response?.data.farmerId && shouldUpdateFarm) {

                    try {
                        const farmerResponse = await request('get', `api/farmer/info/byFarmId?farmId=${orderFarmerId}`);

                        if (farmerResponse?.data) {
                            setOrder(prev => ({
                                ...prev,
                                'farmSearch': orderFarmerId,
                                'farmId': farmerResponse.data.farmerId,
                                'farmNm': farmerResponse.data.farmerName,
                                'representativeName': farmerResponse.data.representativeName,
                                'farmTel': farmerResponse.data.phoneNumber,
                                'rakuuruCartId': farmerResponse.data.rakuuruCartId,
                                'rakuuruCartPwd': farmerResponse.data.rakuuruCartPwd,
                            }));
                            setYcsRakuuruCartDataList(farmerResponse?.data?.farmerRakuuruCartList || [])
                            setYcsRakuuruCartData(farmerResponse?.data?.farmerRakuuruCartList?.length > 0 ? {...farmerResponse?.data?.farmerRakuuruCartList[0], selectedIndex: 0 } : {})
                            setCardData(prev => ({
                                ...prev,
                                farmerId: farmerResponse.data.farmerId,
                                farmerName: farmerResponse.data.farmerName,
                                representativeName: farmerResponse.data.representativeName,
                                mailAddress: farmerResponse.data.mailAddress,
                                phoneNumber: farmerResponse.data.phoneNumber,
                                address: farmerResponse.data.address,
                                rakuuruCartId: farmerResponse.data.rakuuruCartId,
                                rakuuruCartPwd: farmerResponse.data.rakuuruCartPwd,
                                discontinuedFlg: farmerResponse.data.discontinuedFlg,
                                postalCode: farmerResponse.data.postalCode,
                            }));
                        }
                    } catch (error) {
                        
                        // 農家リストから一致するデータを取得
                        const matchedFarmer = farmNmChoices.find((farm: { key: string; value: string }) => farm.key === orderFarmerId);
                        if (matchedFarmer) {
                            setOrder(prev => ({
                                ...prev,
                                'farmSearch': orderFarmerId,
                                'farmId': orderFarmerId,
                                'farmNm': matchedFarmer.value,
                            }));

                            setCardData(prev => ({
                                ...prev,
                                farmerId: orderFarmerId,
                                farmerName: matchedFarmer.value,
                            }));
                        }
                    }
                }
                
            } else {

                // 注文データがない場合リセット
                setCardData(prev => ({
                    ...prev,
                    orderId: '',
                    orderTime: '',
                    statusLabel: '',
                    customerName: '',
                    address: '',
                    phoneNumber: '',
                    deliveryCustomerName: '',
                    deliveryCustomerAdd: '',
                    deliveryCustomerTel: '',
                    orderDetailDeliveryVoLst: []
                }));

                setOrder(prev => ({
                    ...prev,
                    orderId: '',
                    orderTime: '',
                    statusLabel: '',
                    customerName: '',
                    customerAdd: '',
                    customerTel: '',
                    deliveryCustomerName: '',
                    deliveryCustomerAdd: '',
                    deliveryCustomerTel: '',
                }));
                setPriceTotalRow([]);
                setOrderDetailItems([]);
            }
        } catch (error) {

            // エラー時はデータリセット
            setCardData(prev => ({
                ...prev,
                orderId: '',
                orderTime: '',
                statusLabel: '',
                customerName: '',
                address: '',
                phoneNumber: '',
                deliveryCustomerName: '',
                deliveryCustomerAdd: '',
                deliveryCustomerTel: '',
                orderDetailDeliveryVoLst: []
            }));

            setOrder(prev => ({
                ...prev,
                orderId: '',
                orderTime: '',
                statusLabel: '',
                customerName: '',
                customerAdd: '',
                customerTel: '',
                deliveryCustomerName: '',
                deliveryCustomerAdd: '',
                deliveryCustomerTel: '',
            }));

            setOrderDetailItems([]);
        }
    };

    /**
     * 詳細データの読み込み（URLパラメータ指定時）
     */
    const loadDetailData = async () => {
    if (!farmerId && !orderId) return;
    
    try {
        // 一時変数で有効なIDを保持
        let currentFarmerId = farmerId;
        let currentOrderId = (orderId && orderId !== '-') ? orderId : '';
        
        //注文情報読み込み
        if (currentOrderId) {
            setOrder(prev => ({ ...prev, orderId: currentOrderId }));
            handleOrderSelect(currentOrderId)
        }

        //農家情報読み込み
        if (!currentOrderId && currentFarmerId) {
            await handleFarmerSelect(currentFarmerId);
            setOrder(prev => ({ ...prev, farmId: currentFarmerId, farmSearch: currentFarmerId }));
        }
        
        //メッセージ履歴検索
        if (currentFarmerId || currentOrderId) {
            await handleSearch({
                farmerId: currentFarmerId,
                orderId: currentOrderId,
                sendTime: Order.sendTime,
                messages: Order.messages
            });
        }
    } catch (error) {
    }
};

    /**
     * 初期処理
     * - 農家リスト読み込み
     * - 詳細データ読み込み（必要時）
     * - メッセージイベントリスナー設定
     */
    useEffect(() => {
    farmList();
    
    if (cd || farmerId) {
        loadDetailData();
    }
    
    // 親ウィンドウに準備完了を通知
    if (window.opener) {
        window.opener.postMessage({ type: '/C005/C006/_READY' }, window.location.origin);
    }
    
    /**
     * メッセージ受信時の処理
     * @param event 受信イベント
     */
    const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data.type === 'ORDER_DATA') {
            
            const { farmerId, orderId } = event.data.payload;
            let currentFarmerId = '';
            let currentOrderId = '';
            
            // 農家情報更新
            if (farmerId) {
                currentFarmerId = farmerId;
                setOrder(prev => ({ ...prev, farmSearch: farmerId }));
                await handleFarmerSelect(farmerId);
            }
            
            // 注文情報更新
            if (orderId && orderId !== '-') {
                currentOrderId = orderId;
                setOrder(prev => ({ ...prev, orderId }));
                await handleOrderSelect(orderId);
            }
            
            // メッセージ履歴検索
            if (currentFarmerId || currentOrderId || Order.farmId || Order.orderId) {
                await handleSearch({
                    farmerId: currentFarmerId || Order.farmId,
                    orderId: currentOrderId || Order.orderId,
                    sendTime: Order.sendTime,
                    messages: Order.messages
                });
            }
        }
    };
    
    window.addEventListener('message', handleMessage);
    
    // クリーンアップ処理
    return () => {
        window.removeEventListener('message', handleMessage);
    };
    }, [request, cd]);

    /**
     * メッセージ履歴検索処理
     * @param formData 検索条件
     */
    const handleSearch = async (formData: any) => {
    try {
        //農家IDと注文番号の両方が空の場合は検索しない
        const farmerId = formData?.farmerId || Order.farmId;
        const orderId = formData?.orderId || Order.orderId;
        
        if (!farmerId && !orderId) {
            setMessageHistoryData([]);
            setMessageHistoryTotal(0);
            setMessageHistoryPage(1);
            return;
        }
        
        // 検索前にデータクリア
        setMessageHistoryData([]);
        setMessageHistoryTotal(0);
        const newSearchKey = Date.now();
        setSearchKey(newSearchKey);

        // 検索パラメータ作成
        const params = {
            sendTime: formData?.sendTime || Order.sendTime,
            messages: formData?.messages || Order.messages,
            farmerId: farmerId,
            orderId: orderId
        };
        
        
        // APIリクエスト実行
        const res = await request('post', 'api/ask/message/history/list', params,{},false,false);
        
        // レスポンスデータ整形
        let resultData: MessageHistoryItem[] = [];
        if (res.data && typeof res.data === 'object' && Array.isArray(res.data.messageHistoryList)) {
            resultData = res.data.messageHistoryList.map((item: any, index: number) => ({
                id: `${newSearchKey}-${index}`,
                sendTime: item.sendTime,
                sendUser: item.sendUser,
                messages: item.messages,
                readStatusLabel: item.readStatusLabel,
                readStatus: item.readStatus,
                sysMessageFlg: item.sysMessageFlg
            }));
            if(res.data.messageTitleEntity) {
                const flg = res.data.messageTitleEntity.status ? res.data.messageTitleEntity.status === '0' ? true : false : false
                setSolveButtonShowFlg(flg)
            }
        }
        else if (Array.isArray(res.data)) {
            resultData = res.data.map((item: any, index: number) => ({
                id: item.id || `${newSearchKey}-${index}`,
                sendTime: item.sendTime,
                sendUser: item.sendUser,
                messages: item.messages,
                readStatusLabel: item.readStatusLabel,
                readStatus: item.readStatus,
                sysMessageFlg: item.sysMessageFlg
            }));
        }
        
        // データ更新
        setMessageHistoryData(resultData);
        setMessageHistoryTotal(resultData.length);
        setMessageHistoryPage(1);
        
    } catch (err) {
        setMessageHistoryData([]);
        setMessageHistoryTotal(0);
        setMessageHistoryPage(1);
    }
    };

    /**
     * メッセージ履歴検索処理
     * @param formData 検索条件
     */
    const searchMessage = async (formData: any) => {
        try {
            //農家IDと注文番号の両方が空の場合は検索しない
            const farmerId = formData?.farmerId || Order.farmId;
            const orderId = formData?.orderId || Order.orderId;
            
            if (!farmerId && !orderId) {
                setMessageHistoryData([]);
                setMessageHistoryTotal(0);
                setMessageHistoryPage(1);
                return;
            }
            
            // 検索前にデータクリア
            setMessageHistoryData([]);
            setMessageHistoryTotal(0);
            const newSearchKey = Date.now();
            setSearchKey(newSearchKey);

            // 検索パラメータ作成
            const params = {
                sendTime: formData?.sendTime || Order.sendTime,
                messages: formData?.messages || Order.messages,
                farmerId: farmerId,
                orderId: orderId
            };
            
            
            // APIリクエスト実行
            const res = await request('post', 'api/ask/message/list', params,{},false,false);
            
            // レスポンスデータ整形
            let resultData: MessageHistoryItem[] = [];
            if (res.rows && Array.isArray(res.rows)) {
                resultData = res.rows.map((item: any, index: number) => ({
                    id: `${newSearchKey}-${index}`,
                    sendTime: item.sendTime,
                    sendUser: item.sendUser,
                    messages: item.messages,
                    readStatusLabel: item.readStatusLabel,
                    readStatus: item.readStatus,
                    sysMessageFlg: item.sysMessageFlg
                }));
            }
            
            // データ更新
            setMessageHistoryData(resultData);
            setMessageHistoryTotal(resultData.length);
            setMessageHistoryPage(1);
            
        } catch (err) {
            setMessageHistoryData([]);
            setMessageHistoryTotal(0);
            setMessageHistoryPage(1);
        }
    }

    /**
     * 注文明細ページ変更処理
     * @param current 現在のページ番号
     * @param pageSize ページサイズ
     */
    const handleOrderDetailPageChange = (current: number, pageSize: number) => {
        setOrderDetailPage(current);
    };

    /**
     * メッセージ履歴ページ変更処理
     * @param current 現在のページ番号
     * @param pageSize ページサイズ
     */
    const handleMessageHistoryPageChange = async (current: number, pageSize: number) => {
        setMessageHistoryPage(current);
    };

    /**
     * メッセージ解決処理
     */
    const handleSolve = async () => {
        try {
            const res = await request('post', 'api/ask/message/solve', {
                farmerId: Order.farmId, 
                orderId: Order.orderId, 
            });
            if(res.code === 200) setSolveButtonShowFlg(false)
            handleSearchButtonClick()
            
        } catch (err) {
        }
    };

    /**
     * メッセージ送信処理
     */
    const handleSendMessage = async () => {
    if (farmerRef.current) {
        (farmerRef.current as any).click();
        if(!Order.farmSearch) return
    }
    if (messageRef.current) {
        (messageRef.current as any).click();
        if(!Order.sendMessage) return
    }
    try {
        const sendParams: SendMessageParams = {
            farmerId: Order.farmId, 
            orderId: Order.orderId, 
            messages: Order.sendMessage.trim()
        };

        // メッセージ送信API実行
        const res = await request('post', 'api/ask/message/sendAskMessage', sendParams, {}, false, false);
        
        // レスポンスコードが200の場合のみ履歴リロード
        if (res?.code === 200) {
            // 送信後に履歴をリロード
            // 農家IDと注文番号のチェックを行う
            if (Order.farmId || Order.orderId) {
                await searchMessage(Order);
            }
            setSolveButtonShowFlg(true)
            // 入力内容クリア
            setOrder(prev => ({
                    ...prev,
                    sendMessage: '' 
            }));
        } 
    } catch (err) {
    }
    };

    /**
     * 既読処理
     */
    const handleMarkAsRead = async () => {
        try {
            // 既読API実行
            const res = await request('post', 'api/ask/message/read', {
                farmerId: Order.farmId, 
                orderId: Order.orderId, 
            });
            handleSearchButtonClick()
            
        } catch (err) {
        }
    };

    /**
     * 検索ボタンクリック時の処理
     */
    const handleSearchButtonClick = async () => {
        setMessageHistoryPage(1);
        await searchMessage(Order);
    };

    /**
     * IDリンクレンダラー
     * @param props セルプロパティ
     * @returns クリッカブルなリンク要素
     */
    const IdLinkRenderer = (props: any) => {
            const handleItemClick = () => {
                if (ycsRakuuruCartData.rakuuruCartId && ycsRakuuruCartData.rakuuruCartPwd) {
                    setCredentialsAndAutoFills(ycsRakuuruCartData.rakuuruCartId, ycsRakuuruCartData.rakuuruCartPwd)
                }
            };
    
            return (
                <div 
                    onClick={handleItemClick} 
                    style={tableSx.linkFontColumn}
                >
                    {emptyValueFormatter(props.value)}
                </div>
            );
    };

    const grid2ColumnDef: ColDef[] = [
        { 
            headerName: '商品名', 
            field: 'itemName', 
            cellRenderer: IdLinkRenderer, 
            minWidth: 300,
            valueFormatter: params => emptyValueFormatter(params.value)
        },
        {
            headerName: '価格(税込)',
            field: 'itemPriceTax',
            valueFormatter:  params => formatPrice(params.value),
            minWidth: 150,
        },
        { 
            headerName: '数量', 
            field: 'qty', 
            width: 170,
            valueFormatter: params => emptyValueFormatter(params.value)
        },
        { 
            headerName: '金額', 
            field: 'itemPrice', 
            width: 100,
            valueFormatter: params => formatPrice(params.value),
            cellStyle: { textAlign: 'right' },
        },
    ]

    const messageLinkRenderer = (props: {value: string }) => {
        return (
          <div style={{
            width: '100%',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            wordBreak: 'break-all',
            overflowWrap: 'break-word',
          }}>
            {props.value}
          </div>
        );
      };

    // メッセージ履歴グリッドカラム定義
    const grid1ColumnDef: ColDef<MessageHistoryItem>[] = useMemo(() => [
         { headerName: '受信日時', field: 'sendTime', width: 200 ,cellRenderer: (props: {value: string })=>{return(<div>{formatDate(props.value)}</div>)}},
        { headerName: '送信者', field: 'sendUser', width: 250 },
        { headerName: '既読', field: 'readStatusLabel', width: 200, cellStyle: { textAlign: 'center' }},
        { headerName: 'メッセージ', field: 'messages', cellRenderer: messageLinkRenderer, },
    ], []);

    // 監視対象の状態が変更されたら自動検索
    useEffect(() => {
        if (isFromDetail) {
        return;
    }
        // 農家IDと注文番号の両方が空の場合は検索しない
        if (!Order.farmId && !Order.orderId) {
            return;
        }
        
        // farmIdまたはorderIdが変更されたら自動検索
        const timer = setTimeout(async () => {
            await handleSearch(Order);
        }, 300); // 300ms遅延で検索（連打防止）
        
        return () => clearTimeout(timer);
    }, [Order.farmId, Order.orderId, isFromDetail]);

    const [scrollOffset, setScrollOffset] = useState(0);
    const ITEM_WIDTH = 120;
    const GAP = 2;
    const VISIBLE_COUNT = 3;

    const handleSlideClick = useCallback((clickIndex: number) => {
    if (!deliveryVoLst || deliveryVoLst.length === 0) return;
    const totalItemCount = deliveryVoLst.length;
    const maxOffset = Math.max(0, totalItemCount - VISIBLE_COUNT);
    const minOffset = 0;

    if ((scrollOffset === minOffset && clickIndex - scrollOffset === 0) || 
        (scrollOffset === maxOffset && clickIndex - scrollOffset === VISIBLE_COUNT - 1)) {
        return;
    }

    if (clickIndex - scrollOffset === VISIBLE_COUNT - 1) {
        setScrollOffset(prev => Math.min(prev + 1, maxOffset));
    } else if (clickIndex - scrollOffset === 0) {
        setScrollOffset(prev => Math.max(prev - 1, minOffset));
    }

    }, [deliveryVoLst, scrollOffset]);
 
     const deliveryVoChange = (deliveryVo: any)=>{
         if(!deliveryVo.id) return
         setDeliveryVoId(deliveryVo.id)
         setAllFlg(false)
         setOrder(prev => ({
             ...prev,
             'deliveryCustomerName': deliveryVo.deliveryCustomerName,
             'deliveryCustomerAdd': deliveryVo.address,
             'deliveryCustomerTel': deliveryVo.phoneNumber,
         }));
         setOrderDetailItems(deliveryVo.orderDetailDeliveryVoLst.map((item: any, index: number)=>{
            return {
                id: index.toString(),
                itemName: item.itemName,
                itemPrice: item.subtotalTax,
                qty: item.qty,
                itemPriceTax: item.itemPriceTax,
            }
         }))
         if (deliveryVo.orderDetailDeliveryVoLst.length > 0) {
            const totalRow = {
                id: 'bottom_row_1',
                itemName: null, // 商品名nullを使用したNULLの確保
                qty: '合計請求金額', // 商品名nullを使用したNULLの確保
                itemPriceTax: null,
                itemPrice: deliveryVo.itemTotalTax ? deliveryVo.itemTotalTax : '0' // 金額は元のデータ・フォーマットと一致するように合計を表示します
            };
            const shippingFeeRow = {
                id: 'bottom_row_2',
                itemName: null,
                itemPriceTax: null,
                qty: '送料',
                itemPrice: deliveryVo.shippingFee ? deliveryVo.shippingFee : '0'
            }
            // 合計行を商品データに追加
            setPriceTotalRow([shippingFeeRow,totalRow]);
        }
    }

    const getRowStyle = useCallback((params: RowClassParams<MessageHistoryItem>): RowStyle | undefined => {
        const rowStyle = {
            backgroundColor : 'white',
            color: '#181d1f'
        }
        if (!params.data?.readStatus || params.data?.readStatus === '0') {
            rowStyle.backgroundColor = '#fff3e0'
        }
        if (params.data?.sysMessageFlg && params.data?.sysMessageFlg === '1') {
            rowStyle.color = '#CF4648'
        }
        return rowStyle;
    }, []);

    return (
        <PageContainer title={'農家メッセージ'}>
            {/* 注文検索ボタン */}
            <div
                style={{
                    display: 'flex',
                    gap: '2rem',
                    paddingBottom: '5px',
                    borderBottom: '1px solid'
                }}
            >
                {!isFromDetail && (
                    <button
                        style={buttonSx.button}
                        onClick={() => openModal('C022', '注文検索')}
                    >
                        注文検索
                    </button>
                )}
            </div>

            {/* 農家情報・注文情報カード */}
            <div style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '2rem' }}>
                {/* 農家情報カード */}
                <CustomCard sx={{width: '100%'}} titleVariant={'body1'} title="農家情報">
                    <SimpleForm sx={{...formSx.formContainer}} onSubmit={()=>{}} toolbar={false} values={Order}>
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1 }}>
                            {showFarmSearch && (
                                <FormInput
                                    type={'filter-select'}
                                    choices={farmNmChoices}
                                    source="farmSearch"
                                    validate={[required()]}
                                    label="農家名検索"
                                    onChange={(value) => {
                                        const farmId = value && typeof value === 'object' ? value.key : value;
                                        handleFarmerSelect(farmId as string);
                                    }}
                                />
                            )}
                            <FormInput
                                type={'text'}
                                source="farmId"
                                label="農家ID"
                                disabled={true}
                                value={Order.farmId}
                            />
                            <FormInput
                                type={'text'}
                                source="farmNm"
                                label="農家名"
                                disabled={true}
                                value={Order.farmNm}
                            />
                            <FormInput
                                type={'text'}
                                source="representativeName"
                                label="代表者"
                                disabled={true}
                                value={Order.representativeName}
                            />
                            <FormInput
                                type={'text'}
                                source="farmTel"
                                label="電話番号"
                                format={(value: string) => {
                                    if (!value) return '';
                                    return normalizeJapanesePhone(value)
                                }}
                                disabled={true}
                                value={Order.farmTel}
                            />
                            <button
                            ref={farmerRef}
                            type="submit"
                            style={{ display: 'none' }}
                            ></button>
                            </div>
                            </SimpleForm>
                            {ycsRakuuruCartDataList?.length ? 
                            <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '1rem' }}>
                                <label style={{ width: '130px', marginTop: '5px' }}>らくうるカート</label>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flex: '1'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            gap: '1rem',
                                            flex: 1,
                                            marginLeft: '40px'
                                        }}
                                    >
                                    <label
                                        style={{
                                            width: '100%',
                                            marginTop: '5px',
                                        }}
                                    >
                                        ID
                                    </label>
                                    <label
                                        style={{
                                            width: '100%',
                                            marginTop: '5px',
                                        }}
                                    >
                                        パスワード
                                    </label>
                                    </div>
                                    <div style={{display: 'flex', flexDirection: 'column', overflowY: 'auto', height: '250px'}}>
                                    {
                                        ycsRakuuruCartDataList?.length > 0 ?
                                        ycsRakuuruCartDataList.map((item: any, index: any)=> {
                                            return (
                                            <SimpleForm sx={formSx.formContainer} onSubmit={handleSearch} toolbar={false} values={item}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        gap: '1rem',
                                                        width: '100%'
                                                    }}
                                                >
                                                <input
                                                    type="radio"
                                                    checked={ycsRakuuruCartData.selectedIndex === index}
                                                    onChange={() => {
                                                        setYcsRakuuruCartData({
                                                            rakuuruCartId: item.rakuuruCartId,
                                                            rakuuruCartPwd: item.rakuuruCartPwd,
                                                            selectedIndex: index,
                                                        })
                                                    }}
                                                    style={{...radioButtonStyle, marginTop: '10px'}}
                                                />
                                                <FormInput
                                                    structure='top-bottom'
                                                    type={'text'}
                                                    source="rakuuruCartId"
                                                    label=""
                                                    disabled={true}
                                                />
                                                <FormInput
                                                    structure='top-bottom'
                                                    type={'text'}
                                                    source="rakuuruCartPwd"
                                                    slotProps={{
                                                        htmlInput: {
                                                            autoComplete: 'new-password',
                                                        }
                                                    }}
                                                
                                                    label=""
                                                    disabled={true}
                                                    format={(value: string) => {
                                                        if (!value) return '';
                                                        if(!farmerPasswordShow(user.permissions || [])) {
                                                            return '******'
                                                        }
                                                        return value
                                                        
                                                    }}
                                                />
                                                </div>
                                            </SimpleForm>

                                        )})
                                        : 
                                        <SimpleForm sx={formSx.formContainer} onSubmit={handleSearch} toolbar={false} values={{}}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        gap: '1rem',
                                                        width: '100%'
                                                    }}
                                                >
                                                <input
                                                    type="radio"
                                                    style={{...radioButtonStyle, marginTop: '10px'}}
                                                    disabled={true}
                                                />
                                                <FormInput
                                                    structure='top-bottom'
                                                    type={'text'}
                                                    source="rakuuruCartId"
                                                    label=""
                                                    disabled={true}
                                                />
                                                <FormInput
                                                    structure='top-bottom'
                                                    type={'text'}
                                                    label=""
                                                    source="rakuuruCartPwd"
                                                    disabled={true}
                                                />
                                                </div>
                                        </SimpleForm>
                                    }
                                    </div>
                                </div>
                            </div> : <div style={{height: '280px'}}></div>}
                </CustomCard>

                {/* 注文情報カード */}
                <CustomCard sx={{width: '100%'}} titleVariant={'body1'} title="注文情報">
                    <SimpleForm sx={{...formSx.formContainer}} onSubmit={handleSearch} toolbar={false} values={Order}>
                        <div style={formSx.form1}>
                            <FormInput
                                type={'text-halfwidth'}
                                source="orderId"
                                label="注文番号"
                                helperTextD={orderIdDisabled ? false : true}
                                disabled={orderIdDisabled}
                                onBlur={(value) => handleOrderSelect(value as string)}
                                value={Order.orderId}
                            />
                            <FormInput
                                type={'text'}
                                source="orderTime"
                                label="注文日時"
                                disabled={true}
                                value={Order.orderTime}
                            />
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                width: '100%',
                                gap: '1rem',
                                marginTop: '5px',
                            }}
                        >
                            <label
                                style={{
                                    width: '130px',
                                    marginTop: '5px',
                                }}
                            >
                                注文内容
                            </label>
                            <div style={{width: 'calc( 100% - 130px - 1rem)', display: 'flex', flexDirection: 'column'}}>
                            { deliveryVoLst.length !== 0 && deliveryVoLst.length !== 1 ? 
                            <div 
                            style={{
                                width: `${(VISIBLE_COUNT + 1 ) * (ITEM_WIDTH + GAP) - GAP }px`, 
                                overflowX: 'hidden',
                                marginBottom: '20px',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'row'
                            }}
                            >
                                <div
                                style={{
                                display: 'flex',
                                flexDirection: 'row',
                                height: '30px',
                                gap: GAP,
                                flexWrap: 'nowrap',
                                width: 'fit-content',
                                transform: `translateX(-${scrollOffset * (ITEM_WIDTH + GAP)}px)`,
                                transition: 'transform 0.3s ease'
                                }}
                                >
                                    
                                    {deliveryVoLst?.map((item: any, index: number) => {
                                    const selectFlg = deliveryVoId === item.id
                                    return (
                                        <div
                                        key={`delivery-item-${index}`}
                                        style={{
                                            width: `${ITEM_WIDTH}px`, 
                                            height: '100%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            backgroundColor: selectFlg ? 'var(--mui-yamato-card-header-color)' : '#ccc',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            padding: '0 8px',
                                            boxSizing: 'border-box'
                                        }}
                                        onClick={()=>{
                                            deliveryVoChange(item);
                                            handleSlideClick(index);
                                        }}
                                        title={item.deliveryCustomerName4Tab}
                                        >
                                        {item.deliveryCustomerName4Tab.length > 6 
                                        ? `${item.deliveryCustomerName4Tab.substring(0, 6)}...` 
                                        : item.deliveryCustomerName4Tab}
                                        </div>
                                    )
                                    })}
                                </div>
                            </div>: <div style = {{height: '50px'}}></div>}
                            <div className="ag-theme-alpine" style={{
                                height: '173px',
                            }}>
                                <DataGrid<OrderDetailItem>
                                    ref={orderDetailGridRef}
                                    columnDefs={grid2ColumnDef}
                                    rowData={orderDetailItems}
                                    pagination={false}
                                    page={orderDetailPage}
                                    onPageChange={handleOrderDetailPageChange} 
                                    rowTotal={orderDetailItems.length}
                                    pinnedBottomRowData={priceTotalRow}
                                />
                            </div>
                            </div>
                        </div>

                        {/* 注文者・届け先情報 */}
                        <div style={formSx.form1}>
                            <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '1rem', marginTop: '5px',alignItems: 'flex-start' }}>
                                <label style={{ width: '130px',minWidth: '130px',  marginTop: '5px' }}>注文者</label>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <FormInput
                                        structure='top-bottom'
                                        type={'text'}
                                        source="customerName"
                                        label="注文者名"
                                        disabled={true}
                                        value={Order.customerName}
                                    />
                                    <FormInput
                                        structure='top-bottom'
                                        type={'text'}
                                        source="customerAdd"
                                        label="住所"
                                        disabled={true}
                                        value={Order.customerAdd}
                                    />
                                    <FormInput
                                        structure='top-bottom'
                                        type={'text'}
                                        source="customerTel"
                                        label="電話番号"
                                        format={(value: string) => {
                                            if (!value) return '';
                                            return normalizeJapanesePhone(value)
                                        }}
                                        disabled={true}
                                        value={Order.customerTel}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '1rem', marginTop: '5px',alignItems: 'flex-start' }}>
                                <label style={{ width: '130px',minWidth: '130px',  marginTop: '5px' }}>届け先</label>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <FormInput
                                        structure='top-bottom'
                                        type={'text'}
                                        source="deliveryCustomerName"
                                        label="届け先名"
                                        disabled={true}
                                        value={Order.deliveryCustomerName}
                                    />
                                    <FormInput
                                        structure='top-bottom'
                                        type={'text'}
                                        source="deliveryCustomerAdd"
                                        label="住所"
                                        disabled={true}
                                        value={Order.deliveryCustomerAdd}
                                    />
                                    <FormInput
                                        structure='top-bottom'
                                        type={'text'}
                                        source="deliveryCustomerTel"
                                        label="電話番号"
                                        format={(value: string) => {
                                            if (!value) return '';
                                            return normalizeJapanesePhone(value)
                                        }}
                                        disabled={true}
                                        value={Order.deliveryCustomerTel}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{height: '10px'}}></div>
                    </SimpleForm>
                </CustomCard>
            </div>

            {/* 検索条件フォーム */}
            <div>
                <SimpleForm sx={{...formSx.formContainer, display: 'flex', justifyContent: 'end'}} onSubmit={handleSearch} toolbar={false} values={Order}>
                    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'end', gap: '1rem' }}>
                        <FormInput 
                            type={'input-date'} 
                            source="sendTime" 
                            label={false} 
                            value={Order.sendTime}
                            onChange={(value) => setOrder({...Order, sendTime: value as string})}
                        />
                        <FormInput 
                            type={'text'} 
                            source="messages" 
                            label={false} 
                            value={Order.messages}
                            onChange={(value) => setOrder({...Order, messages: value as string})}
                        />
                        <button 
                            type="button" 
                            style={{ ...buttonSx.button, marginTop: '5px', height: '30px' }}
                            onClick={handleSearchButtonClick}
                        >
                            検索
                        </button>
                    </div>
                </SimpleForm>
            </div>

            {/* メッセージ履歴グリッド */}
            <CustomCard sx={{width: '100%'}} titleVariant={'body1'} title={'メッセージ履歴'} border={false}>
            <div style={{ ...buttonSx.buttonBar }}>
                <button
                    style={solveButtonShowFlg ? buttonSx.button : buttonSx.disabledButton}
                    type="button"
                    onClick={handleSolve}
                    disabled={!solveButtonShowFlg}
                >
                    会話を終了する
                </button>
                </div>
                <div className="ag-theme-alpine" style={{...tableSx.tableContainer,height: '220px'}}>
                    <DataGrid<MessageHistoryItem>
                        ref={messageHistoryGridRef}
                        columnDefs={grid1ColumnDef}
                        rowData={messageHistoryData}
                        rowTotal={messageHistoryTotal}
                        page={messageHistoryPage}
                        pagination={false}
                        sortable={false}
                        getRowStyle={getRowStyle}
                        defaultColDef = {{
                            sortable: false,
                            filter: false,
                            resizable: true,
                            minWidth: 100,
                            wrapText: true,
                            autoHeight: true,
                        }}
                        onPageChange={handleMessageHistoryPageChange}
                    />
                </div>
            </CustomCard>

            {/* メッセージ送信フォーム */}
            <div>
                <SimpleForm sx={{...formSx.formContainer}} toolbar={false} values={Order} >
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'end', gap: '1rem', width: '100%', marginBottom: '20px' }}>
                        <FormInput 
                            sx={{ input: { '& .MuiInputBase-root': { height: '50px', '& .MuiInputBase-input': { height: '50px !important', overflow: 'auto !important'  } }}}}
                            type={'text'}
                            source="sendMessage"
                            label={false}
                            multiline={true}
                            validate={[required()]}
                            value={Order.sendMessage}
                            onBlur={(value) => setOrder(prev => ({...prev, sendMessage: value as string}))}
                        />
                        <button
                        ref={messageRef}
                        type="submit"
                        style={{ display: 'none' }}
                        ></button>
                        <button 
                            type="button"
                            style={{ ...buttonSx.button, height: '50px', marginTop: '5px', width: '100px' }}
                            onClick={handleSendMessage}
                        >
                            送信
                        </button>
                        <button 
                            type="button"
                            style={{ ...buttonSx.button, height: '50px', marginTop: '5px', width: '100px' }}
                            onClick={handleMarkAsRead}
                        >
                            既読
                        </button>
                    </div>
                </SimpleForm>
            </div>

            {/* カスタムモーダル */}
            <CustomModal
                open={modalState.open}
                onClose={closeModal}
                title={modalState.title}
                maxWidth='lg'
            >
                {renderModalContent()}
            </CustomModal>

            {/* 確認ダイアログ */}
            <Dialog
                open={confirmDialogOpen}
                onClose={handleCloseConfirmDialog}
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <DialogTitle id="confirm-dialog-title">農家情報変更の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText id="confirm-dialog-description">
                        注文の農家と選択中の農家が一致しません。農家情報を変更しますか？
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog} color="primary">
                        キャンセル
                    </Button>
                    <Button onClick={handleConfirmChange} color="primary" autoFocus>
                        確定
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};

export default C006;