import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Stack,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  request,
  startPortForward,
  stopOrDeletePortForward,
} from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import ChatUI from './ChatUI';

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
        const options = (response.items || []).map((item: any) => ({
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
    const resolvePodAndPort = async () => {
      const labelSelector = `kaito.sh/workspace=${workspaceName}`;
      const podsResp = await request(
        `/api/v1/namespaces/${namespace}/pods?labelSelector=${labelSelector}`
      );
      const pod = podsResp?.items?.[0];
      const containerPort = pod?.spec?.containers?.[0]?.ports?.[0]?.containerPort;
      return containerPort ? { podName: pod.metadata.name, targetPort: containerPort } : null;
    };

    const startForward = async () => {
      if (!workspaceName) return;

      const resolved = await resolvePodAndPort();
      if (!resolved) return;

      const cluster = getCluster() || '';
      const newPort = String(10000 + Math.floor(Math.random() * 10000));
      const pfId = `${workspaceName}-${Date.now()}`;

      await startPortForward(
        cluster,
        namespace,
        resolved.podName,
        resolved.targetPort.toString(),
        workspaceName,
        namespace,
        newPort,
        'localhost',
        pfId
      );

      setLocalPort(newPort);
      setPortForwardId(pfId);
    };

    startForward();

    return () => {
      if (portForwardId) {
        const cluster = getCluster() || '';
        stopOrDeletePortForward(cluster, portForwardId, true).catch(console.error);
      }
    };
  }, [workspaceName, portForwardId]);

  useEffect(() => {
    if (!localPort) return;

    const fetchModels = async () => {
      try {
        const res = await fetch(`http://localhost:${localPort}/v1/models`);
        const data = await res.json();
        const modelOptions = (data.data || []).map((model: any) => ({
          title: model.id,
          value: model.id,
        }));
        setModels(modelOptions);
        if (modelOptions.length > 0) setSelectedModel(modelOptions[0]);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setModels([]);
      }
    };

    fetchModels();
  }, [localPort]);

  const handleGoClick = () => {
    setDialogOpen(true);
  };

  return (
    <Box
      sx={{ width: '100vw', height: '100vh', background: theme.palette.background.default, p: 4 }}
    >
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <Typography variant="h5" fontWeight={600}>
          Chat with
        </Typography>
        <Autocomplete
          options={workspaceOptions}
          getOptionLabel={opt => opt.label}
          value={selectedWorkspace}
          onChange={(_, val) => setSelectedWorkspace(val)}
          sx={{ width: 250 }}
          renderInput={params => <TextField {...params} label="Workspace" />}
        />
        {selectedWorkspace && (
          <Autocomplete
            options={models}
            getOptionLabel={opt => opt.title}
            value={selectedModel}
            onChange={(_, val) => setSelectedModel(val)}
            sx={{ width: 250 }}
            renderInput={params => <TextField {...params} label="Model" />}
          />
        )}
        {selectedWorkspace && selectedModel && (
          <Button variant="contained" color="primary" onClick={handleGoClick}>
            Go
          </Button>
        )}
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedWorkspace(null);
          setSelectedModel(null);
          setLocalPort(null);
          setPortForwardId(null);
        }}
      >
        <ChatUI
          namespace={selectedWorkspace?.namespace}
          workspaceName={selectedWorkspace?.label}
          onClose={() => {
            setDialogOpen(false);
            setSelectedWorkspace(null);
            setSelectedModel(null);
            setLocalPort(null);
            setPortForwardId(null);
          }}
        />
      </Dialog>
    </Box>
  );
};

export default KaitoChat;
