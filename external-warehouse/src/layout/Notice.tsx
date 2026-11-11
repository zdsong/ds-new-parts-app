import React, { useState, useEffect } from 'react';
import { IconButton, Badge, Typography, Box, List, ListItem } from '@mui/material';
import { usePopupControl } from './usePopupMutex';
import CustomModal from '../compontent/CustomModal';
import noticeIcon from '../assets/icons/notice-icon.png';
import unreadIcon from '../assets/icons/unread-icon.png'; 
import useApiRequest from '../adapters/apiUtil';
import { useNavigate } from 'react-router';
import { useNotify } from 'react-admin';
import { formatDate } from '../utils/dateUtil';

// スタイル定義（集中管理）
const sxStyles = {
  container: {
    position: 'relative',
    display: 'inline-block' as const,
  },
  iconButton: {
    ml: 1,
    color: 'black',
  },
  badge: {
    '& .MuiBadge-badge': {
      minWidth: 18,
      height: 18,
      fontSize: '0.7rem',
      fontWeight: 'bold',
      backgroundColor: '#02B441'
    },
  },
  noticeListContainer: {
    maxHeight: '70vh',
    overflowY: 'auto' as const,
    '&::-webkit-scrollbar': { width: 3 },
    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1.5 },
  },
  noticeItem: {
    padding: '5px 16px',
    '&:hover': {
      bgcolor: 'rgba(0,0,0,0.03)',
      cursor: 'pointer',
    },
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    bgcolor: '#00B75D',
    marginRight: 8,
  },
  noticeTitle: {
    width: '200px',
    marginRight: '20px',
    color: '#00B75D'
  },
  noticeContent: {
    width: '500px',
    marginRight: '20px',
  },
  noticeTime: {
    width: '200px',
  },
  emptyNotice: {
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(0,0,0,0.5)',
    fontSize: '0.9rem',
    height: '250px',
    marginRight: '35px',
  },
};

// 型定義
interface NoticeType {
  id: string;
  noticeUser: string;
  status: string;
  noticeType: string;
  noticeParams: string;
  noticeContent: string;
  noticeTime: string;
  linkUrl: string;
}

interface NoticeProps {}

// 通知コンポーネント
export const Notice: React.FC<NoticeProps> = ({}) => {
  const { request } = useApiRequest();
  const navigate = useNavigate();
  const [notices, setNotices] = useState<NoticeType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { closeAllPopups } = usePopupControl();
  const notify = useNotify();
  
  // モーダル状態管理
  const [modalState, setModalState] = useState({
    open: false,
    title: 'お知らせ',
  });

  // 通知リスト取得
  const fetchNotices = async () => {
    try {
      const list = await request('get','api/notice/list',{},{},false,false)
      setNotices(list.data)
    } catch (e) {}
  };

  // 未読通知数取得
  const fetchunReadCnt = async () => {
    try {
      const count = await request('get','api/notice/unReadCnt',{},{},false,false)
      setUnreadCount(count.data)
    } catch (e) {}
  };

  // 通知既読処理
  const noticeRead = async (id: string) => {
    try {
      const result = await request('post','api/notice/read/' + id, {}, {}, false,false)
      if(result.code === 200) {
        await fetchNotices()
      }
    } catch (e) {}
  };

  // 未読数定期取得（30秒間隔）
  useEffect(() => {
    fetchunReadCnt();
    const timer = setInterval(fetchunReadCnt, 30000);
    return () => clearInterval(timer);
  }, []);

  // モーダルオープン時に通知リスト取得
  useEffect(() => {
    if (modalState.open) {
      fetchNotices();
      fetchunReadCnt();
    }
  }, [modalState.open]);

  // 通知クリック処理
  const handleNoticeClick = async (notice: NoticeType) => {
    await noticeRead(notice.id);
    fetchunReadCnt();
    // 通知タイプに応じたページ遷移
    switch(notice.noticeType){
      case '10': 
        navigate('/N006/N007/' + notice.noticeParams);
        break;
      case '20': 
        navigate('/N008' + notice.noticeParams);
        break;
      case '30': 
        navigate('/N011' + notice.noticeParams);
        break;
      case '40':
        navigate('/N006/N007/' + notice.noticeParams + '/' + notice.id);
        break;
    }
    closeModal();
  };

  // 通知ポップアップの開閉処理
  const handleToggleNotice = () => {
    if (modalState.open) {
      closeModal();
    } else {
      closeAllPopups();
      setModalState({ ...modalState, open: true });
    }
  };

  // モーダルクローズ処理
  const closeModal = () => {
    setModalState({ ...modalState, open: false });
  };

  // 通知タイプからメニューテキストを取得
  const getLinkMenu = (type: string) => {
    switch(type){
      case '10': return '注文情報を確認';
      case '20': return '商品マスタ確認';
      case '30': return '商品カテゴリマスタ確認';
      case '40': return '問合せメッセージ';
      default: return '';
    }
  };

  // モーダルコンテンツレンダリング
  const renderModalContent = () => {
    if (notices.length === 0) {
      return <Box sx={sxStyles.emptyNotice}>通知がありません</Box>;
    }

    return (
      <Box sx={sxStyles.noticeListContainer}>      
        <List disablePadding>
          {notices.map((notice) => (
            <React.Fragment key={notice.id}>
              <ListItem 
                sx={sxStyles.noticeItem}
                disableGutters
              >
                <Box display="flex" width="100%">
                  {/* 未読アイコン */}
                  <Box sx={{
                    width: '50px',
                    display: 'flex',
                    justifyContent: 'center',
                    marginRight: '10px'
                  }}>
                    <img 
                      src={unreadIcon} 
                      alt="unreadIcon" 
                      style={{ height: '30px' }}
                    />
                  </Box>
                  
                  {/* 通知内容 */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    height: '30px',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <Typography sx={sxStyles.noticeTime}>{formatDate(notice.noticeTime)}</Typography>
                    <Typography sx={sxStyles.noticeContent}>{notice.noticeContent}</Typography>
                    <Typography 
                      sx={sxStyles.noticeTitle} 
                      onClick={() => handleNoticeClick(notice)}
                    >
                      {getLinkMenu(notice.noticeType)}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <Box sx={sxStyles.container}>
      {/* 未読数バッジ付き通知アイコン */}
      <IconButton
        color="inherit"
        onClick={handleToggleNotice}
        aria-label="通知中心"
        sx={sxStyles.iconButton}
      >
        <Badge
          badgeContent={unreadCount > 99 ? '99+' : unreadCount}
          color="error"
          invisible={unreadCount === 0}
          sx={sxStyles.badge}
        >
          <img 
            src={noticeIcon} 
            alt="noticeIcon" 
            style={{ height: '30px' }}
          />
        </Badge>
      </IconButton>

      {/* 通知モーダル */}
      <CustomModal
        open={modalState.open}
        onClose={closeModal}
        title={modalState.title}
        maxWidth="lg"
      >
        {renderModalContent()}
      </CustomModal>
    </Box>
  );
};

// AppBarに統合するためのラッパーコンポーネント
export const NoticeAppBar: React.FC = () => {
  return (
    <Notice />
  );
};