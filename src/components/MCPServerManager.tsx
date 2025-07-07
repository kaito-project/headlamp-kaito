import React, { useState, useEffect } from 'react';
import { MCPServer } from '../utils/mcpIntegration';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';

interface MCPServerManagerProps {
  open: boolean;
  onClose: () => void;
  servers: MCPServer[];
  onServersChange: (servers: MCPServer[]) => void;
}

const MCPServerManager: React.FC<MCPServerManagerProps> = ({
  open,
  onClose,
  servers,
  onServersChange,
}) => {
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [newServer, setNewServer] = useState<Partial<MCPServer>>({
    name: '',
    endpoint: '',
    description: '',
    enabled: true,
    apiKey: '',
    authMethod: 'header',
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddServer = () => {
    if (!newServer.name || !newServer.endpoint) return;

    const server: MCPServer = {
      id: Date.now().toString(),
      name: newServer.name,
      endpoint: newServer.endpoint,
      description: newServer.description || '',
      enabled: true,
      apiKey: newServer.apiKey || '',
      authMethod: newServer.authMethod || 'header',
    };

    onServersChange([...servers, server]);
    setNewServer({
      name: '',
      endpoint: '',
      description: '',
      enabled: true,
      apiKey: '',
      authMethod: 'header',
    });
    setShowAddForm(false);
  };

  const handleDeleteServer = (id: string) => {
    onServersChange(servers.filter(server => server.id !== id));
  };

  const handleToggleServer = (id: string) => {
    onServersChange(
      servers.map(server => (server.id === id ? { ...server, enabled: !server.enabled } : server))
    );
  };

  const handleEditServer = (server: MCPServer) => {
    setEditingServer(server);
  };

  const handleSaveEdit = () => {
    if (!editingServer) return;

    onServersChange(
      servers.map(server => (server.id === editingServer.id ? editingServer : server))
    );
    setEditingServer(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>MCP Server Management</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage Model Context Protocol (MCP) servers that provide tools and capabilities to your
            AI models.
          </Typography>

          {servers.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No MCP servers configured. Add a server to enable advanced AI capabilities.
            </Alert>
          )}

          <List>
            {servers.map(server => (
              <ListItem key={server.id} divider>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1">{server.name}</Typography>
                      <Chip
                        label={server.enabled ? 'Enabled' : 'Disabled'}
                        color={server.enabled ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleServer(server.id)}
                        clickable
                      />
                    </Stack>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {server.endpoint}
                      </Typography>
                      {server.description && (
                        <Typography variant="caption" color="text.secondary">
                          {server.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => handleEditServer(server)} size="small">
                    ✏️
                  </IconButton>
                  <IconButton onClick={() => handleDeleteServer(server.id)} size="small">
                    🗑️
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
            >
              Add MCP Server
            </Button>
          )}

          {showAddForm && (
            <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Add New MCP Server
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Server Name"
                  value={newServer.name}
                  onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label="Endpoint URL"
                  value={newServer.endpoint}
                  onChange={e => setNewServer({ ...newServer, endpoint: e.target.value })}
                  fullWidth
                  required
                  placeholder="http://localhost:3000/mcp"
                  helperText="MCP server endpoint URL"
                />
                <TextField
                  label="Description (optional)"
                  value={newServer.description}
                  onChange={e => setNewServer({ ...newServer, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="API Key (optional)"
                  value={newServer.apiKey}
                  onChange={e => setNewServer({ ...newServer, apiKey: e.target.value })}
                  fullWidth
                  type="password"
                  helperText="Leave empty if server doesn't require authentication"
                />
                <FormControl fullWidth>
                  <InputLabel>Authentication Method</InputLabel>
                  <Select
                    value={newServer.authMethod || 'header'}
                    label="Authentication Method"
                    onChange={e =>
                      setNewServer({ ...newServer, authMethod: e.target.value as 'url' | 'header' })
                    }
                  >
                    <MenuItem value="header">Authorization Header</MenuItem>
                    <MenuItem value="url">URL Path</MenuItem>
                  </Select>
                  <FormHelperText>
                    {newServer.authMethod === 'url'
                      ? 'API key will be included in URL path: /api-key/mcp'
                      : 'API key will be sent in Authorization header as Bearer token'}
                  </FormHelperText>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <Button
                    onClick={handleAddServer}
                    variant="contained"
                    disabled={!newServer.name || !newServer.endpoint}
                  >
                    Add Server
                  </Button>
                  <Button onClick={() => setShowAddForm(false)} variant="outlined">
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Box>

        {/* Edit Server Dialog */}
        <Dialog open={!!editingServer} onClose={() => setEditingServer(null)}>
          <DialogTitle>Edit MCP Server</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Server Name"
                value={editingServer?.name || ''}
                onChange={e =>
                  setEditingServer(prev => (prev ? { ...prev, name: e.target.value } : null))
                }
                fullWidth
                required
              />
              <TextField
                label="Endpoint URL"
                value={editingServer?.endpoint || ''}
                onChange={e =>
                  setEditingServer(prev => (prev ? { ...prev, endpoint: e.target.value } : null))
                }
                fullWidth
                required
              />
              <TextField
                label="Description (optional)"
                value={editingServer?.description || ''}
                onChange={e =>
                  setEditingServer(prev => (prev ? { ...prev, description: e.target.value } : null))
                }
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="API Key (optional)"
                value={editingServer?.apiKey || ''}
                onChange={e =>
                  setEditingServer(prev => (prev ? { ...prev, apiKey: e.target.value } : null))
                }
                fullWidth
                type="password"
                helperText="Leave empty if server doesn't require authentication"
              />
              <FormControl fullWidth>
                <InputLabel>Authentication Method</InputLabel>
                <Select
                  value={editingServer?.authMethod || 'header'}
                  label="Authentication Method"
                  onChange={e =>
                    setEditingServer(prev =>
                      prev ? { ...prev, authMethod: e.target.value as 'url' | 'header' } : null
                    )
                  }
                >
                  <MenuItem value="header">Authorization Header</MenuItem>
                  <MenuItem value="url">URL Path</MenuItem>
                </Select>
                <FormHelperText>
                  {editingServer?.authMethod === 'url'
                    ? 'API key will be included in URL path: /api-key/mcp'
                    : 'API key will be sent in Authorization header as Bearer token'}
                </FormHelperText>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingServer(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MCPServerManager;
