import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FormInput from '../compontent/FormInput';
import { pageSx } from '../styles/commonSX';
import { Box } from '@mui/material';
import useApiRequest from '../adapters/apiUtil';
import FormTicket from '../compontent/FormTicket';

// 検索フォームのプロパティインターフェース
interface SearchFormProps { }
// 商品画像インターフェース
interface ItemImage {
  imageUrl: string;
}
// カードデータインターフェース
interface CardData {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  janCode: string;
  sumarejiItemId: string;
  category1: string;
  category2: string;
  salesPrice: string;
  discontinuedFlg: string;
  courierSizeFlgLabel: string;
  dlvdeliveryFlg: string;
  handlingType1Flg: string;
  handlingType1FlgLabel: string;
  handlingType2Flg: string;
  handlingType2FlgLabel: string;
  salesFlg: string;
  deliveryMethod: string;
  reqCropYield: string;
  courierSizeFlg: string;
  askagingFlgLabel: string;
  imageUrls?: any,
  imageOtherUrls?: any,
  imageListUrls?: any,
  imagesOgUrls?: any,
}
const N010: React.FC<SearchFormProps> = () => {
  const { cd } = useParams<{ cd: string }>();
  // URLパラメータを取得するためuseSearchParamsを追加
  const [searchParams] = useSearchParams();
  const { request } = useApiRequest();
  useEffect(() => {
    if (cd) {
      fetchCustomerData(cd);
    }
  }, [cd, searchParams]);
  const [cardData, setCardData] = useState<CardData>({
    id: '',
    itemId: '',
    itemCode: '',
    itemName: '',
    janCode: '',
    sumarejiItemId: '',
    category1: '',
    category2: '',
    salesPrice: '',
    discontinuedFlg: '',
    courierSizeFlgLabel: '',
    dlvdeliveryFlg: '',
    handlingType1Flg: '',
    handlingType1FlgLabel: '',
    handlingType2Flg: '',
    handlingType2FlgLabel: '',
    salesFlg: '',
    deliveryMethod: '',
    reqCropYield: '',
    courierSizeFlg: '',
    askagingFlgLabel: '',
    imageUrls: [],
    imageOtherUrls: [],
    imageListUrls: [],
    imagesOgUrls: [],
  });
  // お客様の詳細を取得し、テーブルデータをロードする
  const fetchCustomerData = async (id: string) => {
    const data = await request('get', 'api/item/info/' + id);
    setCardData(data?.data);
  };
  const navigate = useNavigate();
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
  return (
    <Box sx={pageSx.pageContainer}>
      <div>
      <Box sx={pageSx.titleContainer}>
        <div style = {{display: 'flex', flexDirection: 'column'}}>
          <span style={{ marginRight: '4px', color: 'var(--mui-yamato-page-header-color)', }} onClick={handleGoBack}>&lt; 戻る</span>
          <label style={pageSx.title}>
        商品詳細
        </label>
      </div>
      </Box>
      <div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 'auto', color: "#999999ff", marginTop: '5px' }}>
            <FormTicket
              structure='left-right'
              label='商品ID'
              value={cardData.itemId}
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
            label='商品名'
            value={cardData.itemName || '-'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='JANコード'
            value={cardData.janCode || '-'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='スマレジ商品ID'
            value={cardData.sumarejiItemId || '-'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='金額'
            value={cardData.salesPrice ? '￥' + cardData.salesPrice.toLocaleString() : '￥0'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='販売停止'
            value={cardData.salesFlg === '0' ? '有効': '停止'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='配送方法'
            value={cardData.deliveryMethod || '-'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='配送サイズ'
            value={cardData.courierSizeFlgLabel || '-'}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='荷扱い'
            value={`${cardData.handlingType1FlgLabel || '-'}${'\n'}${cardData.handlingType2FlgLabel || '-'} `}
          >
          </FormTicket>
        </div>
        <div style={{ marginTop: '10px' }}>
          <FormTicket
            structure='left-right'
            label='梱包関連'
            value={cardData.askagingFlgLabel || '-'}
          >
          </FormTicket>
        </div>
      </div>
      {cardData.imageUrls && cardData.imageUrls.length > 0 ? 
      <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}
          >
            {cardData.imageUrls && Array.isArray(cardData.imageUrls) && cardData.imageUrls.map((image, index) => { if(image.imageUrl) return (
              <FormInput
                key={index}
                structure='top-bottom'
                type='image'
                label=''
                value={{ preview: image.imageUrl }}
                onChange={(value) => {
                }}
                hideDeleteButton={true}
              />
            )})}
          </div>
        </div> : '' }
        {cardData.imageOtherUrls && cardData.imageOtherUrls.length > 0 ? 
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>他画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}
          >
            {cardData.imageOtherUrls && Array.isArray(cardData.imageOtherUrls) && cardData.imageOtherUrls.map((image, index) => { if(image.imageUrl) return (
              <FormInput
                key={index}
                structure='top-bottom'
                type='image'
                label=''
                value={{ preview: image.imageUrl }}
                onChange={(value) => {
                }}
                hideDeleteButton={true}
              />
            )})}
          </div>
        </div> : '' }
        {cardData.imageListUrls && cardData.imageListUrls.length > 0 ? 
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>一覧用画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}
          >
            {cardData.imageListUrls && Array.isArray(cardData.imageListUrls) && cardData.imageListUrls.map((image, index) => { if(image.imageUrl) return (
              <FormInput
                key={index}
                structure='top-bottom'
                type='image'
                label=''
                value={{ preview: image.imageUrl }}
                onChange={(value) => {
                }}
                hideDeleteButton={true}
              />
            )})}
          </div>
        </div> : '' }
        {cardData.imagesOgUrls && cardData.imagesOgUrls.length > 0 ? 
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>og:画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}
          >
            {cardData.imagesOgUrls && Array.isArray(cardData.imagesOgUrls) && cardData.imagesOgUrls.map((image, index) => { if(image.imageUrl) return (
              <FormInput
                key={index}
                structure='top-bottom'
                type='image'
                label=''
                value={{ preview: image.imageUrl }}
                onChange={(value) => {
                }}
                hideDeleteButton={true}
              />
            )})}
          </div> 
        </div> : ''}
        <hr style={dividerStyle} />
        </div>
    </Box>
  );
};

export default N010;