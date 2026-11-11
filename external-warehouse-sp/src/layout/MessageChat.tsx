import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconButton, Paper, Box, TextField, Button, Typography, Badge } from '@mui/material';
import { usePopupControl } from './usePopupMutex';
import messageIcon from '../assets/icons/message-icon.png'
import sendIcon from '../assets/icons/send-icon.png'
import useApiRequest from '../adapters/apiUtil';
import { useNotify } from 'react-admin';
import CustomModal from '../compontent/CustomModal';
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
  popup: {
    position: 'absolute' as const,
    top: 50,
    right: -110,
    marginTop: 0,
    width: 300,
    maxHeight: '70vh',
    height: '70vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 3,
    zIndex: 1000,
  },
  titleBar: {
    p: 1,
    fontWeight: 'medium',
    textAlign: 'center',
    fontSize: '1.2rem',
  },
  chatContent: {
    flex: 1,
    p: 0.8,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minHeight: '100px',
    '&::-webkit-scrollbar': { width: 3 },
    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1.5 },
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.8,
  },
  otherMessageContainer: {
    maxWidth: '85%',
  },
  selfMessageContainer: {
    maxWidth: '85%',
    justifyContent: 'end'
  },
  otherMessage: {
    p: 0.6,
    borderRadius: 1.2,
    bgcolor: 'white',
    color: 'black',
    fontSize: '0.9rem',
    boxShadow: 1,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
  },
  selfMessage: {
    p: 0.6,
    borderRadius: 1.2,
    bgcolor: 'var(--mui-yamato-card-header-color)',
    fontSize: '0.9rem',
    boxShadow: 1,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
  },
  timestamp: {
    display: 'block',
    mt: 0.2,
    opacity: 0.8,
    fontSize: '0.7rem',
  },
  inputArea: {
    p: 0.6,
    borderTop: 1,
    borderColor: 'divider',
    bgcolor: 'var(--mui-yamato-page-header-color)',
    display: 'flex',
    gap: 0.4,
  },
  textField: {
    '& .MuiInputBase-root': { border: 0, borderRadius: 0 },
    '& .Mui-focused': { border: '0' },
    '& .MuiOutlinedInput-root': { height: 32, '& fieldset': { borderWidth: 1 } },
    '& .MuiInputBase-input': {
      fontSize: '0.9rem',
      padding: '0 6px',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      bgcolor: 'white',
    },
    '& .MuiOutlinedInput-notchedOutline': { border: 0 }
  },
  sendButton: {
    minWidth: 30,
    height: 32,
    border: 0,
    bgcolor: 'var(--mui-yamato-page-header-color)',
    boxShadow: 0,
    p: 0,
  },
};

// 型定義 
interface MessageType {
  id: number;
  messages: string;
  myFlag: string;
  sendTime: string;
}

interface MessageChatProps {}

