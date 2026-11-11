import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

import PageContainer from '../compontent/PageContainer';
import CustomCard from '../compontent/CustomCard';
import { buttonSx } from '../styles/commonSX';

interface OperLogDetailData {
    operId: string;
    title: string;
    businessType: string;
    method: string;
    requestMethod: string;
    operatorType: string;
    operName: string;
    operUrl: string;
    operIp: string;
    operLocation: string;
    operParam: string;
    jsonResult: string;
    status: string;
    errorMsg: string;
    operTime: string;
    costTime: string;
    systemCd: string;
}

const S041: React.FC = () => {
    const { operId } = useParams<{ operId: string }>();
    const navigate = useNavigate();
    const [detailData, setDetailData] = useState<OperLogDetailData | null>(null);

    const loadDetailData = () => {
        try {
            const logData = sessionStorage.getItem('operLogDetail');
            if (logData) {
                const data = JSON.parse(logData);
                
                if (data.operId === operId) {
                    const businessTypeMap: {[key: number]: string} = {
                        0: 'その他', 1: '新規', 2: '修正', 3: '削除', 4: '承認',
                        5: 'エクスポート', 6: 'インポート', 7: '強退', 8: 'コード生成', 9: 'データ消去'
                    };
                    
                    const operatorTypeMap: {[key: number]: string} = {
                        0: 'その他', 1: 'バックグラウンドユーザ', 2: '携帯端末ユーザ'
                    };
                    
                    const statusMap: {[key: number]: string} = {
                        0: '正常', 1: '異常'
                    };

                    setDetailData({
                        ...data,
                        operId: data.operId?.toString() || '',
                        businessType: businessTypeMap[data.businessType] || data.businessType?.toString() || '',
                        operatorType: operatorTypeMap[data.operatorType] || data.operatorType?.toString() || '',
                        status: statusMap[data.status] || data.status?.toString() || '',
                        costTime: data.costTime?.toString() + 'ミリ秒' || ''
                    });
                    
                    sessionStorage.removeItem('operLogDetail');
                }
            }
        } catch (error) {
        }
    };

    useEffect(() => {
        if (operId) {
            loadDetailData();
        }
    }, [operId]);

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <PageContainer title={'操作ログの詳細'}>
            <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="操作ログの詳細" border={false}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        style={buttonSx.button}
                        type="button"
                        onClick={handleBack}
                    >
                        戻る
                    </button>
                </div>
                {detailData ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>番号</div>
                            <div>{detailData.operId}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>オペレーションモジュール</div>
                            <div>{detailData.title}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>ビジネス・タイプ</div>
                            <div>{detailData.businessType}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>オペレータ</div>
                            <div>{detailData.operName}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>オペレーションIP</div>
                            <div>{detailData.operIp}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>オペレーションサイト</div>
                            <div>{detailData.operLocation}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>状態</div>
                            <div style={{ color: detailData.status === '正常' ? 'green' : 'red' }}>{detailData.status}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>時間</div>
                            <div>{detailData.operTime}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>消費時間</div>
                            <div>{detailData.costTime}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>リクエストモード</div>
                            <div>{detailData.requestMethod}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>リクエストアドレス</div>
                            <div>{detailData.operUrl}</div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>操作カテゴリ</div>
                            <div>{detailData.operatorType}</div>
                        </div>
                        <div style={{ padding: '10px', gridColumn: '1 / -1' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>エラーメッセージ</div>
                            <div>{detailData.errorMsg}</div>
                        </div>
                        <div style={{ padding: '10px', gridColumn: '1 / -1' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>戻り値</div>
                            <div>{detailData.jsonResult}</div>
                        </div>
                        <div style={{ padding: '10px', gridColumn: '1 / -1' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>パラメータ</div>
                            <div>{detailData.operParam}</div>
                        </div>
                        <div style={{ padding: '10px', gridColumn: '1 / -1' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>方法</div>
                            <div>{detailData.method}</div>
                        </div>
                    </div>
                ) : (
                    <div>読み込み中...</div>
                )}
            </CustomCard>
        </PageContainer>
    );
};

export default S041;