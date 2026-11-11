import React from 'react';
import { useLoading } from './LoadingProvider';

// グローバルローディングオーバーレイコンポーネント
export const GlobalLoadingOverlay: React.FC = () => {
    // LoadingProviderからローディング状態を取得
    const { loading } = useLoading();

    // ローディング状態でない場合は何も表示しない
    if (!loading) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                textAlign: 'center'
            }}>
                {/* 回転するローディングアイコン */}
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}></div>
                <h3 style={{
                    margin: 0,
                    color: '#333',
                    fontSize: '18px',
                    fontWeight: '600'
                }}>処理中</h3>
            </div>
        </div>
    );
};

// ローテーションアニメーションの定義（グローバルスタイルとして追加）
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);