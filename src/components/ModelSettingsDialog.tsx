// ModelSettingsDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Typography,
  Stack,
} from '@mui/material';

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  config: ModelConfig;
  onSave: (config: ModelConfig) => void;
}

const ModelSettingsDialog: React.FC<Props> = ({ open, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = React.useState(config);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Model Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ width: 300 }}>
          <div>
            <Typography gutterBottom>Temperature ({localConfig.temperature.toFixed(2)})</Typography>
            <Slider
              value={localConfig.temperature}
              min={0}
              max={1}
              step={0.01}
              onChange={(_, value) =>
                setLocalConfig(cfg => ({ ...cfg, temperature: value as number }))
              }
            />
          </div>
          <div>
            <Typography gutterBottom>Max Tokens ({localConfig.maxTokens})</Typography>
            <Slider
              value={localConfig.maxTokens}
              min={100}
              max={4000}
              step={50}
              onChange={(_, value) =>
                setLocalConfig(cfg => ({ ...cfg, maxTokens: value as number }))
              }
            />
          </div>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelSettingsDialog;
