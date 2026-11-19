import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../compontent/PageContainer';
import FormTicket from '../compontent/FormTicket';
import useApiRequest from '../adapters/apiUtil';

interface ItemDetail {
  itemCode: string;
  itemName: string;
  prprkn: string;
  prprkj: string;
  prkku: string;
  prhnmx: string;
  prbiko: string;
}

const P010: React.FC = () => {
  const { cd } = useParams<{ cd: string }>();
  const { request } = useApiRequest();
  // 品目区分の選択肢（辞書：bss_classification）
  const [classificationOptions, setClassificationOptions] = useState<any[]>([]);
  const [detail, setDetail] = useState<ItemDetail>({
    itemCode: '',
    itemName: '',
    prprkn: '',
    prprkj: '',
    prkku: '',
    prhnmx: '',
    prbiko: '',
  });

  // 品目詳細を取得する
  const fetchItemDetail = async (itemCode: string) => {
    const result = await request('get', 'api/item/info/' + itemCode);
    if (result?.data) {
      setDetail(result.data);
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
    if (cd) {
      fetchItemDetail(cd);
    }
  }, [cd]);

  const classificationLabel =
    classificationOptions.find((item: any) => item.key === detail.prhnmx)?.value || detail.prhnmx || '-';
  const labelSx = { label: { width: '150px' } };

  return (
    <PageContainer title={'品目詳細'} returnButton={true}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 24px' }}>
        <FormTicket structure="left-right" label="品目コード" value={detail.itemCode || '-'} sx={labelSx} />
        <FormTicket structure="left-right" label="品目名" value={detail.itemName || '-'} sx={labelSx} />
        <FormTicket structure="left-right" label="品目名カナ" value={detail.prprkn || '-'} sx={labelSx} />
        <FormTicket structure="left-right" label="品名（伝票用）" value={detail.prprkj || '-'} sx={labelSx} />
        <FormTicket structure="left-right" label="規格" value={detail.prkku || '-'} sx={labelSx} />
        <FormTicket structure="left-right" label="品目区分" value={classificationLabel} sx={labelSx} />
        <div style={{ gridColumn: '1 / 3' }}>
          <FormTicket structure="left-right" label="備考" value={detail.prbiko || '-'} sx={labelSx} />
        </div>
      </div>
    </PageContainer>
  );
};

export default P010;
