import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconButton, Paper, Box, TextField, Button, Typography, Badge } from '@mui/material';
import { usePopupControl } from './usePopupMutex';
import Close from '@mui/icons-material/Close';
import messageIcon from '../assets/icons/message-icon.png'
import sendIcon from '../assets/icons/send-icon.png'
import useApiRequest from '../adapters/apiUtil';
import { useNotify } from 'react-admin';
import { formatDate } from '../utils/dateUtil';

// スタイル定義
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

  // 未読件数取得
  const fetchunReadCnt = async () => {
    try {
      const count = await request('get','api/ask/message/unReadCnt',{},{},false,false)
      setUnreadCount(count.data) 
    } catch (e) {}
  };

  // メッセージリスト取得
  const fetchMessage = async () => {
    try {
      const list = await request('get','api/ask/message/list',{},{},false,false)
      setMessages(list?.data? list.data : []) 
    } catch (e) {}
  };

  // 注文ID指定でメッセージ取得
  const fetchMessageById = async (orderId: string) => {
    try {
      const list = await request('get','api/ask/message/list/'+ orderId,{},{},false,false)
      setMessages(list?.data? list.data : []) 
    } catch (e) {}
  };

  // メッセージ既読処理
  const messageRead = async () => {
    try {
      const result = await request('post','api/ask/message/read', {}, {}, false,false)
      if(result.code === 200) {}
    } catch (e) {}
  };

  // 注文ID指定でメッセージ既読処理
  const messageReadById = async (id: string) => {
    try {
      const result = await request('post','api/ask/message/read/' + id, {}, {}, false,false)
      if(result.code === 200) {}
    } catch (e) {}
  };

  // メッセージ送信
  const sendMessage = async () => {
    try {
      const result = await request('post','api/ask/message/send', {messages: message},{},false,false)
      if(result.code === 200) {}
    } catch (e) {}
  };

  // 注文ID指定でメッセージ送信
  const sendMessageByOrderId = async (id: string) => {
    try {
      const result = await request('post','api/ask/message/send/' + id, {messages: message},{},false,false)
      if(result.code === 200) {}
    } catch (e) {}
  };

  // 未読件数定期取得（30秒間隔）
  useEffect(() => {
    fetchunReadCnt();
    const timer = setInterval(fetchunReadCnt, 30000);
    return () => clearInterval(timer);
  }, []);

  // メッセージ更新処理
  const flashMessage = async () => {
    if (isChatOpen) {
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
    flashMessage()
  }, [isChatOpen]);

  // メッセージポップアップの開閉処理
  const handleToggleChat = () => {
    if (isChatOpen) {
      closeAllPopups();
    } else {
      closeAllPopups();
      setPopupParam(null)
      setActivePopup('message');
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

  const chatContentRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (chatContentRef.current && isChatOpen) {
      const container = chatContentRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (isChatOpen && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [messages, isChatOpen, scrollToBottom]);

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

      {/* メッセージポップアップ */}
      {isChatOpen && (
        <Paper elevation={3} sx={sxStyles.popup}>
          {/* 閉じるボタン */}
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'end' }}>
            <IconButton onClick={handleToggleChat}>
              <Close />
            </IconButton>
          </Box>
          
          {/* タイトルバー */} 
          <Box sx={sxStyles.titleBar}>
            メッセージを送る
          </Box>
          
          {/* チャットコンテンツエリア */} 
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
        </Paper>
      )}
    </Box>
  );
};

// AppBarに統合するためのラッパーコンポーネント
export const MessageChatAppBar: React.FC = () => {
  return <MessageChat/>;
};