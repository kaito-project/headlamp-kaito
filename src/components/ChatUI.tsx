import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Paper,
  Stack,
  Chip,
  Fab,
  Slide,
  CircularProgress,
  Tooltip,
  Divider,
  Button,
} from '@mui/material';
import { styled } from '@mui/system';

// AI SDK-style interfaces
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

const ChatDialog = styled(Dialog)(() => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    maxWidth: '900px',
    width: '90vw',
    height: '85vh',
    maxHeight: '800px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(0,0,0,0.08)',
  },
}));

const ChatHeader = styled(Box)(() => ({
  padding: '24px 32px 16px',
  borderBottom: '1px solid rgba(0,0,0,0.1)',
  background: 'rgba(0,0,0,0.02)',
  backdropFilter: 'blur(10px)',
}));

const MessagesContainer = styled(Box)(() => ({
  flex: 1,
  overflowY: 'auto',
  padding: '16px 0',
  display: 'flex',
  flexDirection: 'column',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '3px',
    '&:hover': {
      background: 'rgba(0,0,0,0.3)',
    },
  },
}));

const MessageBubble = styled(Box)(({ isUser }) => ({
  display: 'flex',
  flexDirection: isUser ? 'row-reverse' : 'row',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '8px 32px',
  marginBottom: '16px',
  '&:hover': {
    background: 'rgba(0,0,0,0.02)',
  },
}));

const MessageContent = styled(Paper)(({ isUser }) => ({
  maxWidth: '75%',
  padding: '16px 20px',
  borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
  background: isUser ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#f8fafc',
  color: isUser ? '#ffffff' : '#1e293b',
  border: 'none',
  boxShadow: isUser ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: isUser ? '0 6px 16px rgba(59, 130, 246, 0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
  },
}));

const InputContainer = styled(Box)(() => ({
  padding: '20px 32px 28px',
  borderTop: '1px solid rgba(0,0,0,0.1)',
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(10px)',
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '24px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    '& fieldset': {
      border: '2px solid rgba(0,0,0,0.12)',
      borderRadius: '24px',
    },
    '&:hover fieldset': {
      border: '2px solid #3b82f6',
    },
    '&.Mui-focused fieldset': {
      border: '2px solid #3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '14px 20px',
    fontSize: '16px',
    color: '#1e293b !important',
    fontWeight: 400,
    '&::placeholder': {
      color: 'rgba(30,41,59,0.7) !important',
      opacity: '1 !important',
    },
  },
  '& .MuiOutlinedInput-inputMultiline': {
    padding: '14px 20px',
    fontSize: '16px',
    color: '#1e293b !important',
    fontWeight: 400,
    lineHeight: 1.5,
    '&::placeholder': {
      color: 'rgba(30,41,59,0.7) !important',
      opacity: '1 !important',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#64748b',
  },
}));

const SendButton = styled(IconButton)(() => ({
  width: '48px',
  height: '48px',
  marginLeft: '12px',
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#ffffff',
  '&:hover': {
    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    transform: 'scale(1.05)',
  },
  '&:disabled': {
    background: 'rgba(0,0,0,0.1)',
    color: 'rgba(0,0,0,0.3)',
  },
  transition: 'all 0.2s ease',
}));

interface ChatUIProps {
  open?: boolean;
  onClose?: () => void;
}

