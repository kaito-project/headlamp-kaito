import { Icon } from '@iconify/react';
import { EditorDialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import yaml from 'js-yaml';
import React, { useRef, useState } from 'react';
import { fetchAvailableNodes } from '../utils/chatUtils';
import NodeSelector from './NodeSelector';

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

interface PresetModel {
  name: string;
  version: string;
  company: {
    name: string;
    url: string;
  };
  supportsTools: boolean;
  logoImageId: string;
  description: string;
  instanceType: string;
}

interface WorkspaceDeploymentDialogProps {
  open: boolean;
  onClose: () => void;
  model: PresetModel | null;
  onDeploy?: (_yamlContent: string) => void;
}

const WorkspaceDeploymentDialog: React.FC<WorkspaceDeploymentDialogProps> = ({
  open,
  onClose,
  model,
  onDeploy: _onDeploy,
}) => {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeInfo[]>([]);
  const [labelSelector, setLabelSelector] = useState<string>('');
  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [_editorValue, setEditorValue] = useState('');
  const [requiredNodes, setRequiredNodes] = useState<number | ''>('');

  const itemRef = useRef({});

  const handleNodesChange = async (nodeNames: string[]) => {
    setSelectedNodes(nodeNames);

    if (nodeNames.length > 0) {
      try {
        const allNodes = await fetchAvailableNodes();
        const selectedNodesData = allNodes.filter(node => nodeNames.includes(node.name));
        setSelectedNodeData(selectedNodesData);
      } catch (error) {
        console.error('Error fetching node data:', error);
        setSelectedNodeData([]);
      }
    } else {
      setSelectedNodeData([]);
    }
  };

  const generateWorkspaceYAML = (
    model: PresetModel,
    preferredNodes: string[],
    nodeData: NodeInfo[]
  ): string => {
    const modelNameCheck = model.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const isLlama = model.name.toLowerCase().includes('llama');

    let instanceType = 'Standard_NC80adis_H100_v5'; // fallback
    let labelSelectorValue = `apps: ${modelNameCheck}`;

    if (preferredNodes.length > 0 && nodeData.length > 0) {
      const firstNodeInstanceType = nodeData[0].labels['node.kubernetes.io/instance-type'];
      if (firstNodeInstanceType) {
        instanceType = firstNodeInstanceType;
        labelSelectorValue = `node.kubernetes.io/instance-type: ${instanceType}`;
      }
    }

    let yamlString = `apiVersion: kaito.sh/v1beta1
kind: Workspace
metadata:
  name: workspace-${modelNameCheck}
resource:`;

    if (preferredNodes.length > 0) {
      const nodeCount = preferredNodes.length;
      yamlString += `
  count: ${nodeCount}`;
    } else if (typeof requiredNodes === 'number' && requiredNodes > 1) {
      yamlString += `
  count: ${requiredNodes}`;
    }

    if (preferredNodes.length > 0) {
      yamlString += `
  preferredNodes:`;
      preferredNodes.forEach(node => {
        yamlString += `
    - ${node}`;
      });
    }

    yamlString += `
  instanceType: ${instanceType}
  labelSelector:
    matchLabels:
      ${labelSelectorValue}`;

    yamlString += `
inference:
  preset:
    name: ${model.name.toLowerCase()}`;

    if (isLlama) {
      yamlString += `
    presetOptions:
      modelAccessSecret: hf-token`;
    }

    return yamlString;
  };

  const handleDeploy = () => {
    if (model) {
      const yamlString = generateWorkspaceYAML(model, selectedNodes, selectedNodeData);

      console.log('Generated YAML:', yamlString);

      try {
        const parsedYaml = yaml.load(yamlString);
        console.log('Parsed YAML object:', parsedYaml);

        itemRef.current = parsedYaml;
        setEditorValue(yamlString);
        setEditorDialogOpen(true);
      } catch (error) {
        console.error('Error parsing YAML:', error);
      }
    }
  };

  const handleReset = () => {
    setSelectedNodes([]);
    setSelectedNodeData([]);
    setLabelSelector('');
    setRequiredNodes('');
  };

  const handleRequiredNodesChange = (
    requiredNodesValue: number | '',
    _isExactMatch: boolean,
    _willAutoProvision: boolean
  ) => {
    setRequiredNodes(requiredNodesValue);
  };

  if (!model) return null;

  const yamlPreview = generateWorkspaceYAML(model, selectedNodes, selectedNodeData);

  return (
    <>
      <Dialog
        open={open && !editorDialogOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '60vh', maxHeight: '90vh' },
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Icon icon="mdi:rocket-launch" width={24} height={24} />
            <Box>
              <Typography variant="h6">Deploy Model: {model.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {model.company.name} • {model.version} • {model.instanceType}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            <Alert severity="info">
              Optionally select specific nodes for deployment, or leave the selection empty to use
              KAITO's automatic GPU provisioning.
            </Alert>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Icon icon="mdi:server" width={20} height={20} />
                Node Selection
              </Typography>

              <NodeSelector
                selectedNodes={selectedNodes}
                onNodesChange={handleNodesChange}
                labelSelector={labelSelector}
                onLabelSelectorChange={setLabelSelector}
                onRequiredNodesChange={handleRequiredNodesChange}
                helperText="Select specific nodes for model deployment. If no nodes are selected, Kaito will automatically provision GPU resources."
              />
            </Paper>

            {selectedNodes.length > 0 && (
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>{selectedNodes.length} node(s) selected</strong> for deployment. The model
                  will be scheduled on these specific nodes.
                </Typography>
              </Alert>
            )}

            {selectedNodes.length === 0 && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Automatic GPU Provisioning:</strong> No specific nodes selected. Kaito
                  will automatically provision the required GPU resources for this model.
                </Typography>
              </Alert>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Deployment Preview:
              </Typography>
              <Paper
                variant="outlined"
                sx={theme => ({
                  p: 2,
                  backgroundColor: theme.palette.background.default,
                  fontFamily: theme.typography.fontFamilyMonospace || 'monospace',
                  fontSize: theme.typography.body2.fontSize,
                  maxHeight: 200,
                  overflow: 'auto',
                })}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{yamlPreview}</pre>
              </Paper>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleReset} color="inherit">
            Reset
          </Button>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            variant="contained"
            startIcon={<Icon icon="mdi:rocket-launch" />}
          >
            Review & Deploy
          </Button>
        </DialogActions>
      </Dialog>

      {editorDialogOpen && itemRef.current && (
        <EditorDialog
          item={itemRef.current}
          open={editorDialogOpen}
          onClose={() => {
            setEditorDialogOpen(false);
            onClose();
          }}
          onEditorChanged={newVal => {
            setEditorValue(newVal);
          }}
          onSave="default"
          title={`Deploy Model: ${model.name}`}
          saveLabel="Apply"
        />
      )}
    </>
  );
};

export default WorkspaceDeploymentDialog;
