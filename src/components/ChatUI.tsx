import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  IconButton,
  Avatar,
  Paper,
  Stack,
  Chip,
  Fab,
  CircularProgress,
  Tooltip,
  TextField,
  Autocomplete,
  Button,
} from '@mui/material';
import { styled } from '@mui/system';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';
import { OPENAI_CONFIG } from '../config/openai';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  request,
  startPortForward,
  stopOrDeletePortForward,
} from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';

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
    background: '#ffffff',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(0,0,0,0.08)',
  },
  '@keyframes blink': {
    '0%, 50%': { opacity: 1 },
    '51%, 100%': { opacity: 0 },
  },
}));

const ChatHeader = styled(Box)(() => ({
  padding: '24px 32px 16px',
  borderBottom: '1px solid rgba(0,0,0,0.1)',
  background: 'rgba(0,0,0,0.02)',
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

const StyledInputBox = styled(Box)(() => ({
  borderRadius: '24px',
  backgroundColor: '#ffffff',
  border: '2px solid rgba(0,0,0,0.12)',
  transition: 'all 0.2s ease',
  padding: '14px 20px',
  minHeight: '48px',
  display: 'flex',
  alignItems: 'center',
  cursor: 'text',
  '&:hover': {
    border: '2px solid #3b82f6',
  },
  '&:focus-within': {
    border: '2px solid #3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)',
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
  namespace: string;
  workspaceName?: string;
}

// fetch pod name and resolved target port dynamically
async function resolvePodAndPort(namespace: string, workspaceName: string) {
  const labelSelector = `kaito.sh/workspace=${workspaceName}`;
  const podsResp = await request(
    `/api/v1/namespaces/${namespace}/pods?labelSelector=${labelSelector}`
  );
  const pod = podsResp?.items?.[0];
  if (!pod) return null;

  const containers = pod.spec.containers || [];
  for (const container of containers) {
    const portObj = container.ports?.[0];
    if (portObj && portObj.containerPort) {
      return {
        podName: pod.metadata.name,
        resolvedTargetPort: portObj.containerPort.toString(),
      };
    }
  }

  return null;
}

function getClusterOrEmpty() {
  try {
    const clusterValue = getCluster();
    if (clusterValue !== null && clusterValue !== undefined) {
      return clusterValue;
    }
  } catch (clusterError) {
    console.log('Could not get cluster, using empty string');
  }
  return '';
}

const ChatUI: React.FC<ChatUIProps> = ({ open = true, onClose, namespace, workspaceName }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isPortForwardRunning, setIsPortForwardRunning] = useState(false);
  const [portForwardId, setPortForwardId] = useState<string | null>(null);
  const [portForwardStatus, setPortForwardStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [models, setModels] = useState<{ title: string; value: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<{ title: string; value: string } | null>(null);

  const [baseURL, setBaseURL] = useState('http://localhost:8080/v1');
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await request(`/api/v1/namespaces/${namespace}/services`);
        const items = res?.items || [];
        const modelOptions = items
          .map((svc: any) => svc.metadata.name)
          .filter((name: string) =>
            /^(workspace-|deepseek|falcon|mistral|phi|llama|qwen)/i.test(name)
          )
          .map(name => ({
            title: name,
            value: name,
          }));

        setModels(modelOptions);
        if (!selectedModel && modelOptions.length > 0) {
          setSelectedModel(modelOptions[0]);
        }
      } catch (err) {
        console.error('Failed to fetch services for model list:', err);
      }
    };

    fetchServices();
  }, [namespace]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleInputChange = (e: React.FormEvent<HTMLDivElement>) => {
    const text = (e.target as HTMLElement).textContent || '';
    setInput(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.textContent = '';
      setInput('');
    }
  };

  const handleChipClick = (text: string) => {
    setInput(text);
    if (inputRef.current) {
      inputRef.current.textContent = text;
      inputRef.current.focus();
    }
  };
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    clearInput();
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages(prev => [...prev, aiMessage]);
    try {
      const conversationHistory = messages.concat(userMessage).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      const openAICompatibleProvider = createOpenAICompatible({
        baseURL,
        apiKey: '',
        name: 'openai-compatible',
      });

      const { textStream } = await streamText({
        model: openAICompatibleProvider.chatModel('phi-4-mini-instruct'),
        messages: conversationHistory,
        temperature: OPENAI_CONFIG.temperature,
        maxTokens: OPENAI_CONFIG.maxTokens,
      });

      let streamedText = '';

      for await (const textChunk of textStream) {
        streamedText += textChunk;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: streamedText,
                  isLoading: true,
                }
              : msg
          )
        );
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                isLoading: false,
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Error fetching completion:', error);

      let errorMessage = '';
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          errorMessage = 'Connection timed out. The AI service might be unavailable.';
        } else if (error.message.includes('CONNECTION') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to AI service. Please check the endpoint configuration.';
        } else {
          errorMessage = `AI service error: ${error.message}`;
        }
      } else {
        errorMessage = 'Unknown error occurred while connecting to AI service.';
      }

      const fallbackResponses = [
        'I can help you with a wide range of technical questions or general inquiries.',
        'Feel free to ask about software development, troubleshooting, or best practices.',
        'What specific topic or problem would you like assistance with?',
      ];

      const fallbackContent = `${errorMessage}\n\n${
        fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      }\n\n(Using fallback response - please check AI service configuration)`;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: fallbackContent,
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
  const startAIPortForward = () => {
    if (isPortForwardRunning) return;

    if (portForwardId) {
      (async () => {
        await stopAIPortForward();
        startPortForwardProcess();
      })();
      return;
    }

    startPortForwardProcess();
  };
  const startPortForwardProcess = async () => {
    setIsPortForwardRunning(true);
    setPortForwardStatus('Starting port forward...');

    try {
      const cluster = getClusterOrEmpty();

      if (!selectedModel) {
        throw new Error('No model selected yet.');
      }
      const serviceName = selectedModel.value;
      const serviceNamespace = namespace;

      const resolved = await resolvePodAndPort(namespace, workspaceName);
      if (!resolved) {
        throw new Error(`Could not resolve pod or target port for ${serviceName}`);
      }

      const { podName, resolvedTargetPort } = resolved;
      const localPort = String(10000 + Math.floor(Math.random() * 10000));
      const address = 'localhost';

      const newPortForwardId = workspaceName + '/' + namespace;

      await startPortForward(
        cluster,
        namespace,
        podName,
        resolvedTargetPort,
        serviceName,
        serviceNamespace,
        localPort,
        address,
        newPortForwardId
      );
      setBaseURL(`http://localhost:${localPort}/v1`);

      setPortForwardId(newPortForwardId);
      setPortForwardStatus(`Port forward running on localhost:${localPort}`);
    } catch (error) {
      console.error('Port forward error:', error);
      setPortForwardStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsPortForwardRunning(false);
      setPortForwardId(null);
    }
  };

  const stopAIPortForward = () => {
    const idToStop = portForwardId;
    if (!portForwardId) {
      setIsPortForwardRunning(false);
      setPortForwardStatus('Port forward not running');
      return;
    }

    setPortForwardStatus('Stopping port forward...');

    setIsPortForwardRunning(false);
    setPortForwardId(null);

    const cluster = getClusterOrEmpty();

    stopOrDeletePortForward(cluster, idToStop, true)
      .then(() => {
        setPortForwardStatus('Port forward stopped');

        const stopMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Port forwarding stopped successfully.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, stopMessage]);
      })
      .catch(error => {
        console.error(`Failed to stop port forward with ID ${idToStop}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setPortForwardStatus(`Error stopping: ${errorMsg}`);

        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Failed to stop port forwarding: ${errorMsg}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      });
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your AI assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  useEffect(() => {
    if (selectedModel && !isPortForwardRunning && !portForwardId) {
      startAIPortForward();
    }
  }, [selectedModel]);

  return (
    <ChatDialog
      open={open}
      onClose={() => {
        stopAIPortForward();
      }}
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
                Chat with {selectedModel?.title ?? 'Model'}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isPortForwardRunning ? '#10b981' : '#f59e0b',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }}
                />
              </Stack>
            </Box>
          </Stack>{' '}
          <Stack direction="row" spacing={1}>
            <Tooltip title="Clear conversation">
              <IconButton onClick={clearChat} size="small">
                🗑️
              </IconButton>
            </Tooltip>{' '}
            {onClose && (
              <Tooltip title="Close chat">
                <IconButton
                  onClick={() => {
                    onClose();
                  }}
                  size="small"
                  sx={{
                    color: '#ef4444',
                    fontSize: '18px',
                    width: 32,
                    height: 32,
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#dc2626',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
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
              </Avatar>{' '}
              <MessageContent isUser={message.role === 'user'}>
                {' '}
                <Box
                  sx={{
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'inherit',
                    fontSize: '14px',
                    fontWeight: 400,
                    '& p': { margin: 0, padding: 0 },
                    '& strong': { fontWeight: 600 },
                    '& em': { fontStyle: 'italic' },
                    '& code': {
                      backgroundColor:
                        message.role === 'user'
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(0, 0, 0, 0.05)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    },
                  }}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                  {message.isLoading && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '2px',
                        height: '18px',
                        backgroundColor: message.role === 'user' ? '#ffffff' : '#64748b',
                        marginLeft: '2px',
                        animation: 'blink 1s infinite',
                      }}
                    />
                  )}
                </Box>
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
          ))}{' '}
          <div ref={messagesEndRef} />
        </MessagesContainer>{' '}
        <InputContainer>
          <Stack direction="row" spacing={2} alignItems="flex-end" width="100%">
            <StyledInputBox onClick={() => inputRef.current?.focus()} sx={{ flex: 1 }}>
              <Typography
                ref={inputRef}
                component="div"
                contentEditable
                suppressContentEditableWarning
                onInput={handleInputChange}
                onKeyDown={handleKeyDown}
                sx={{
                  flex: 1,
                  fontSize: '16px',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: input.trim() ? '#1e293b' : '#64748b',
                  outline: 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '20px',
                  '&:empty::before': {
                    content: '"Ask me a question..."',
                    color: '#64748b',
                    fontStyle: 'normal',
                  },
                }}
              />
            </StyledInputBox>
            <SendButton onClick={handleSend} disabled={!input.trim() || isLoading}>
              {isLoading ? <CircularProgress size={20} color="inherit" /> : '➤'}
            </SendButton>{' '}
          </Stack>{' '}
          <Stack
            direction="row"
            spacing={1}
            mt={2}
            flexWrap="wrap"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Chip
                label="What can you do?"
                size="small"
                variant="outlined"
                onClick={() => handleChipClick('What can you help me with?')}
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
                label="Deploy an app"
                size="small"
                variant="outlined"
                onClick={() => handleChipClick('How do I deploy an application?')}
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
                label="Troubleshoot issues"
                size="small"
                variant="outlined"
                onClick={() => handleChipClick('Can you help me troubleshoot a problem?')}
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
            </Box>
            <Tooltip title="Select a model">
              <Autocomplete
                options={models}
                getOptionLabel={opt => opt.title}
                value={selectedModel ?? null}
                onChange={(e, val) => setSelectedModel(val)}
                sx={{
                  width: '150px',
                  '& .MuiInputBase-root': {
                    color: '#000000',
                    fontSize: '12px',
                    height: '32px',
                    backgroundColor: '#ffffff',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,0,0,0.2)',
                  },
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Model"
                    variant="outlined"
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: '#000000',
                        fontSize: '12px',
                      },
                    }}
                  />
                )}
              />
            </Tooltip>
          </Stack>
        </InputContainer>
      </DialogContent>
    </ChatDialog>
  );
};

const ChatFAB: React.FC<{ onClick: () => void }> = ({ onClick }) => {
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

const ChatWithFAB: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [portForwardAttempted, setPortForwardAttempted] = useState(false);

  return (
    <>
      <ChatFAB onClick={() => setOpen(true)} />
      <ChatUI
        open={open}
        onClose={() => {
          setOpen(false);
          setPortForwardAttempted(true);
        }}
        namespace="default"
      />
    </>
  );
};

export default ChatUI;
export { ChatWithFAB };
