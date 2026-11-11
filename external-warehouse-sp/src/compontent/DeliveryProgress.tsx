import React from 'react';
import { useRecordContext } from 'react-admin';
import { Box, Typography, Tooltip } from '@mui/material';

// 進捗状態ステップ型定義
export type StatusStep = {
  label: string;
  value: string;
  color: string;
  icon?: React.ReactNode;
};

// コンポーネントProps型定義
interface StatusProgressProps {
  source: string; // react-adminのフィールド名（recordのstatusに紐付け）
  steps: StatusStep[]; // 進捗ステップ設定
  sx?: object; // カスタムスタイル
}

// 配送進捗表示コンポーネント 
const DeliveryProgress: React.FC<StatusProgressProps> = ({
  source,
  steps = [
    { label: '受注', value: 'ordered', color: '#28a745' },
    { label: '箱詰め', value: 'packed', color: '#17a2b8' },
    { label: 'XXX', value: 'xxx', color: '#ffc107' },
    { label: 'XXX', value: 'yyy', color: '#fd7e14' },
    { label: '配送完了', value: 'delivered', color: '#6c757d' },
  ],
  sx = {},
}) => {
  // react-adminの現在のレコード取得（リスト/フォーム対応）
  const record = useRecordContext();
  // 現在のステータス（recordのsourceフィールドから取得）
  const currentStatus = record?.[source] || '';

  // 現在のステップインデックス計算
  const currentStepIndex = steps.findIndex(step => step.value === currentStatus);
  // 完了済みステップ（現在のステップ含む）
  const completedSteps = steps.slice(0, currentStepIndex + 1);
  // 未完了ステップ
  const uncompletedSteps = steps.slice(currentStepIndex + 1);

  return (
    <Box 
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...sx,
      }}
    >
      {/* 完了済みステップ（現在のステップ含む） */}
      {completedSteps.map((step, index) => (
        <React.Fragment key={step.value}>
          {/* ステップノード */}
          <Tooltip title={step.label}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: step.color,
                border: '2px solid white',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
              }}
            />
          </Tooltip>

          {/* ノード間の連結線（最後の完了ステップは表示しない） */}
          {index < completedSteps.length - 1 && (
            <Box
              sx={{
                height: 2,
                flex: 1,
                backgroundColor: step.color,
              }}
            />
          )}
        </React.Fragment>
      ))}

      {/* 未完了ステップ */}
      {uncompletedSteps.map((step, index) => (
        <React.Fragment key={step.value}>
          {/* 未完了連結線（最後の完了ステップから開始） */}
          {index === 0 && (
            <Box
              sx={{
                height: 2,
                flex: 1,
                backgroundColor: '#ddd',
              }}
            />
          )}

          {/* 未完了ノード */}
          <Tooltip title={step.label}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#ddd',
                border: '2px solid white',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
              }}
            />
          </Tooltip>

          {/* 未完了ノード間の連結線（最後のステップは表示しない） */}
          {index < uncompletedSteps.length - 1 && (
            <Box
              sx={{
                height: 2,
                flex: 1,
                backgroundColor: '#ddd',
              }}
            />
          )}
        </React.Fragment>
      ))}

      {/* 現在のステータスラベル表示 */}
      <Typography 
        variant="body2" 
        sx={{ marginLeft: 2, color: '#666' }}
      >
        {steps.find(s => s.value === currentStatus)?.label || '不明'}
      </Typography>
    </Box>
  );
};

export default DeliveryProgress;