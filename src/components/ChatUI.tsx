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
  DialogTitle,
  DialogActions,
  Slider,
} from '@mui/material';
import { styled } from '@mui/system';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, generateText } from 'ai';
import { DEFAULT_OPENAI_CONFIG } from '../config/openai';
import ModelSettingsDialog, { ModelConfig } from './ModelSettingsDialog';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  request,
  startPortForward,
  stopOrDeletePortForward,
} from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { useTheme } from '@mui/material/styles';
import {
  resolvePodAndPort,
  startWorkspacePortForward,
  stopWorkspacePortForward,
  fetchModelsWithRetry,
  getClusterOrEmpty,
} from './resources/chatUtils';
import { MCPServerConfig, MCPTool, MCPModel, MCPContext, loadMCPServers } from '../config/mcp';
import {
  fetchToolsFromAllMCPServers,
  fetchModelsFromAllMCPServers,
  enhancePromptWithMCPContext,
  executeMCPToolFromChat,
  getMCPToolsForChat,
} from './resources/chatUtils';
import MCPServerManager from './MCPServerManager';

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
  theme?: any;
}

const ChatUI: React.FC<ChatUIProps & { embedded?: boolean }> = ({
  open = true,
  onClose,
  namespace,
  workspaceName,
  embedded = false,
  theme: themeProp,
}) => {
  const theme = themeProp || useTheme();
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_OPENAI_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { temperature = 0.7, maxTokens = 1000 } = config || {};
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
  const portForwardIdRef = useRef<string | null>(null);
  const [portForwardStatus, setPortForwardStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [models, setModels] = useState<{ title: string; value: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<{ title: string; value: string } | null>(null);
  const [isPortReady, setIsPortReady] = useState(false);
  const [baseURL, setBaseURL] = useState('http://localhost:8080/v1');
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);

  // MCP Context Management (separate from model selection)
  const [mcpContextEnabled, setMcpContextEnabled] = useState(false);
  const [availableMCPServers, setAvailableMCPServers] = useState<string[]>([]);
  const [selectedMCPServers, setSelectedMCPServers] = useState<string[]>([]);
  const [mcpTools, setMcpTools] = useState<any[]>([]);

  // Legacy MCP model state (to be removed)
  const [availableMCPModels, setAvailableMCPModels] = useState<MCPModel[]>([]);
  const [selectedMCPModel, setSelectedMCPModel] = useState<MCPModel | null>(null);

  // Load MCP servers and tools on component mount
  useEffect(() => {
    const loadMCPData = async () => {
      try {
        const servers = loadMCPServers();
        const serverNames = servers.map(server => server.name);
        setAvailableMCPServers(serverNames);

        // Load persisted MCP context settings
        const savedMcpEnabled = localStorage.getItem('mcpContextEnabled');
        const savedSelectedServers = localStorage.getItem('selectedMCPServers');

        if (savedMcpEnabled !== null) {
          setMcpContextEnabled(JSON.parse(savedMcpEnabled));
        }

        if (savedSelectedServers) {
          const parsedServers = JSON.parse(savedSelectedServers);
          // Only keep servers that still exist in configuration
          const validServers = parsedServers.filter((server: string) =>
            serverNames.includes(server)
          );
          setSelectedMCPServers(validServers);
        }

        // Load MCP tools for AI SDK integration
        const tools = await getMCPToolsForChat();
        setMcpTools(tools);

        // Legacy: Load MCP models (to be deprecated)
        const mcpModels = await fetchModelsFromAllMCPServers();
        setAvailableMCPModels(mcpModels);
      } catch (error) {
        console.error('Failed to load MCP data:', error);
      }
    };

    loadMCPData();
  }, []);

  // Persist MCP context settings when they change
  useEffect(() => {
    localStorage.setItem('mcpContextEnabled', JSON.stringify(mcpContextEnabled));
  }, [mcpContextEnabled]);

  useEffect(() => {
    localStorage.setItem('selectedMCPServers', JSON.stringify(selectedMCPServers));
  }, [selectedMCPServers]);

  // Reload MCP tools when MCP context settings change
  useEffect(() => {
    const reloadMCPTools = async () => {
      if (mcpContextEnabled && selectedMCPServers.length > 0) {
        try {
          console.log('Reloading MCP tools for selected servers:', selectedMCPServers);
          const tools = await getMCPToolsForChat(selectedMCPServers);
          setMcpTools(tools);
        } catch (error) {
          console.error('Failed to reload MCP tools:', error);
        }
      } else {
        setMcpTools([]);
      }
    };

    reloadMCPTools();
  }, [mcpContextEnabled, selectedMCPServers]);

  useEffect(() => {
    console.log('selectedMCPModel changed:', selectedMCPModel);
  }, [selectedMCPModel]);

  // Test MCP server connectivity
  const testMCPServer = async (serverName: string, url: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to test MCP server ${serverName} at ${url}:`, error);
      return false;
    }
  };

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

    console.log('handleSend called');
    console.log('Current state:', {
      selectedModel: selectedModel,
      mcpContextEnabled: mcpContextEnabled,
      selectedMCPServers: selectedMCPServers,
      baseURL: baseURL,
      isPortReady: isPortReady,
    });

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
      // Build conversation history
      const conversationHistory = messages.concat(userMessage).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Validate model selection
      const modelId = selectedModel?.value;
      if (!modelId) {
        throw new Error('No model selected.');
      }

      // Enhance prompt with MCP context if enabled
      let enhancedUserMessage = userMessage.content;
      if (mcpContextEnabled && selectedMCPServers.length > 0) {
        enhancedUserMessage = await enhancePromptWithMCPContext(
          userMessage.content,
          selectedMCPServers
        );

        // Update the conversation history with enhanced prompt
        conversationHistory[conversationHistory.length - 1].content = enhancedUserMessage;
      }

      // Set up AI model provider
      const openAICompatibleProvider = createOpenAICompatible({
        baseURL: baseURL,
        apiKey: '',
        name: 'openai-compatible',
      });

      // Get MCP tools for the enabled servers
      const availableTools =
        mcpContextEnabled && selectedMCPServers.length > 0
          ? mcpTools.filter(tool => selectedMCPServers.includes(tool.serverName))
          : [];

      console.log('Available tools for chat:', availableTools);

      // Convert tools array to tools object for AI SDK
      const toolsObject: { [key: string]: any } = {};
      availableTools.forEach(tool => {
        toolsObject[tool.function.name] = {
          description: tool.function.description,
          parameters: tool.function.parameters,
          execute: async (args: any) => {
            const serverName = tool.serverName;
            const originalName = tool.originalName;
            return await executeMCPToolFromChat(originalName, serverName, args);
          },
        };
      });

      // Use generateText with tools for tool-augmented queries
      if (availableTools.length > 0) {
        const result = await generateText({
          model: openAICompatibleProvider.chatModel(modelId),
          messages: conversationHistory,
          tools: toolsObject,
          temperature,
          maxTokens,
        });

        // Handle tool calls if any
        if (result.toolCalls && result.toolCalls.length > 0) {
          let responseContent = result.text;

          for (const toolCall of result.toolCalls) {
            try {
              console.log(`Executing tool: ${toolCall.toolName}`);

              // Tool execution is handled by the execute function defined above
              // The result should already include tool results
              responseContent += `\n\n[Tool Call: ${toolCall.toolName}]\n${JSON.stringify(
                toolCall.args,
                null,
                2
              )}`;
            } catch (toolError) {
              console.error(`Failed to execute tool ${toolCall.toolName}:`, toolError);
              responseContent += `\n\n[Tool Error: ${toolCall.toolName}]\nFailed to execute: ${
                toolError instanceof Error ? toolError.message : String(toolError)
              }`;
            }
          }

          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: responseContent,
                    isLoading: false,
                  }
                : msg
            )
          );
        } else {
          // No tool calls, just display the response
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: result.text,
                    isLoading: false,
                  }
                : msg
            )
          );
        }
      } else {
        // Use streamText for regular queries without tools
        const { textStream } = await streamText({
          model: openAICompatibleProvider.chatModel(modelId),
          messages: conversationHistory,
          temperature,
          maxTokens,
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
      }
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

  const startPortForwardProcess = async () => {
    setIsPortForwardRunning(true);
    setPortForwardStatus('Starting port forward...');

    try {
      if (!workspaceName) {
        throw new Error('Missing workspace name.');
      }

      const resolved = await resolvePodAndPort(namespace, workspaceName);
      if (!resolved) {
        throw new Error(`Could not resolve pod or target port for ${workspaceName}`);
      }

      const { podName, targetPort } = resolved;
      const localPort = String(10000 + Math.floor(Math.random() * 10000));
      const newPortForwardId = workspaceName + '/' + namespace;

      await startWorkspacePortForward({
        namespace,
        workspaceName,
        podName,
        targetPort,
        localPort,
        portForwardId: newPortForwardId,
      });

      setBaseURL(`http://localhost:${localPort}/v1`);
      try {
        const modelOptions = await fetchModelsWithRetry(localPort);
        setModels(modelOptions);
        if (modelOptions.length > 0) {
          setSelectedModel(prev => prev ?? modelOptions[0]);
        }
        setIsPortReady(true);
        console.log('Port forwarding setup complete, models loaded');
      } catch (err) {
        console.error('Error fetching models from /v1/models:', err);
        setPortForwardStatus(
          `Error fetching models: ${err instanceof Error ? err.message : String(err)}`
        );
        setIsPortReady(false);
      }

      portForwardIdRef.current = newPortForwardId;
      setPortForwardStatus(`Port forward running on localhost:${localPort}`);
    } catch (error) {
      console.error('Port forward error:', error);
      setPortForwardStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsPortForwardRunning(false);
      portForwardIdRef.current = null;
    }
  };

  const stopAIPortForward = () => {
    const idToStop = portForwardIdRef.current;
    if (!idToStop) {
      setIsPortForwardRunning(false);
      setPortForwardStatus('Port forward not running');
      return;
    }

    setPortForwardStatus('Stopping port forward...');
    setIsPortReady(false);
    setIsPortForwardRunning(false);
    portForwardIdRef.current = null;

    stopWorkspacePortForward(idToStop)
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
    if (!open || isPortForwardRunning || portForwardIdRef.current) return;

    console.log('🔧 Starting port forward process');
    const initiateChatBackend = async () => {
      await startPortForwardProcess();
    };
    initiateChatBackend();
  }, [open]);

  useEffect(() => {
    if (!mcpDialogOpen) return;

    const loadMCPModels = async () => {
      try {
        const mcpModels = await fetchModelsFromAllMCPServers();
        setAvailableMCPModels(mcpModels);
      } catch (error) {
        console.error('Failed to load MCP models:', error);
        setAvailableMCPModels([]);
      }
    };
    loadMCPModels();
  }, [mcpDialogOpen]);

  const handleMCPModelSelect = (mcpModel: MCPModel) => {
    console.log('MCP Model Selected:', mcpModel);

    if (portForwardIdRef.current) {
      console.log('Stopping port forward for MCP model');
      stopAIPortForward();
    }

    setSelectedMCPModel(mcpModel);
    setSelectedModel({ title: mcpModel.id, value: mcpModel.id });
    setBaseURL(mcpModel.baseURL);
    setIsPortReady(true);
    console.log('MCP Model setup complete - isPortReady set to true');
  };

  // Reload MCP tools when context settings change
  useEffect(() => {
    if (mcpContextEnabled && selectedMCPServers.length > 0) {
      const reloadTools = async () => {
        try {
          const tools = await getMCPToolsForChat();
          setMcpTools(tools);
          console.log(`Loaded ${tools.length} MCP tools for enabled servers:`, selectedMCPServers);
        } catch (error) {
          console.error('Failed to reload MCP tools:', error);
        }
      };
      reloadTools();
    }
  }, [mcpContextEnabled, selectedMCPServers]);

  const renderChatContent = (
    messages: Message[],
    messagesEndRef: React.RefObject<HTMLDivElement>,
    inputRef: React.RefObject<HTMLDivElement>,
    input: string,
    handleInputChange: (e: React.FormEvent<HTMLDivElement>) => void,
    handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void,
    handleSend: () => void,
    handleChipClick: (text: string) => void,
    clearChat: () => void,
    theme: any,
    isLoading: boolean,
    isPortReady: boolean,
    models: { title: string; value: string }[],
    selectedModel: { title: string; value: string } | null,
    setSelectedModel: React.Dispatch<React.SetStateAction<{ title: string; value: string } | null>>
  ) => (
    <>
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
              {message.role === 'user' ? '' : '🤖'}
            </Avatar>
            <MessageContent isUser={message.role === 'user'}>
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
                      message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
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
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <InputContainer
        sx={{
          background: theme.palette.background.default,
          color: theme.palette.primary.main,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-end" width="100%">
          <StyledInputBox
            onClick={() => inputRef.current?.focus()}
            sx={{
              flex: 1,
              backgroundColor: theme.palette.background.default,
              color: theme.palette.primary.main,
              border: `2px solid ${theme.palette.divider}`,
            }}
          >
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
                color: input.trim() ? theme.palette.primary.main : theme.palette.text.secondary,
                outline: 'none',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                minHeight: '20px',
                '&:empty::before': {
                  content: '"Ask me a question..."',
                  color: theme.palette.text.secondary,
                  fontStyle: 'normal',
                },
              }}
            />
          </StyledInputBox>
          <SendButton onClick={handleSend} disabled={!input.trim() || isLoading || !isPortReady}>
            {isLoading ? <CircularProgress size={20} color="inherit" /> : '➤'}
          </SendButton>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          mt={2}
          flexWrap="wrap"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box display="flex" flexWrap="wrap" gap={1} color={theme.palette.primary.main}>
            <Chip
              label="What can you do?"
              size="small"
              variant="outlined"
              onClick={() => handleChipClick('What can you help me with?')}
              sx={{
                color: theme.palette.primary.main,
                borderColor: theme.palette.divider,
              }}
            />
            <Chip
              label="Deploy an app"
              size="small"
              variant="outlined"
              onClick={() => handleChipClick('How do I deploy an application?')}
              sx={{
                color: theme.palette.primary.main,
                borderColor: theme.palette.divider,
              }}
            />
            <Chip
              label="Troubleshoot issues"
              size="small"
              variant="outlined"
              onClick={() => handleChipClick('Can you help me troubleshoot a problem?')}
              sx={{
                color: theme.palette.primary.main,
                borderColor: theme.palette.divider,
              }}
            />
          </Box>
          <Tooltip title="Select a model">
            <Autocomplete
              options={models}
              getOptionLabel={opt => opt.title}
              value={selectedModel ?? null}
              onChange={(e, val) => {
                if (val) {
                  setSelectedModel(val);
                }
              }}
              sx={{
                width: '150px',
                '& .MuiInputBase-root': {
                  height: '32px',
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.background.default,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.divider,
                },
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Model"
                  variant="outlined"
                  sx={{
                    '& .MuiInputLabel-root': {
                      fontSize: '12px',
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              )}
            />
          </Tooltip>
        </Stack>
      </InputContainer>
    </>
  );

  if (embedded) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          background: theme.palette.background.default,
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            p: 1,
            pb: 0,
          }}
        >
          <Stack direction="row" spacing={1}>
            <Tooltip
              title={
                mcpContextEnabled
                  ? 'MCP Context Active - Click to manage'
                  : 'MCP Context Off - Click to configure'
              }
            >
              <Chip
                label={mcpContextEnabled ? `MCP (${selectedMCPServers.length})` : 'MCP OFF'}
                size="small"
                variant={mcpContextEnabled ? 'filled' : 'outlined'}
                color={mcpContextEnabled ? 'success' : 'default'}
                onClick={() => setMcpDialogOpen(true)}
                sx={{
                  fontSize: '9px',
                  height: '20px',
                  minWidth: '40px',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: mcpContextEnabled ? 'success.light' : 'grey.100',
                  },
                }}
              />
            </Tooltip>
            <Tooltip title="Model Settings">
              <IconButton
                onClick={() => setSettingsOpen(true)}
                size="small"
                sx={{
                  color: theme.palette.primary.main,
                  fontSize: '18px',
                  width: 32,
                  height: 32,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    color: theme.palette.primary.dark,
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                }}
                aria-label="Model Settings"
              >
                ⚙
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => {
                stopAIPortForward();
                onClose?.();
              }}
              size="small"
              sx={{
                color: theme.palette.error.main,
                fontSize: '18px',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  color: theme.palette.error.dark,
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
              aria-label="Close chat"
            >
              ✕
            </IconButton>
          </Stack>
        </Box>

        {renderChatContent(
          messages,
          messagesEndRef,
          inputRef,
          input,
          handleInputChange,
          handleKeyDown,
          handleSend,
          handleChipClick,
          clearChat,
          theme,
          isLoading,
          isPortReady,
          models,
          selectedModel,
          setSelectedModel
        )}

        <ModelSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onSave={setConfig}
        />

        <Dialog
          open={mcpDialogOpen}
          onClose={() => setMcpDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: '16px' },
          }}
        >
          <DialogContent sx={{ p: 0 }}>
            <MCPServerManager />
            <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                MCP Context Configuration
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  Enable MCP Context
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={mcpContextEnabled ? 'Enabled' : 'Disabled'}
                    size="small"
                    variant={mcpContextEnabled ? 'filled' : 'outlined'}
                    color={mcpContextEnabled ? 'success' : 'default'}
                    onClick={() => setMcpContextEnabled(!mcpContextEnabled)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {mcpContextEnabled
                      ? 'MCP context will enhance your queries with available tools and resources'
                      : 'Click to enable MCP context for tool-augmented queries'}
                  </Typography>
                </Box>
              </Box>

              {mcpContextEnabled && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    Select MCP Servers
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose which MCP servers to use for context enhancement:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {availableMCPServers.map(serverName => (
                      <Chip
                        key={serverName}
                        label={serverName}
                        size="small"
                        variant={selectedMCPServers.includes(serverName) ? 'filled' : 'outlined'}
                        color={selectedMCPServers.includes(serverName) ? 'primary' : 'default'}
                        onClick={() => {
                          if (selectedMCPServers.includes(serverName)) {
                            setSelectedMCPServers(prev => prev.filter(s => s !== serverName));
                          } else {
                            setSelectedMCPServers(prev => [...prev, serverName]);
                          }
                        }}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                    {availableMCPServers.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: 'italic' }}
                      >
                        No MCP servers configured. Add servers above to enable context features.
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    );
  }
  return (
    <ChatDialog
      open={open}
      onClose={() => {
        stopAIPortForward();
        if (onClose) onClose();
      }}
      maxWidth={false}
      PaperProps={{
        sx: { m: 2, background: theme.palette.background.paper },
      }}
    >
      <ChatHeader sx={{ background: theme.palette.background.default }}>
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
              <Typography variant="h6" fontWeight="600" color={theme.palette.text.primary}>
                Chat with {selectedModel?.title ?? 'Model'}
                {mcpContextEnabled && selectedMCPServers.length > 0 && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    + MCP Tools ({selectedMCPServers.length} servers)
                  </Typography>
                )}
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
            <Tooltip
              title={
                mcpContextEnabled
                  ? 'MCP Context Active - Click to manage'
                  : 'MCP Context Off - Click to configure'
              }
            >
              <Chip
                label={mcpContextEnabled ? `MCP (${selectedMCPServers.length})` : 'MCP OFF'}
                size="small"
                variant={mcpContextEnabled ? 'filled' : 'outlined'}
                color={mcpContextEnabled ? 'success' : 'default'}
                onClick={() => setMcpDialogOpen(true)}
                sx={{
                  fontSize: '10px',
                  height: '24px',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: mcpContextEnabled ? 'success.light' : 'grey.100',
                  },
                }}
              />
            </Tooltip>
            <Tooltip title="Model Settings">
              <IconButton onClick={() => setSettingsOpen(true)} size="small">
                ⚙️
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear conversation">
              <IconButton onClick={clearChat} size="small">
                🗑️
              </IconButton>
            </Tooltip>
            <Tooltip title="Close chat">
              <IconButton
                onClick={() => {
                  stopAIPortForward();
                  onClose?.();
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
          </Stack>
        </Stack>
      </ChatHeader>

      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: theme.palette.background.default,
        }}
      >
        {renderChatContent(
          messages,
          messagesEndRef,
          inputRef,
          input,
          handleInputChange,
          handleKeyDown,
          handleSend,
          handleChipClick,
          clearChat,
          theme,
          isLoading,
          isPortReady,
          models,
          selectedModel,
          setSelectedModel
        )}
      </DialogContent>

      {/* MCP Server Management Dialog */}
      <Dialog
        open={mcpDialogOpen}
        onClose={() => setMcpDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px' },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <MCPServerManager />
          <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              MCP Context Configuration
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Enable MCP Context
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={mcpContextEnabled ? 'Enabled' : 'Disabled'}
                  size="small"
                  variant={mcpContextEnabled ? 'filled' : 'outlined'}
                  color={mcpContextEnabled ? 'success' : 'default'}
                  onClick={() => setMcpContextEnabled(!mcpContextEnabled)}
                  sx={{ cursor: 'pointer' }}
                />
                <Typography variant="body2" color="text.secondary">
                  {mcpContextEnabled
                    ? 'MCP context will enhance your queries with available tools and resources'
                    : 'Click to enable MCP context for tool-augmented queries'}
                </Typography>
              </Box>
            </Box>

            {mcpContextEnabled && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  Select MCP Servers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose which MCP servers to use for context enhancement:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableMCPServers.map(serverName => (
                    <Chip
                      key={serverName}
                      label={serverName}
                      size="small"
                      variant={selectedMCPServers.includes(serverName) ? 'filled' : 'outlined'}
                      color={selectedMCPServers.includes(serverName) ? 'primary' : 'default'}
                      onClick={() => {
                        if (selectedMCPServers.includes(serverName)) {
                          setSelectedMCPServers(prev => prev.filter(s => s !== serverName));
                        } else {
                          setSelectedMCPServers(prev => [...prev, serverName]);
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  {availableMCPServers.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No MCP servers configured. Add servers above to enable context features.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <ModelSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSave={setConfig}
      />
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
  return (
    <>
      <ChatFAB onClick={() => setOpen(true)} />
      <ChatUI open={open} onClose={() => setOpen(false)} namespace="default" />
    </>
  );
};

export default ChatUI;
export { ChatWithFAB };
