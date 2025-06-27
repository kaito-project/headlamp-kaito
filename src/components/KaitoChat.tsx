import React, { useEffect, useState } from 'react';
import { Box, Typography, Autocomplete, TextField, Stack, Button } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import ChatUI from './ChatUI';
import {
  resolvePodAndPort,
  startWorkspacePortForward,
  stopWorkspacePortForward,
  fetchModelsWithRetry,
} from './chatUtils';
import { request } from '@kinvolk/headlamp-plugin/lib/ApiProxy';

interface ModelOption {
  title: string;
  value: string;
}

const KaitoChat: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const state = (location.state || {}) as {
    workspaceName?: string;
    namespace?: string;
  };

  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [localPort, setLocalPort] = useState<string | null>(null);
  const [portForwardId, setPortForwardId] = useState<string | null>(null);
  const [workspaceOptions, setWorkspaceOptions] = useState<{ label: string; namespace: string }[]>(
    []
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState<{
    label: string;
    namespace: string;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await request('/apis/kaito.sh/v1beta1/workspaces');
        const options = (response.items || [])
          .filter((item: any) => {
            const inferenceReadyCondition = (item.status?.conditions || []).find(
              (condition: any) => condition.type === 'InferenceReady'
            );
            return inferenceReadyCondition?.status === 'True';
          })
          .map((item: any) => ({
            label: item.metadata.name,
            namespace: item.metadata.namespace,
          }));
        setWorkspaceOptions(options);
      } catch (err) {
        console.error('Failed to fetch workspaces:', err);
      }
    };

    fetchWorkspaces();
  }, []);
  const workspaceName = selectedWorkspace?.label;
  const namespace = selectedWorkspace?.namespace || 'default';

  useEffect(() => {
    let cancelled = false;
    const startForward = async () => {
      if (!workspaceName) return;

      const resolved = await resolvePodAndPort(namespace, workspaceName);
      if (!resolved) return;

      const newPort = String(10000 + Math.floor(Math.random() * 10000));
      const pfId = workspaceName + '/' + namespace;

      await startWorkspacePortForward({
        namespace,
        workspaceName,
        podName: resolved.podName,
        targetPort: resolved.targetPort,
        localPort: newPort,
        portForwardId: pfId,
      });

      if (!cancelled) {
        setLocalPort(newPort);
        setPortForwardId(pfId);
      }
    };

    startForward();

    return () => {
      cancelled = true;
      if (portForwardId) {
        stopWorkspacePortForward(portForwardId).catch(console.error);
      }
    };
  }, [workspaceName, portForwardId]);

  useEffect(() => {
    if (!localPort) return;

    const fetchModels = async () => {
      try {
        const modelOptions = await fetchModelsWithRetry(localPort);
        setModels(modelOptions);
        if (modelOptions.length > 0) setSelectedModel(modelOptions[0]);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setModels([]);
      }
    };

    fetchModels();
  }, [localPort]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        position: 'relative',
        background: theme.palette.background.default,
        p: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={2} mb={4} sx={{ flexShrink: 0, alignItems: 'flex-start' }}>
        <Typography
          variant="h5"
          fontWeight={600}
          sx={{
            color:
              theme.palette.mode === 'dark'
                ? theme.palette.common.white
                : theme.palette.text.primary,
            mt: 3.5,
          }}
        >
          Chat with
        </Typography>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Workspace
          </Typography>
          <Box sx={{ width: 250 }}>
            <Autocomplete
              options={workspaceOptions}
              getOptionLabel={opt => opt.label}
              value={selectedWorkspace}
              onChange={(_, val) => setSelectedWorkspace(val)}
              fullWidth
              noOptionsText="No ready workspaces available"
              renderInput={params => <TextField {...params} placeholder="Select a workspace" />}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Only showing ready workspaces
            </Typography>
          </Box>
        </Box>
        {selectedWorkspace && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Model
            </Typography>
            <Box sx={{ width: 250 }}>
              <Autocomplete
                options={models}
                getOptionLabel={opt => opt.title}
                value={selectedModel}
                onChange={(_, val) => setSelectedModel(val)}
                fullWidth
                renderInput={params => <TextField {...params} placeholder="Select a model" />}
              />
            </Box>
          </Box>
        )}
        {selectedWorkspace && selectedModel && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5, visibility: 'hidden', display: 'block' }}
            >
              Button
            </Typography>
            <Box sx={{ width: '80px' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setDialogOpen(true)}
                sx={{ height: '56px', width: '100%' }}
              >
                Go
              </Button>
            </Box>
          </Box>
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {dialogOpen && selectedWorkspace && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ChatUI
              embedded
              namespace={selectedWorkspace.namespace}
              workspaceName={selectedWorkspace.label}
              onClose={() => {
                setDialogOpen(false);
                setSelectedWorkspace(null);
                setSelectedModel(null);
                setLocalPort(null);
                setPortForwardId(null);
              }}
              theme={theme}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default KaitoChat;
