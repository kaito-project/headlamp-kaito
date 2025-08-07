import { Icon } from '@iconify/react';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import React, { useEffect,useState } from 'react';
import { CloudProvider,fetchGPUConfigs, GPUConfig } from '../utils/skuUtils';

interface SKUSelectorProps {
  selectedSKU: string;
  onSKUChange: (_sku: string) => void;
  onGPUCountChange?: (_gpuCount: number) => void;
  disabled?: boolean;
  isAutoProvisioningMode?: boolean;
}

const SKUSelector: React.FC<SKUSelectorProps> = ({
  selectedSKU,
  onSKUChange,
  onGPUCountChange,
  disabled = false,
  isAutoProvisioningMode = true,
}) => {
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('azure');
  const [skuData, setSKUData] = useState<Record<CloudProvider, GPUConfig[]>>({
    azure: [],
    aws: []
  });
  const [loading, setLoading] = useState<Record<CloudProvider, boolean>>({
    azure: false,
    aws: false
  });
  const [error, setError] = useState<Record<CloudProvider, string | null>>({
    azure: null,
    aws: null
  });
  
  const currentSKUs = skuData[cloudProvider];
  
  // Fetch SKU data when component mounts or provider changes
  useEffect(() => {
    const loadSKUData = async (provider: CloudProvider) => {
      if (skuData[provider].length > 0) {
        return; // Already loaded
      }

      setLoading(prev => ({ ...prev, [provider]: true }));
      setError(prev => ({ ...prev, [provider]: null }));

      try {
        const configs = await fetchGPUConfigs(provider);
        setSKUData(prev => ({ ...prev, [provider]: configs }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load SKU data';
        setError(prev => ({ ...prev, [provider]: errorMessage }));
        console.error(`Failed to load ${provider} SKU data:`, err);
      } finally {
        setLoading(prev => ({ ...prev, [provider]: false }));
      }
    };

    loadSKUData(cloudProvider);
  }, [cloudProvider, skuData]);
  
  const handleSKUChange = (sku: string) => {
    onSKUChange(sku);
    
    if (onGPUCountChange) {
      const selectedOption = currentSKUs.find(option => option.value === sku);
      onGPUCountChange(selectedOption?.gpuCount || 0);
    }
  };

  const handleCloudProviderChange = (
    _: React.MouseEvent<HTMLElement>,
    newProvider: CloudProvider | null,
  ) => {
    if (newProvider !== null) {
      setCloudProvider(newProvider);
      // clear current selection when switching cloud provider
      onSKUChange('');
      if (onGPUCountChange) {
        onGPUCountChange(0);
      }
    }
  };

  if (!isAutoProvisioningMode) {
    return null;
  }

  const isCurrentLoading = loading[cloudProvider];
  const currentError = error[cloudProvider];

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Icon icon="mdi:cloud" width={18} height={18} />
              <span>Cloud Provider</span>
            </Stack>
          </Typography>
          <ToggleButtonGroup
            value={cloudProvider}
            exclusive
            onChange={handleCloudProviderChange}
            size="small"
            fullWidth
            disabled={disabled}
          >
            <ToggleButton value="azure">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Icon icon="mdi:microsoft-azure" width={16} height={16} />
                <span>Azure</span>
                {loading.azure && <CircularProgress size={12} />}
              </Stack>
            </ToggleButton>
            <ToggleButton value="aws">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Icon icon="mdi:aws" width={16} height={16} />
                <span>AWS</span>
                {loading.aws && <CircularProgress size={12} />}
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <FormControl fullWidth disabled={disabled || isCurrentLoading}>
          {currentError ? (
            <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Icon icon="mdi:alert-circle" width={16} height={16} color="error" />
                <Typography variant="body2" color="error.main">
                  Failed to load {cloudProvider.toUpperCase()} SKUs: {currentError}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Using fallback configurations. Check your internet connection and try refreshing.
              </Typography>
            </Box>
          ) : (
            <Autocomplete
              loading={isCurrentLoading}
              options={currentSKUs}
              value={currentSKUs.find(sku => sku.value === selectedSKU) || null}
              onChange={(_, newValue) => {
                handleSKUChange(newValue?.value || '');
              }}
              getOptionLabel={option => option.label}
              renderInput={params => (
                <TextField
                  {...params}
                  label={`Preferred GPU SKU (${cloudProvider.toUpperCase()} Auto-Provisioning)`}
                  placeholder={
                    isCurrentLoading 
                      ? `Loading ${cloudProvider.toUpperCase()} SKUs...` 
                      : `Select a ${cloudProvider.toUpperCase()} GPU SKU for automatic provisioning`
                  }
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isCurrentLoading && <CircularProgress color="inherit" size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="column" spacing={0.5}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="medium">
                          {option.gpuModel} {option.gpuCount > 1 ? `x${option.gpuCount}` : ''}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          {option.nvmeEnabled && (
                            <Chip
                              label="NVMe"
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: '20px' }}
                            />
                          )}
                          <Chip
                            label={option.gpuMemory}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        </Stack>
                      </Stack>
                      {option.description && (
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {option.value}
                      </Typography>
                    </Stack>
                  </Box>
                </li>
              )}
              clearIcon={selectedSKU ? undefined : null}
              isClearable={!!selectedSKU}
              noOptionsText={
                isCurrentLoading 
                  ? `Loading ${cloudProvider.toUpperCase()} SKUs...` 
                  : `No ${cloudProvider.toUpperCase()} SKUs available`
              }
            />
          )}
          <FormHelperText>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Icon icon="mdi:information-outline" width={14} height={14} />
              <span>
                When no specific nodes are selected, Kaito will automatically provision nodes with the selected SKU.
                {selectedSKU && !isCurrentLoading && (
                  <>
                    {' '} Currently targeting: <strong>{currentSKUs.find(sku => sku.value === selectedSKU)?.label}</strong> on {cloudProvider.toUpperCase()}
                  </>
                )}
              </span>
            </Stack>
          </FormHelperText>
        </FormControl>

        {selectedSKU && !isCurrentLoading && (
          <Box>
            <Typography variant="caption" color="primary.main" display="block">
              <Icon icon="mdi:rocket-launch" width={12} height={12} style={{ marginRight: 4 }} />
              Auto-provisioning with {currentSKUs.find(sku => sku.value === selectedSKU)?.label} on {cloudProvider.toUpperCase()}
            </Typography>
          </Box>
        )}

        {isCurrentLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Loading {cloudProvider.toUpperCase()} GPU SKUs from GitHub...
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default SKUSelector;
