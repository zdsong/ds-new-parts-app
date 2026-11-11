import React, { useState, useEffect } from 'react';
import {
  Box,
} from '@mui/material';
import useApiRequest from '../adapters/apiUtil'; 
import { formatDate } from '../utils/dateUtil';

//問い合わせ履歴の詳細情報インターフェース
interface BssAskHistoryVo {
  id: string;
  status: string;
  statusLabel: string;
  category1: string;
  category2: string;
  askAnswerRemark: string;
  answerUser: string;
  answerTime: string;
}

//問い合わせ基本情報インターフェース
interface BssAskVo {
  id: string;
  askNo: string;
  askDate: string;
  askHistoryList: BssAskHistoryVo[];
}

interface N020Props {
  orderId: string;
}

const N020: React.FC<N020Props> = ({ orderId }) => {
  const { request } = useApiRequest();
  const [askList, setAskList] = useState<BssAskVo[]>([]);

  useEffect(() => {
    const fetchAskList = async () => {
      try {
        const response = await request('get', `api/order/ask/${orderId}/list`);
        const resData = response.data;
        if (resData && Array.isArray(resData)) {
          setAskList(resData as BssAskVo[]);
        }
      } catch (error) {
      }
    };

    fetchAskList();
  }, [orderId, request]);

  return (
    <Box sx={{ width: '100%' }}>
      { askList.length > 0 ?
      <Box sx={{ width: '100%' }}>
        <Box 
          sx={{ 
            borderBottom: '1px solid #e0e0e0', 
            marginBottom: '1rem', 
            width: '100%' 
          }} 
        />
        {askList.map((ask: BssAskVo, askIndex: number) => (
          <Box 
            key={ask.id} 
            sx={{ 
              marginBottom: '1.5rem',
              borderBottom: askIndex < askList.length - 1 ? '1px solid #e0e0e0' : 'none',
              paddingBottom: askIndex < askList.length - 1 ? '1.5rem' : 0,
            }}
          >
            {/* 問い合わせ基本情報（受付日） */}
            <Box sx={{ marginBottom: '1rem' }}>
              <Box style={{ marginBottom: '0.8rem' }}>
                <span>受付日</span> {ask.askDate ? formatDate(ask.askDate) : ''}
              </Box>
            </Box>
             
            {/* 問い合わせ履歴リストのループ表示 */}
            {ask.askHistoryList.map((history: BssAskHistoryVo, historyIndex: number) => (
              <Box key={history.id} sx={{ marginBottom: '1rem' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '3rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <Box sx={{ display: 'block' }}>
                    <span>お問い合わせ種別: {history.category1}</span>
                    <Box sx={{ marginTop: '0.5rem' }}>
                      <span>問い合わせ項目: {history.category2}</span>
                    </Box>
                  </Box>
                </Box>

                <Box
                  style={{
                    border: '1px solid #d0d0d0',
                    borderRadius: '4px',
                    padding: '1rem',
                  }}
                >
                  <Box
                    sx={{
                      marginBottom: '0.5rem',
                      width: '100%',
                      height: 'auto',
                      paddingTop: 0,
                    }}
                  >
                    <Box
                      style={{
                        border: 'none',
                        borderBottom: '1px solid #d0d0d0',
                        borderRadius: '0',
                        padding: '0 0.5rem 0.3rem 0.5rem',
                        textAlign: 'center',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        minHeight: 'unset',
                        height: 'auto',
                        lineHeight: '1.2',
                      }}
                    >
                      {history.statusLabel}
                    </Box>
                  </Box>
                   {/* 問い合わせ内容表示 */}
                  <Box style={{ marginBottom: '0.5rem' }}>
                    <span>問い合わせ内容</span>
                    <Box
                      style={{
                        border: '1px solid #d0d0d0',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        marginTop: '0.25rem',
                        minHeight: '100px',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {history.askAnswerRemark}
                    </Box>
                  </Box>
                  {/* 回答者表示*/}
                  <Box style={{ textAlign: 'right' }}>
                    回答者 {history.answerUser}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        ))}
        </Box> : <div style = {{width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.5)',fontSize: '0.9rem',}}>問い合わせがありません</div> }
    </Box>
  );
};

export default N020;