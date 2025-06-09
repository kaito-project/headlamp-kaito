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
} from '@mui/material';
import { styled } from '@mui/system';
// import { IoSend } from "react-icons/io5";
// import { FaRobot } from "react-icons/fa";

// Updated: Increased width and adjusted styling for desktop view
const ChatContainer = styled(Card)(({ theme }) => ({
  maxWidth: '800px',
  width: '95%',
  margin: '20px auto',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  borderRadius: '16px',
  height: '80vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#ffffff',
}));

// Updated: Enhanced header styling
const ChatHeader = styled(Box)({
  padding: '20px 32px',
  borderBottom: '1px solid rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  backgroundColor: '#f8f9fa',
});

// Updated: Added hover effects and adjusted padding
const MessageContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
});

// Updated: Enhanced message styling and hover effects
// const Message = styled(Paper)(({ isUser }) => ({
//   padding: '16px 24px',
//   maxWidth: '80%',
//   alignSelf: isUser ? 'flex-end' : 'flex-start',
//   // backgroundColor: isUser ? '#1976d2' : '#f8f9fa',
//   // color: isUser ? '#fff' : '#000',
//   backgroundColor: isUser ? '#2196f3' : '#f8f9fa', // lighter blue
//   color: isUser ? '#ffffff' : '#000000',

//   borderRadius: '16px',
//   boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
//   transition: 'transform 0.2s ease',
//   '&:hover': {
//     transform: 'translateY(-2px)',
//     boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
//   },
// }));
const Message = styled(Paper)(({ isUser }) => ({
  padding: '12px 18px',
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser ? '#e3f2fd' : '#f8f9fa',
  color: isUser ? '#0d47a1' : '#000',
  borderRadius: '16px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  textShadow: isUser ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
}));

// Updated: Enhanced input container styling
const InputContainer = styled(Box)({
  padding: '24px 32px',
  borderTop: '1px solid rgba(0,0,0,0.1)',
  display: 'flex',
  gap: '16px',
  backgroundColor: '#f8f9fa',
});

const ChatUI = () => {
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
      <ChatHeader>
        <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48 }}>
          {/* <FaRobot size={24} /> */}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#212121' }}>
            AI Assistant
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#4caf50',
              }}
            />
            <Typography variant="body2" color="text.secondary">
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
      </MessageContainer>

      <InputContainer>
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
              backgroundColor: '#ffffff',
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
