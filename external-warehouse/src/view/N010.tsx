import React, { useState, useEffect } from 'react';
import {  SimpleForm } from 'react-admin';
import { useParams, useSearchParams } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { formSx } from '../styles/commonSX';;
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
  dlvdeliveryFlg: string;
  handlingType1Flg: string;
  handlingType1FlgLabel: string;
  handlingType2Flg: string;
  handlingType2FlgLabel: string;
  salesFlg: string;
  deliveryMethod: string;
  reqCropYield: string;
  courierSizeFlg: string;
  courierSizeFlgLabel: string;
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
    dlvdeliveryFlg: '',
    handlingType1Flg: '',
    handlingType1FlgLabel: '',
    handlingType2Flg: '',
    handlingType2FlgLabel: '',
    salesFlg: '',
    deliveryMethod: '',
    reqCropYield: '',
    courierSizeFlg: '',
    courierSizeFlgLabel: '',
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
  const [formData, setFormData] = useState({
    image1: '',
    image2: '',
    image3: ''
  })

  // 分割線スタイルぶんかつせんすたいる
  const dividerStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '3px solid #999',
    margin: '1.5rem 0',
    width: '100%'
  };


  const handleSearch = async (searchForm: Record<string, any>) => {};

  return (
    <PageContainer title={'商品詳細'} returnButton={true}>
      <SimpleForm
        sx={formSx.formContainer}
        onSubmit={handleSearch}
        toolbar={false}
        defaultValues={formData}
      >
        <div
          style={formSx.form1}
        >
          <FormTicket
            structure='left-right'
            label='商品ID'
            value={cardData.itemId}
          >
          </FormTicket>
          <div></div>
          <FormTicket
            structure='left-right'
            label='商品名'
            value={cardData.itemName || '-'}
          >
          </FormTicket>
          <div></div>
          <FormTicket
            structure='left-right'
            label='JANコード'
            value={cardData.janCode || '-'}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='スマレジ商品ID'
            value={cardData.sumarejiItemId || '-'}
            sx={{
              label: {
                width: '120px' // ラベルの幅を直接変更するには
              }
            }}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='金額'
            value={cardData.salesPrice || '-'}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='販売停止'
            value={cardData.salesFlg === '0' ? '有効': '停止'}
            sx={{
              label: {
                width: '120px' // ラベルの幅を直接変更するには
              }
            }}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='配送方法'
            value={cardData.deliveryMethod || '-'}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='配送サイズ'
            value={cardData.courierSizeFlgLabel || '-'}
            sx={{
              label: {
                width: '120px'
              }
            }}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='荷扱い'
            value={`${cardData.handlingType1FlgLabel || '-'}${'\u00A0'.repeat(30)}${cardData.handlingType2FlgLabel || '-'} `}
          >
          </FormTicket>
          <FormTicket
            structure='left-right'
            label='梱包関連'
            value={cardData.askagingFlgLabel || '-'}
            sx={{
              label: {
                width: '120px'
              }
            }}
          >
          </FormTicket>
        </div>
        {cardData.imageUrls && cardData.imageUrls.length > 0 ? 
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'row', gap: '1rem'
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
        </div>:''}
        {cardData.imageOtherUrls && cardData.imageOtherUrls.length > 0 ? 
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>他画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'row', gap: '1rem'
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
        </div>:''}
        {cardData.imageListUrls && cardData.imageListUrls.length > 0 ? 
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>一覧用画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'row', gap: '1rem'
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
        </div>:''}
        {cardData.imagesOgUrls && cardData.imagesOgUrls.length > 0 ? 
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '2rem', minHeight: '29px'}}
        >
          <label style={{ width: '100px' }}>og:画像</label>
          <div
            style={{
              display: 'flex', flexDirection: 'row', gap: '1rem'
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
        </div> : '' }
        <hr style={dividerStyle} />
        <div style={{ ...formSx.form1, marginTop: '20px', position: 'relative', minHeight: '50px' }}>
        </div>
      </SimpleForm>
    </PageContainer>
  );
};

export default N010;