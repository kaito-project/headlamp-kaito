import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import React from 'react';

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  config: ModelConfig;
  // eslint-disable-next-line no-unused-vars
  onSave: (_modelConfig: ModelConfig) => void;
}

const ModelSettingsDialog: React.FC<Props> = ({ open, onClose, config, onSave }) => {
  const defaultConfig = { temperature: 0.7, maxTokens: 1000 };
  const [localConfig, setLocalConfig] = React.useState(config || defaultConfig);

  React.useEffect(() => {
    if (open && config) {
      setLocalConfig(config);
    }
  }, [config, open]);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalConfig(prev => ({ ...prev, temperature: value }));
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setLocalConfig(prev => ({ ...prev, maxTokens: value }));
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Model Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ width: 300, pt: 2 }}>
          <Box mb={3}>
            <Typography gutterBottom>Temperature: {localConfig.temperature.toFixed(2)}</Typography>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localConfig.temperature}
              onChange={handleTemperatureChange}
              style={{ width: '100%' }}
            />
          </Box>
          <Box mb={2}>
            <Typography gutterBottom>Max Tokens: {localConfig.maxTokens}</Typography>
            <input
              type="range"
              min="100"
              max="4000"
              step="50"
              value={localConfig.maxTokens}
              onChange={handleMaxTokensChange}
              style={{ width: '100%' }}
            />
          </Box>
        </Box>
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
