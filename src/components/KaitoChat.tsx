import React, { useEffect, useState } from 'react';
import { Box, Typography, Autocomplete, TextField, Stack } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  request,
  startPortForward,
  stopOrDeletePortForward,
} from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';

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
  const { workspaceName, namespace = 'default' } = state;

  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [localPort, setLocalPort] = useState<string | null>(null);
  const [portForwardId, setPortForwardId] = useState<string | null>(null);

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
      // Stop port forward on unmount
      if (portForwardId) {
        const cluster = getCluster() || '';
        stopOrDeletePortForward(cluster, portForwardId, true).catch(console.error);
      }
    };
  }, [workspaceName]);

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

  return (
    <Box
      sx={{ width: '100vw', height: '100vh', background: theme.palette.background.default, p: 4 }}
    >
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <Typography variant="h5" fontWeight={600} color={theme.palette.text.primary}>
          Chat with
        </Typography>
        <Autocomplete
          options={models}
          getOptionLabel={opt => opt.title}
          value={selectedModel}
          onChange={(_, val) => setSelectedModel(val)}
          sx={{
            width: 220,
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }}
          renderInput={params => <TextField {...params} label="Model" variant="outlined" />}
        />
      </Stack>
      {/* Add chat UI here if needed */}
    </Box>
  );
};

export default KaitoChat;
