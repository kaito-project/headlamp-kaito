import { Icon } from '@iconify/react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
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
  onNodesChange: (_nodes: string[]) => void;
  labelSelector?: string;
  onLabelSelectorChange?: (_selector: string) => void;
  disabled?: boolean;
  showLabelSelector?: boolean;
  helperText?: string;
  onRequiredNodesChange?: (
    _requiredNodes: number | '',
    _isExactMatch: boolean,
    _willAutoProvision: boolean
  ) => void;
}

const COMMON_LABEL_SELECTORS = [
  { label: 'NVIDIA Nodes', value: 'accelerator=nvidia' },
  { label: 'AMD64 Architecture', value: 'kubernetes.io/arch=amd64' },
  {
    label: 'Standard NC24 Instances',
    value: 'node.kubernetes.io/instance-type=Standard_NC24ads_A100_v4',
  },
  {
    label: 'Standard NC96 Instances',
    value: 'node.kubernetes.io/instance-type=Standard_NC96ads_A100_v4',
  },
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
  onRequiredNodesChange,
}) => {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoFilterGPU, setAutoFilterGPU] = useState(true);
  const [requiredNodes, setRequiredNodes] = useState<number | ''>('');

  const fetchNodes = async (selector?: string) => {
    setLoading(true);
    setError(null);
    try {
      let finalSelector = selector;

      if (autoFilterGPU) {
        const gpuSelector = 'accelerator=nvidia';
        finalSelector = selector ? `${gpuSelector},${selector}` : gpuSelector;
      }

      const fetchedNodes = await fetchAvailableNodes(finalSelector);
      setNodes(fetchedNodes);
      if (fetchedNodes.length === 0 && finalSelector) {
        const nodeType = autoFilterGPU ? 'GPU nodes' : 'nodes';
        setError(`No ${nodeType} match the specified criteria`);
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
  }, [labelSelector, autoFilterGPU]);

  // Notify parent about required nodes status
  useEffect(() => {
    if (onRequiredNodesChange && typeof requiredNodes === 'number') {
      const isExactMatch = selectedNodes.length === requiredNodes;
      const willAutoProvision = selectedNodes.length === 0;
      onRequiredNodesChange(requiredNodes, isExactMatch, willAutoProvision);
    } else if (onRequiredNodesChange) {
      onRequiredNodesChange('', true, false);
    }
  }, [requiredNodes, selectedNodes.length, onRequiredNodesChange]);

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
    setRequiredNodes('');
  };

  return (
    <Box>
      {showLabelSelector && (
        <Box mb={2}>
          <Stack spacing={1}>
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
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Common label selectors:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {COMMON_LABEL_SELECTORS.filter(preset =>
                    // Hide GPU-related selectors when auto-filter is enabled
                    autoFilterGPU ? !preset.value.includes('accelerator=nvidia') : true
                  ).map(preset => (
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

            <TextField
              fullWidth
              label="Specify Number of Nodes (optional)"
              type="number"
              value={requiredNodes}
              onChange={e =>
                setRequiredNodes(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              disabled={disabled}
              placeholder="e.g., 2"
              helperText="Specify the exact number of nodes. If not selected, Kaito will auto-provision this many nodes."
              size="small"
              inputProps={{ min: 1 }}
            />

            <TextField
              fullWidth
              label={
                autoFilterGPU
                  ? 'Additional GPU Node Filters (optional)'
                  : 'Node Label Selector (optional)'
              }
              value={labelSelector}
              onChange={e => handleLabelSelectorChange(e.target.value)}
              disabled={disabled}
              placeholder={
                autoFilterGPU
                  ? 'e.g., kubernetes.io/arch=amd64,node.kubernetes.io/instance-type=Standard_NC24ads_A100_v4'
                  : 'e.g., accelerator=nvidia,kubernetes.io/arch=amd64'
              }
              helperText={
                autoFilterGPU
                  ? 'Add additional filters for GPU nodes.'
                  : 'Filter nodes by labels. Use comma-separated key=value pairs.'
              }
              size="small"
            />
          </Stack>
        </Box>
      )}

      <Box mb={2} display="flex" justifyContent="flex-end">
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={autoFilterGPU}
                onChange={e => setAutoFilterGPU(e.target.checked)}
                disabled={disabled}
                size="small"
              />
            }
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2">Show GPU nodes only</Typography>
              </Stack>
            }
            sx={{ margin: 0 }}
          />
        </Box>
      </Box>

      <FormControl fullWidth disabled={disabled}>
        <Autocomplete
          multiple
          options={availableNodeOptions}
          value={availableNodeOptions.filter(option => selectedNodes.includes(option.value))}
          onChange={(_, newValue) => {
            const selectedNodeNames = newValue.map(option => option.value);
            onNodesChange(selectedNodeNames);
          }}
          getOptionLabel={option => option.label}
          loading={loading}
          renderInput={params => (
            <TextField
              {...params}
              label={autoFilterGPU ? 'Preferred GPU Nodes' : 'Preferred Nodes'}
              placeholder={
                selectedNodes.length === 0
                  ? `Select ${autoFilterGPU ? 'GPU ' : ''}nodes${
                      requiredNodes ? ` (need exactly ${requiredNodes})` : ''
                    } (optional)`
                  : ''
              }
              size="small"
            />
          )}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox checked={selected} style={{ marginRight: 8 }} />
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
              <Box>
                <span>{helperText}</span>
                {requiredNodes && typeof requiredNodes === 'number' && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Selected: {selectedNodes.length}/{requiredNodes}
                    {selectedNodes.length !== requiredNodes && (
                      <span
                        style={{
                          color: selectedNodes.length === 0 ? 'orange' : 'red',
                          marginLeft: 4,
                        }}
                      >
                        {selectedNodes.length === 0
                          ? '(Will auto-provision)'
                          : `(Need ${requiredNodes - selectedNodes.length} more)`}
                      </span>
                    )}
                    {selectedNodes.length === requiredNodes && (
                      <span style={{ color: 'green', marginLeft: 4 }}>Exact requirement met</span>
                    )}
                  </Typography>
                )}
              </Box>
              {(selectedNodes.length > 0 || labelSelector || requiredNodes) && (
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
              const status = node
                ? getNodeStatus(node)
                : { color: 'default', icon: 'mdi:help', text: 'Unknown' };

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
