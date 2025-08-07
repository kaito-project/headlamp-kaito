export interface GPUConfig {
  label: string;
  value: string;
  gpuModel: string;
  gpuMemory: string;
  gpuCount: number;
  description?: string;
  nvmeEnabled?: boolean;
}

export type CloudProvider = 'azure' | 'aws';

interface RawGPUConfig {
  SKU: string;
  GPUCount: number;
  GPUMemGB: number;
  GPUModel: string;
  NVMeDiskEnabled?: boolean;
}

// cache for SKU data, avoid fetching frequently
const skuCache: Record<CloudProvider, GPUConfig[] | null> = {
  azure: null,
  aws: null,
};

// fetch from github
async function fetchGoFile(provider: CloudProvider): Promise<string> {
  const urls = {
    azure: 'https://raw.githubusercontent.com/kaito-project/kaito/main/pkg/sku/azure_sku_handler.go',
    aws: 'https://raw.githubusercontent.com/kaito-project/kaito/main/pkg/sku/aws_sku_handler.go'
  };

  const response = await fetch(urls[provider]);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${provider} SKU data: ${response.statusText}`);
  }
  
  return response.text();
}

// parse go struct definitions
function parseGPUConfigs(goContent: string, provider: CloudProvider): GPUConfig[] {
  const configs: GPUConfig[] = [];
  
  // Regex to match GPU config struct entries
  const configRegex = /\{SKU:\s*"([^"]+)",\s*GPUCount:\s*(\d+),\s*GPUMemGB:\s*(\d+),\s*GPUModel:\s*"([^"]+)"(?:,\s*NVMeDiskEnabled:\s*(true|false))?\}/g;
  
  let match;
  while ((match = configRegex.exec(goContent)) !== null) {
    const [, sku, gpuCount, gpuMemGB, gpuModel, nvmeEnabled] = match;
    
    const config: GPUConfig = {
      value: sku,
      label: generateLabel(sku, gpuModel, parseInt(gpuCount), parseInt(gpuMemGB), provider),
      gpuModel: gpuModel,
      gpuMemory: `${parseInt(gpuMemGB)}GB`,
      gpuCount: parseInt(gpuCount),
      nvmeEnabled: nvmeEnabled === 'true'
    };

    configs.push(config);
  }
  
  return configs.sort((a, b) => {
    if (a.gpuModel !== b.gpuModel) {
      return a.gpuModel.localeCompare(b.gpuModel);
    }
    return a.gpuCount - b.gpuCount;
  });
}

function generateLabel(sku: string, gpuModel: string, gpuCount: number, gpuMemGB: number, provider: CloudProvider): string {
  const shortModel = gpuModel
    .replace('NVIDIA ', '')
    .replace('AMD ', '')
    .replace(' accelerators', '');
  
  const totalMemory = gpuCount * gpuMemGB;
  const memoryDisplay = gpuCount > 1 ? `${gpuCount}x${totalMemory}GB` : `1x${gpuMemGB}GB`;
  
  if (provider === 'aws') {
    const instanceMatch = sku.match(/^([^.]+\.[^.]+)/);
    const instanceType = instanceMatch ? ` - ${instanceMatch[1]}` : '';
    return `${shortModel} (${memoryDisplay})${instanceType}`;
  } else {
    let label = `${shortModel} (${memoryDisplay})`;
    
    return label;
  }
}


// Fetch and cache GPU configs for specific cloud provider
export async function fetchGPUConfigs(provider: CloudProvider): Promise<GPUConfig[]> {
  if (skuCache[provider]) {
    return skuCache[provider]!;
  }

  try {
    const goContent = await fetchGoFile(provider);
    const configs = parseGPUConfigs(goContent, provider);
    
    // cache results
    skuCache[provider] = configs;
    
    return configs;
  } catch (error) {
    console.error(`Failed to fetch ${provider} GPU configurations:`, error);
    
    return getFallbackConfigs(provider);
  }
}

function getFallbackConfigs(provider: CloudProvider): GPUConfig[] {
  if (provider === 'azure') {
    return [
      {
        label: 'A10 (1x24GB)',
        value: 'Standard_NV36ads_A10_v5',
        gpuModel: 'NVIDIA A10',
        gpuMemory: '24GB',
        gpuCount: 1,
      },
      {
        label: 'A100 (1x80GB)',
        value: 'Standard_NC24ads_A100_v4',
        gpuModel: 'NVIDIA A100',
        gpuMemory: '80GB',
        gpuCount: 1,
        nvmeEnabled: true,
      },
      {
        label: 'H100 (1x94GB)',
        value: 'Standard_NC40ads_H100_v5',
        gpuModel: 'NVIDIA H100',
        gpuMemory: '94GB',
        gpuCount: 1,
        nvmeEnabled: true,
      },
    ];
  } else {
    return [
      {
        label: 'A10G (1x24GB) - g5.xlarge',
        value: 'g5.xlarge',
        gpuModel: 'NVIDIA A10G',
        gpuMemory: '24GB',
        gpuCount: 1,
        nvmeEnabled: true,
      },
      {
        label: 'A100 (8x320GB)',
        value: 'p4d.24xlarge',
        gpuModel: 'NVIDIA A100',
        gpuMemory: '320GB',
        gpuCount: 8,
        nvmeEnabled: true,
      },
      {
        label: 'H100 (8x640GB)',
        value: 'p5.48xlarge',
        gpuModel: 'NVIDIA H100',
        gpuMemory: '640GB',
        gpuCount: 8,
        nvmeEnabled: true,
      },
    ];
  }
}

// clear cache

export function clearSKUCache(provider?: CloudProvider): void {
  if (provider) {
    skuCache[provider] = null;
  } else {
    skuCache.azure = null;
    skuCache.aws = null;
  }
}
