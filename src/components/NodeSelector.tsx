import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  TextField,
  FormHelperText,
  Stack,
  Autocomplete,
  Checkbox,
  ListItemText,
  Button,
  Collapse,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { fetchAvailableNodes } from './chatUtils';

interface NodeInfo {
  name: string;
  labels: Record<string, string>;
  ready: boolean;
  taints: Array<{
    key: string;
    value?: string;
    effect: string;
  }>;
}

interface NodeSelectorProps {
  selectedNodes: string[];
  onNodesChange: (nodes: string[]) => void;
  labelSelector?: string;
  onLabelSelectorChange?: (selector: string) => void;
  disabled?: boolean;
  showLabelSelector?: boolean;
  helperText?: string;
}

const COMMON_LABEL_SELECTORS = [
  { label: 'GPU Nodes', value: 'accelerator=nvidia' },
  { label: 'AMD64 Architecture', value: 'kubernetes.io/arch=amd64' },
  { label: 'Standard NC24 Instances', value: 'node.kubernetes.io/instance-type=Standard_NC24ads_A100_v4' },
  { label: 'Standard NC96 Instances', value: 'node.kubernetes.io/instance-type=Standard_NC96ads_A100_v4' },
  { label: 'GPU + AMD64', value: 'accelerator=nvidia,kubernetes.io/arch=amd64' },
];

const NodeSelector: React.FC<NodeSelectorProps> = ({
  selectedNodes,
  onNodesChange,
  labelSelector = '',
  onLabelSelectorChange,
  disabled = false,
  showLabelSelector = true,
  helperText = 'Select specific nodes for model deployment. Leave empty to use Kaito GPU provisioner.',
}) => {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchNodes = async (selector?: string) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedNodes = await fetchAvailableNodes(selector);
      setNodes(fetchedNodes);
      if (fetchedNodes.length === 0 && selector) {
        setError('No nodes match the specified label selector');
      }
    } catch (err) {
      setError('Failed to fetch nodes');
      console.error('Error fetching nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes(labelSelector);
  }, [labelSelector]);

  const handleLabelSelectorChange = (value: string) => {
    if (onLabelSelectorChange) {
      onLabelSelectorChange(value);
    }
  };

  const handleNodeToggle = (nodeName: string) => {
    const newSelectedNodes = selectedNodes.includes(nodeName)
      ? selectedNodes.filter(n => n !== nodeName)
      : [...selectedNodes, nodeName];
    onNodesChange(newSelectedNodes);
  };

  const getNodeStatus = (node: NodeInfo) => {
    if (!node.ready) return { color: 'error', icon: 'mdi:alert-circle', text: 'Not Ready' };
    if (node.taints.some(t => t.effect === 'NoSchedule')) {
      return { color: 'warning', icon: 'mdi:alert', text: 'Tainted' };
    }
    return { color: 'success', icon: 'mdi:check-circle', text: 'Ready' };
  };

  const filteredNodes = nodes.filter(node => node.ready);
  const availableNodeOptions = filteredNodes.map(node => ({
    value: node.name,
    label: node.name,
    node,
  }));

  const handleQuickSelect = (selector: string) => {
    handleLabelSelectorChange(selector);
  };

  const clearSelection = () => {
    onNodesChange([]);
    handleLabelSelectorChange('');
  };

  return (
    <Box>
      {showLabelSelector && (
        <Box mb={2}>
          <Stack spacing={1}>
            <TextField
              fullWidth
              label="Node Label Selector (optional)"
              value={labelSelector}
              onChange={(e) => handleLabelSelectorChange(e.target.value)}
              disabled={disabled}
              placeholder="e.g., node-type=gpu,kubernetes.io/arch=amd64"
              helperText="Filter nodes by labels. Use comma-separated key=value pairs."
              size="small"
            />
            
            <Button
              variant="text"
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              startIcon={<Icon icon={showAdvanced ? 'mdi:chevron-up' : 'mdi:chevron-down'} />}
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              Quick Selectors
            </Button>
            
            <Collapse in={showAdvanced}>
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Common label selectors:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {COMMON_LABEL_SELECTORS.map((preset) => (
                    <Chip
                      key={preset.value}
                      label={preset.label}
                      size="small"
                      variant="outlined"
                      onClick={() => handleQuickSelect(preset.value)}
                      clickable
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Stack>
              </Box>
            </Collapse>
          </Stack>
        </Box>
      )}

      <FormControl fullWidth disabled={disabled}>
        <Autocomplete
          multiple
          options={availableNodeOptions}
          value={availableNodeOptions.filter(option => selectedNodes.includes(option.value))}
          onChange={(_, newValue) => {
            onNodesChange(newValue.map(option => option.value));
          }}
          getOptionLabel={(option) => option.label}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Preferred Nodes"
              placeholder={selectedNodes.length === 0 ? "Select nodes (optional)" : ""}
              size="small"
            />
          )}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox
                checked={selected}
                style={{ marginRight: 8 }}
              />
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2">{option.node.name}</Typography>
                  <Icon 
                    icon={getNodeStatus(option.node).icon} 
                    color={getNodeStatus(option.node).color}
                    width={16}
                    height={16}
                  />
                </Stack>
                {option.node.taints.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Taints: {option.node.taints.map(t => `${t.key}:${t.effect}`).join(', ')}
                  </Typography>
                )}
              </Box>
            </li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option.label}
                size="small"
                {...getTagProps({ index })}
                key={option.value}
              />
            ))
          }
          disableCloseOnSelect
          limitTags={3}
        />
        <FormHelperText>
          {error ? (
            <Box color="error.main" display="flex" alignItems="center" gap={0.5}>
              <Icon icon="mdi:alert-circle" width={16} height={16} />
              {error}
            </Box>
          ) : (
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <span>{helperText}</span>
              {(selectedNodes.length > 0 || labelSelector) && (
                <Button
                  size="small"
                  onClick={clearSelection}
                  sx={{ textTransform: 'none', minWidth: 'auto' }}
                >
                  Clear
                </Button>
              )}
            </Stack>
          )}
        </FormHelperText>
      </FormControl>

      {selectedNodes.length > 0 && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selected Nodes ({selectedNodes.length}):
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {selectedNodes.map(nodeName => {
              const node = nodes.find(n => n.name === nodeName);
              const status = node ? getNodeStatus(node) : { color: 'default', icon: 'mdi:help', text: 'Unknown' };
              
              return (
                <Chip
                  key={nodeName}
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <span>{nodeName}</span>
                      <Icon icon={status.icon} width={14} height={14} />
                    </Stack>
                  }
                  size="small"
                  variant="outlined"
                  onDelete={() => handleNodeToggle(nodeName)}
                  color={status.color as any}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default NodeSelector;
