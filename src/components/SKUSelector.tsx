import { Icon } from '@iconify/react';
import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

interface SKUSelectorProps {
  selectedSKU: string;
  onSKUChange: (_sku: string) => void;
  onGPUCountChange?: (_gpuCount: number) => void;
  disabled?: boolean;
  isAutoProvisioningMode?: boolean;
}

const POPULAR_GPU_SKUS = [
  {
    label: 'A10 (24GB VRAM)',
    value: 'Standard_NV36ads_A10_v5',
    gpuModel: 'NVIDIA A10',
    gpuMemory: '24GB',
    gpuCount: 1,
    description: 'Cost-effective for inference workloads',
  },
  {
    label: 'A10 Dual (48GB VRAM)',
    value: 'Standard_NV72ads_A10_v5',
    gpuModel: 'NVIDIA A10',
    gpuMemory: '48GB',
    gpuCount: 2,
    description: 'Dual A10 for larger models',
  },
  {
    label: 'A100 (80GB VRAM)',
    value: 'Standard_NC24ads_A100_v4',
    gpuModel: 'NVIDIA A100',
    gpuMemory: '80GB',
    gpuCount: 1,
    description: 'High performance training and inference',
  },
  {
    label: 'A100 Dual (160GB VRAM)',
    value: 'Standard_NC48ads_A100_v4',
    gpuModel: 'NVIDIA A100',
    gpuMemory: '160GB',
    gpuCount: 2,
    description: 'Dual A100 for very large models',
  },
  {
    label: 'A100 Quad (320GB VRAM)',
    value: 'Standard_NC96ads_A100_v4',
    gpuModel: 'NVIDIA A100',
    gpuMemory: '320GB',
    gpuCount: 4,
    description: 'Quad A100 for distributed training',
  },
  {
    label: 'H100 (94GB VRAM)',
    value: 'Standard_NC40ads_H100_v5',
    gpuModel: 'NVIDIA H100',
    gpuMemory: '94GB',
    gpuCount: 1,
    description: 'Latest generation, best performance',
  },
  {
    label: 'H100 Dual (188GB VRAM)',
    value: 'Standard_NC80adis_H100_v5',
    gpuModel: 'NVIDIA H100',
    gpuMemory: '188GB',
    gpuCount: 2,
    description: 'Dual H100 for cutting-edge workloads',
  },
];

const SKUSelector: React.FC<SKUSelectorProps> = ({
  selectedSKU,
  onSKUChange,
  onGPUCountChange,
  disabled = false,
  isAutoProvisioningMode = true,
}) => {
  const handleSKUChange = (sku: string) => {
    onSKUChange(sku);
    
    if (onGPUCountChange) {
      const selectedOption = POPULAR_GPU_SKUS.find(option => option.value === sku);
      onGPUCountChange(selectedOption?.gpuCount || 0);
    }
  };

  if (!isAutoProvisioningMode) {
    return null;
  }

  return (
    <Box>
      <FormControl fullWidth disabled={disabled}>
        <Autocomplete
          options={POPULAR_GPU_SKUS}
          value={POPULAR_GPU_SKUS.find(sku => sku.value === selectedSKU) || null}
          onChange={(_, newValue) => {
            handleSKUChange(newValue?.value || '');
          }}
          getOptionLabel={option => option.label}
          renderInput={params => (
            <TextField
              {...params}
              label="Preferred GPU SKU (Auto-Provisioning)"
              placeholder="Select a GPU SKU for automatic provisioning (optional)"
              size="small"
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
                    <Chip
                      label={option.gpuMemory}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {option.value}
                  </Typography>
                </Stack>
              </Box>
            </li>
          )}
          clearIcon={selectedSKU ? undefined : null}
          isClearable={!!selectedSKU}
        />
        <FormHelperText>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Icon icon="mdi:information-outline" width={14} height={14} />
            <span>
              When no specific nodes are selected, Kaito will automatically provision nodes with the selected SKU.
              {selectedSKU && (
                <>
                  {' '} Currently targeting: <strong>{POPULAR_GPU_SKUS.find(sku => sku.value === selectedSKU)?.label}</strong>
                </>
              )}
            </span>
          </Stack>
        </FormHelperText>
      </FormControl>

      {selectedSKU && (
        <Box mt={2}>
          <Typography variant="caption" color="primary.main" display="block">
            <Icon icon="mdi:rocket-launch" width={12} height={12} style={{ marginRight: 4 }} />
            Auto-provisioning with {POPULAR_GPU_SKUS.find(sku => sku.value === selectedSKU)?.label}
          </Typography>
          {POPULAR_GPU_SKUS.find(sku => sku.value === selectedSKU)?.gpuCount && 
           POPULAR_GPU_SKUS.find(sku => sku.value === selectedSKU)!.gpuCount > 1 && (
            <Typography variant="caption" color="info.main" display="block" mt={0.5}>
              <Icon icon="mdi:content-copy" width={12} height={12} style={{ marginRight: 4 }} />
              Will provision {POPULAR_GPU_SKUS.find(sku => sku.value === selectedSKU)?.gpuCount} nodes for multi-GPU setup
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SKUSelector;