const ChatUI = ({ open = true, onClose }: ChatUIProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI assistant for Kubernetes and Kaito. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Mock AI response for now - you can replace this with actual AI SDK calls
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const responses = [
        'I can help you with Kubernetes cluster management, pod troubleshooting, and Kaito AI workspace deployment.',
        'For Kaito workspaces, you can deploy models like Llama, Falcon, or Phi directly on your Kubernetes cluster.',
        'What specific Kubernetes or AI model deployment task would you like assistance with?',
        'I can guide you through creating AI workspaces, managing resources, or troubleshooting deployments.',
      ];

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your AI assistant for Kubernetes and Kaito. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <ChatDialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: { m: 2 },
      }}
    >
      <ChatHeader>
        <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Stack direction="row" alignItems="center" spacing={2}>
            {' '}
            <Avatar
              sx={{
                bgcolor: '#2563eb',
                width: 40,
                height: 40,
              }}
            >
              🤖
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="600" color="black">
                Kaito AI Assistant
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#10b981',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }}
                />
                <Typography variant="caption" color="black">
                  Ready to help with Kubernetes & AI
                </Typography>
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Clear conversation">
              <IconButton onClick={clearChat} size="small">
                🗑️
              </IconButton>
            </Tooltip>
            {onClose && (
              <Tooltip title="Close chat">
                <IconButton onClick={onClose} size="small">
                  ✕
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </ChatHeader>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <MessagesContainer>
          {messages.map(message => (
            <MessageBubble key={message.id} isUser={message.role === 'user'}>
              {' '}
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: message.role === 'user' ? '#3b82f6' : '#64748b',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {message.role === 'user' ? '👤' : '🤖'}
              </Avatar>
              <MessageContent isUser={message.role === 'user'}>
                {' '}
                <Typography
                  variant="body1"
                  sx={{
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'inherit',
                    fontSize: '14px',
                    fontWeight: 400,
                  }}
                >
                  {message.content}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 1,
                    opacity: 0.8,
                    fontSize: '11px',
                    color: 'inherit',
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </MessageContent>
            </MessageBubble>
          ))}

          {isLoading && (
            <MessageBubble isUser={false}>
              {' '}
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#64748b',
                  color: '#ffffff',
                }}
              >
                🤖
              </Avatar>{' '}
              <MessageContent isUser={false}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CircularProgress size={16} />{' '}
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#374151',
                    }}
                  >
                    AI is thinking...
                  </Typography>
                </Stack>
              </MessageContent>
            </MessageBubble>
          )}

          <div ref={messagesEndRef} />
        </MessagesContainer>

        <InputContainer>
          <Stack direction="row" spacing={2} alignItems="flex-end" width="100%">
            {' '}
            <StyledTextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask about Kubernetes, Kaito AI, or anything else..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <SendButton onClick={handleSend} disabled={!input.trim() || isLoading}>
              {isLoading ? <CircularProgress size={20} color="inherit" /> : '🚀'}
            </SendButton>
          </Stack>{' '}
          <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
            {' '}
            <Chip
              label="What is Kaito?"
              size="small"
              variant="outlined"
              onClick={() => setInput('What is Kaito and how does it work?')}
              sx={{
                fontSize: '12px',
                color: '#374151',
                borderColor: 'rgba(0,0,0,0.2)',
                '&:hover': {
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                },
              }}
            />{' '}
            <Chip
              label="Deploy AI Model"
              size="small"
              variant="outlined"
              onClick={() => setInput('How do I deploy an AI model using Kaito?')}
              sx={{
                fontSize: '12px',
                color: '#374151',
                borderColor: 'rgba(0,0,0,0.2)',
                '&:hover': {
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                },
              }}
            />{' '}
            <Chip
              label="Troubleshoot Pods"
              size="small"
              variant="outlined"
              onClick={() => setInput('Help me troubleshoot a failing pod in Kubernetes')}
              sx={{
                fontSize: '12px',
                color: '#374151',
                borderColor: 'rgba(0,0,0,0.2)',
                '&:hover': {
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                },
              }}
            />
          </Stack>
        </InputContainer>
      </DialogContent>
    </ChatDialog>
  );
};

// Floating Chat Button Component
const ChatFAB = ({ onClick }: { onClick: () => void }) => {
  return (
    <Fab
      onClick={onClick}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#ffffff',
        width: 64,
        height: 64,
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
        '&:hover': {
          transform: 'scale(1.1)',
          boxShadow: '0 12px 40px rgba(59, 130, 246, 0.4)',
        },
        transition: 'all 0.3s ease',
        zIndex: 1000,
      }}
    >
      <Typography fontSize={24}>🤖</Typography>
    </Fab>
  );
};

// Main Chat Component with FAB
const ChatWithFAB = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChatFAB onClick={() => setOpen(true)} />
      <ChatUI open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default ChatUI;
export { ChatWithFAB };
