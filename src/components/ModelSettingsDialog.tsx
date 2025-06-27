import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
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
  const defaultConfig = { temperature: 0.7, maxTokens: 1000 };
  console.log('ModelSettingsDialog initializing with config:', config || defaultConfig);
  const [localConfig, setLocalConfig] = React.useState(config || defaultConfig);

  // Log when component mounts
  React.useEffect(() => {
    console.log('ModelSettingsDialog mounted, initial state:', localConfig);
    // Cleanup function will log when component unmounts
    return () => {
      console.log('ModelSettingsDialog unmounting');
    };
  }, []);

  React.useEffect(() => {
    if (open && config) {
      console.log('Dialog opened, initializing with config:', config);
      setLocalConfig(config);
    }
  }, [config, open]);

  const handleSave = () => {
    console.log('Saving model settings:', localConfig);
    onSave(localConfig);
    onClose();
    console.log('Model settings saved:', localConfig);
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    console.log('Temperature slider changed:', value);
    setLocalConfig(prev => ({ ...prev, temperature: value }));
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    console.log('Max tokens slider changed:', value);
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
