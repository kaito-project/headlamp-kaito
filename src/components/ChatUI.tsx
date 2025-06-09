import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Paper,
  Stack,
  Chip,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/system';

const ChatContainer = styled(Card)(({ theme }) => ({
  maxWidth: '800px',
  width: '95%',
  margin: '20px auto',
  boxShadow:
    theme.palette?.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
  borderRadius: '16px',
  height: '80vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor:
    theme.palette?.background?.paper || (theme.palette?.mode === 'dark' ? '#1e1e1e' : '#ffffff'),
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: '20px 32px',
  borderBottom: `1px solid ${
    theme.palette?.divider ||
    (theme.palette?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
  }`,
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  backgroundColor:
    theme.palette?.background?.paper || (theme.palette?.mode === 'dark' ? '#2d2d2d' : '#f8f9fa'),
}));

const MessageContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  backgroundColor:
    theme.palette?.background?.paper || (theme.palette?.mode === 'dark' ? '#1e1e1e' : '#ffffff'),
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.mode === 'light' ? '#f1f1f1' : '#424242',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.mode === 'light' ? '#888' : '#666',
    borderRadius: '4px',
  },
}));

const Message = styled(Paper)(({ theme, isUser }) => ({
  padding: '12px 18px',
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser
    ? theme.palette?.primary?.main || (theme.palette?.mode === 'dark' ? '#1976d2' : '#1976d2')
    : theme.palette?.background?.default ||
      (theme.palette?.mode === 'dark' ? '#3a3a3a' : '#f5f5f5'),
  color: isUser
    ? theme.palette?.primary?.contrastText || '#ffffff'
    : theme.palette?.text?.primary || (theme.palette?.mode === 'dark' ? '#ffffff' : '#212121'),
  borderRadius: '16px',
  boxShadow:
    theme.palette?.mode === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      theme.palette?.mode === 'dark' ? '0 4px 8px rgba(0,0,0,0.4)' : '0 4px 8px rgba(0,0,0,0.1)',
  },
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: '24px 32px',
  borderTop: `1px solid ${
    theme.palette?.divider ||
    (theme.palette?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
  }`,
  display: 'flex',
  gap: '16px',
  backgroundColor:
    theme.palette?.background?.paper || (theme.palette?.mode === 'dark' ? '#2d2d2d' : '#f8f9fa'),
}));

const ChatUI = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! How can I assist you today?', isUser: false },
    { id: 2, text: 'I have a question about my order', isUser: true },
    {
      id: 3,
      text: "I'd be happy to help you with your order. Could you please provide your order number?",
      isUser: false,
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: input,
      isUser: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: 'Thank you for your message. Our team will process your request shortly.',
        isUser: false,
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ChatContainer>
      {' '}
      <ChatHeader>
        {' '}
        <Avatar
          sx={{
            bgcolor:
              theme.palette?.primary?.main ||
              (theme.palette?.mode === 'dark' ? '#90caf9' : '#1976d2'),
            width: 48,
            height: 48,
          }}
        >
          {/* <FaRobot size={24} /> */}
        </Avatar>
        <Box>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              color: '#212121',
            }}
          >
            AI Assistant
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {' '}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#4caf50',
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: '#4a4a4a',
              }}
            >
              Ready to help
            </Typography>
          </Stack>
        </Box>
      </ChatHeader>
      <MessageContainer>
        {messages.map(message => (
          <Message key={message.id} isUser={message.isUser}>
            <Typography variant="body1">{message.text}</Typography>
          </Message>
        ))}
        <div ref={messagesEndRef} />
      </MessageContainer>{' '}
      <InputContainer>
        {' '}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Send a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor:
                theme.palette?.background?.paper ||
                (theme.palette?.mode === 'dark' ? '#3a3a3a' : '#ffffff'),
              '& input': {
                color:
                  theme.palette?.text?.primary ||
                  (theme.palette?.mode === 'dark' ? '#ffffff' : '#212121'),
              },
              '& fieldset': {
                borderColor:
                  theme.palette?.divider ||
                  (theme.palette?.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
              },
              '&:hover fieldset': {
                borderColor:
                  theme.palette?.primary?.main ||
                  (theme.palette?.mode === 'dark' ? '#90caf9' : '#1976d2'),
              },
            },
            '& input::placeholder': {
              color:
                theme.palette?.text?.secondary ||
                (theme.palette?.mode === 'dark' ? '#b0bec5' : '#757575'),
              opacity: 0.7,
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim()}
          sx={{
            width: '48px',
            height: '48px',
            '&.Mui-disabled': {
              opacity: 0.5,
            },
          }}
        >
          {/* <IoSend size={24} /> */}
        </IconButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatUI;