// メッセージチャットコンポーネント 
export const MessageChat: React.FC<MessageChatProps> = ({}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activePopup, setActivePopup, closeAllPopups, PopupParam, setPopupParam } = usePopupControl();
  const isChatOpen = (activePopup === 'message');
  const notify = useNotify();
  const { request } = useApiRequest();

  const [modalState, setModalState] = useState({
    open: false,
    title: 'メッセージを送る',
  });

  const chatContentRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (chatContentRef.current && modalState.open) {
      const container = chatContentRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [modalState.open]);
  

  // 未読件数取得
  const fetchunReadCnt = async () => {
    try {
      const count = await request('get','api/ask/message/unReadCnt',{},{},false,false)
      setUnreadCount(count.data) 
    } catch (e) {
      if(e instanceof Error){
        notify(e.message, { type: 'error' })
      }
    }
  };

  // メッセージリスト取得
  const fetchMessage = async () => {
    try {
      const list = await request('get','api/ask/message/list',{},{},false,false)
      setMessages(list?.data? list.data : [])
    } catch (e) {
      if(e instanceof Error){
        notify(e.message, { type: 'error' })
      }
    }
  };

  // 注文ID指定でメッセージ取得 
  const fetchMessageById = async (orderId: string) => {
    try {
      const list = await request('get','api/ask/message/list/'+ orderId, {}, {}, false,false)
      setMessages(list?.data? list.data : [])
    } catch (e) {
      if(e instanceof Error){
        notify(e.message, { type: 'error' })
      }
    }
  };

  // メッセージ既読処理
  const messageRead = async () => {
    try {
      const result = await request('post','api/ask/message/read', {}, {}, false,false)
      if(result.code === 200) {}
    } catch (e) {
      if(e instanceof Error){
        notify(e.message, { type: 'error' })
      }
    }
  };

  // 注文ID指定でメッセージ既読処理
  const messageReadById = async (id: string) => {
    try {
      const result = await request('post','api/ask/message/read/' + id, {}, {}, false,false)
      if(result.code === 200) {}
    } catch (e) {
      if(e instanceof Error){
        notify(e.message, { type: 'error' })
      }
    }
  };

  // メッセージ送信
  const sendMessage = async () => {
    try {
      const result = await request('post','api/ask/message/send', {messages: message},{},false,false)
      if(result.code === 200) {}
    } catch (e) {
      if(e instanceof Error){
        notify(e.message, { type: 'error' })
      }
    }
  };

  // 注文ID指定でメッセージ送信
  const sendMessageByOrderId = async (id: string) => {
    try {
      const result = await request('post','api/ask/message/send/' + id, {messages: message},{},false,false)
      if(result.code === 200) {}
    } catch (e) {
      if(e instanceof Error){
        notify(e.message, { type: 'error' })
      }
    }
  };

  // 未読件数定期取得（30秒間隔）
  useEffect(() => {
    fetchunReadCnt();
    const timer = setInterval(fetchunReadCnt, 30000);
    return () => clearInterval(timer);
  }, []);

  // メッセージ更新処理
  const flashMessage = async () => {
    if (modalState.open) {
      if(PopupParam && PopupParam.orderId){
        await fetchMessageById(PopupParam.orderId)
        await messageReadById(PopupParam.orderId)
      } else {
        await fetchMessage()
        await messageRead()
      }
      await fetchunReadCnt();
    }
  };

  // チャットウィンドウ開閉時にメッセージ更新
  useEffect(() => {
    const loadAndScroll = async () => {
      await flashMessage();
      scrollToBottom();
    };
  
    if (modalState.open) {
      loadAndScroll();
    }
  }, [modalState.open]);

  useEffect(() => {
    setModalState({
      open: isChatOpen,
      title: 'メッセージを送る',
    })
  }, [isChatOpen]);

  // メッセージポップアップの開閉処理
  const handleToggleChat = () => {
    if (modalState.open) {
      closeModal();
    } else {
      closeAllPopups();
      setPopupParam(null)
      setModalState({ ...modalState, open: true });
    }
  };

  // メッセージ送信処理
  const handleSend = async () => {
    if (!message.trim()) return;
    if(PopupParam && PopupParam.orderId){
      await sendMessageByOrderId(PopupParam.orderId)
    } else {
      await sendMessage()
    }
    setMessage('')
    await flashMessage()
  };

  // エンターキーで送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    e.key === 'Enter' && handleSend();
  };

  // メッセージ追加時にスクロールを下部に固定
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  useEffect(() => {
    if (modalState.open && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [messages, modalState.open, scrollToBottom]);

  const closeModal = () => {
    setModalState({
      open: false,
      title: 'メッセージを送る',
    });
    closeAllPopups();
  };

  const renderModalContent = () => {

    return (
      <Box sx={{display: 'flex', flexDirection: 'column', height: '65vh'}}>
          <Box sx={sxStyles.chatContent} ref={chatContentRef}>
            <Box sx={sxStyles.messageList}>
              {messages?.slice().reverse().map((msg) => (
                <Box
                  key={msg.id}
                  display="flex"
                  justifyContent={msg.myFlag === '1' ? 'flex-end' : 'flex-start'}
                >
                  <Box sx={msg.myFlag === '1' ? sxStyles.selfMessageContainer : sxStyles.otherMessageContainer}>
                    <div style={{
                      display: 'flex',
                      justifyContent: msg.myFlag === '1' ? 'flex-end' : 'flex-start'
                    }}>
                    <Box sx={msg.myFlag === '1' ? sxStyles.selfMessage : sxStyles.otherMessage}>
                        {msg.messages}
                    </Box>
                    </div>
                    
                    <Typography
                      variant="caption"
                      sx={{ ...sxStyles.timestamp, textAlign: msg.myFlag === '1' ? 'right' : 'left' }}
                    >
                      {formatDate(msg.sendTime)}
                  </Typography>
                  </Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
          </Box>

          {/* 入力エリア */} 
          <Box sx={sxStyles.inputArea}>
            <TextField
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              sx={sxStyles.textField}
              onKeyPress={handleKeyPress}
            />
            <Button
              onClick={handleSend}
              variant="contained"
              color="primary"
              size="small"
              sx={sxStyles.sendButton}
            >
              <img src={sendIcon} alt="sendIcon" style={{ height: '30px', color: 'white' }}/>
            </Button>
          </Box>
        </Box>
    );
  };


  return (
    <Box sx={sxStyles.container}>
      {/* 未読数バッジ付きメッセージアイコン */}
      <IconButton
        color="inherit"
        onClick={handleToggleChat}
        aria-label="消息中心"
        sx={sxStyles.iconButton}
      >
        <Badge
          badgeContent={unreadCount > 99 ? '99+' : unreadCount}
          color="error"
          invisible={unreadCount === 0}
          sx={sxStyles.badge}
        >
          <img src={messageIcon} alt="messageIcon" style={{ height: '30px' }}/>
        </Badge>
      </IconButton>

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
export const MessageChatAppBar: React.FC = () => {
  return <MessageChat/>;
};