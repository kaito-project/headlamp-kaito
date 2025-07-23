import { Icon } from '@iconify/react';
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
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect,useState } from 'react';
import NodeSelector from './NodeSelector';

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
  onDeploy?: (yamlContent: string) => void;
}

const WorkspaceDeploymentDialog: React.FC<WorkspaceDeploymentDialogProps> = ({
  open,
  onClose,
  model,
  onDeploy,
}) => {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [labelSelector, setLabelSelector] = useState<string>('');
  const [yamlEditorOpen, setYamlEditorOpen] = useState(false);
  const [yamlContent, setYamlContent] = useState('');

  const generateWorkspaceYAML = (model: PresetModel, preferredNodes: string[]): string => {
    const modelNameCheck = model.name.toLowerCase();
    const isLlama = modelNameCheck.includes('llama');
    
    let yamlString = `apiVersion: kaito.sh/v1beta1
kind: Workspace
metadata:
  name: workspace-${modelNameCheck}
resource:
  instanceType: ${model.instanceType}
  labelSelector: 
    matchLabels:
      apps: ${modelNameCheck}`;

    if (preferredNodes.length > 0) {
      yamlString += `
  preferredNodes:`;
      preferredNodes.forEach(node => {
        yamlString += `
    - ${node}`;
      });
    }

    yamlString += `
inference:
  preset:
    name: ${modelNameCheck}`;

    if (isLlama) {
      yamlString += `
    presetOptions:
      modelAccessSecret: hf-token`;
    }

    return yamlString;
  };

  useEffect(() => {
    if (model) {
      const yamlString = generateWorkspaceYAML(model, selectedNodes);
      setYamlContent(yamlString);
    }
  }, [model, selectedNodes]);

  const handleReviewAndDeploy = () => {
    console.log('Review & Deploy button clicked');
    console.log('Current state:', { selectedNodes, model: model?.name });
    
    if (model) {
      const yamlData = generateWorkspaceYAML(model, selectedNodes);
      setYamlContent(yamlData);
      setYamlEditorOpen(true);
    }
  };

  const handleDeployFromYaml = async () => {
    try {
      console.log('Deploying from YAML editor');
      
      if (onDeploy) {
        await onDeploy(yamlContent);
      }
      
      setYamlEditorOpen(false);
      onClose();
    } catch (error) {
      console.error('Error deploying YAML:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleReset = () => {
    setSelectedNodes([]);
    setLabelSelector('');
    if (model) {
      const yamlString = generateWorkspaceYAML(model, []);
      setYamlContent(yamlString);
    }
  };

  if (!model) return null;

  console.log('WorkspaceDeploymentDialog render:', { 
    open, 
    yamlEditorOpen, 
    model: model?.name,
    yamlContentLength: yamlContent.length,
    selectedNodes
  });

  return (
    <>
      {/* Main Configuration Dialog */}
      <Dialog
        open={open && !yamlEditorOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '60vh', maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Icon icon="mdi:rocket-launch" width={24} height={24} />
            <Box>
              <Typography variant="h6">
                Deploy Model: {model.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {model.company.name} • {model.version} • {model.instanceType}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            <Alert severity="info">
              Configure deployment options for your Kaito workspace. You can optionally select specific nodes
              for deployment, or leave the selection empty to use Kaito's automatic GPU provisioning.
            </Alert>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="mdi:server" width={20} height={20} />
                Node Selection
              </Typography>
              
              <NodeSelector
                selectedNodes={selectedNodes}
                onNodesChange={setSelectedNodes}
                labelSelector={labelSelector}
                onLabelSelectorChange={setLabelSelector}
                helperText="Select specific nodes for model deployment. If no nodes are selected, Kaito will automatically provision GPU resources."
              />
            </Paper>

            {selectedNodes.length > 0 && (
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>{selectedNodes.length} node(s) selected</strong> for deployment.
                  The model will be scheduled on these specific nodes.
                </Typography>
              </Alert>
            )}

            {selectedNodes.length === 0 && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Automatic GPU Provisioning:</strong> No specific nodes selected. 
                  Kaito will automatically provision the required GPU resources for this model.
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
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {yamlContent}
                </pre>
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
            onClick={handleReviewAndDeploy} 
            variant="contained"
            startIcon={<Icon icon="mdi:rocket-launch" />}
          >
            Review & Deploy
          </Button>
        </DialogActions>
      </Dialog>

      {/* YAML Editor Dialog */}
      <Dialog
        open={yamlEditorOpen}
        onClose={() => setYamlEditorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Review and Edit Workspace Configuration</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={20}
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            variant="outlined"
            sx={{
              fontFamily: 'monospace',
              fontSize: '12px',
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '12px',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYamlEditorOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeployFromYaml} 
            variant="contained" 
            color="primary"
          >
            Deploy
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkspaceDeploymentDialog;
