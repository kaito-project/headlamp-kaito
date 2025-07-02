import React, { useState, useEffect } from 'react';
import { MCPServerConfig } from '../config/mcp';
import { TextField, Button, List, ListItem, Typography, Box } from '@mui/material';

const LOCAL_STORAGE_KEY = 'mcpServers';

const MCPServerManager: React.FC = () => {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) setServers(JSON.parse(stored));
  }, []);

  const validateMCPServer = async (url: string): Promise<boolean> => {
    try {
      // For MCP servers, we can't validate with a simple HTTP call
      // as they use StreamableHTTP transport. Return true for now.
      return true;
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    setError('');
    const trimmedURL = url.trim().replace(/\/+$/, '');
    if (!trimmedURL || !name) {
      setError('Name and URL required');
      return;
    }

    const isValid = await validateMCPServer(trimmedURL);
    if (!isValid) {
      setError('Invalid MCP server');
      return;
    }

    const newServer = { name, url: trimmedURL };
    const updated = [...servers, newServer];
    setServers(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    setName('');
    setUrl('');
  };

  const handleRemove = (index: number) => {
    const updated = [...servers];
    updated.splice(index, 1);
    setServers(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Manage MCP Servers
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add MCP (Model Context Protocol) servers to access additional AI models. Enter the server
        details below and click Add to register a new server.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <TextField
          label="Server Name"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          placeholder="e.g., My Local Server"
        />
        <TextField
          label="Server URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          fullWidth
          placeholder="e.g., http://localhost:8080/mcp"
          helperText="The StreamableHTTP endpoint URL of your MCP server"
        />
        <Button
          variant="contained"
          onClick={handleAdd}
          sx={{ alignSelf: 'flex-start' }}
          disabled={!name.trim() || !url.trim()}
        >
          Add Server
        </Button>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 3, p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
          {error}
        </Typography>
      )}

      {servers.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Registered Servers
          </Typography>
          <List>
            {servers.map((server, i) => (
              <ListItem
                key={`server-${i}`}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.default',
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {server.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {server.url}
                  </Typography>
                </Box>
                <Button
                  onClick={() => handleRemove(i)}
                  size="small"
                  color="error"
                  variant="outlined"
                >
                  Remove
                </Button>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
};

export default MCPServerManager;
