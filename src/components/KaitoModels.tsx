import { Icon } from '@iconify/react';
import {
  Link as RouterLink,
  Loader,
  SectionHeader,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { EditorDialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Divider,
  Link,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Autocomplete, Pagination } from '@mui/material';
import { useEffect, useState } from 'react';
import deepseekLogo from '../logos/deepseek-logo.webp';
import falconLogo from '../logos/falcon-logo.webp';
import llamaLogo from '../logos/llama-logo.webp';
import mistralLogo from '../logos/mistral-logo.webp';
import phiLogo from '../logos/phi-logo.webp';
import qwenLogo from '../logos/qwen-logo.webp';
import huggingfaceLogo from '../logos/hugging-face-logo.webp';
import WorkspaceDeploymentDialog from './WorkspaceDeploymentDialog';
import yaml from 'js-yaml';
import { modelSupportsTools } from '../utils/modelUtils';

// took inspiration from app catalog from plugin https://github.com/headlamp-k8s/plugins/tree/main/app-catalog
export const PAGE_OFFSET_COUNT_FOR_MODELS = 9;
export const INSTANCE_TYPE_STANDARD_NC24ADS_A100_V4 = 'Standard_NC24ads_A100_v4';
export const INSTANCE_TYPE_STANDARD_NC96ADS_A100_V4 = 'Standard_NC96ads_A100_v4';

interface SupportedModel {
  name: string;
  type: string;
  version: string;
  runtime: string;
  tag: string;
  downloadAtRuntime?: boolean;
}

interface SupportedModelsYaml {
  models: SupportedModel[];
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

async function fetchSupportedModels(): Promise<SupportedModel[]> {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/kaito-project/kaito/main/presets/workspace/models/supported_models.yaml'
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const yamlText = await response.text();
    const parsedYaml = yaml.load(yamlText) as SupportedModelsYaml;
    return parsedYaml.models || [];
  } catch (error) {
    console.error('Failed to fetch supported models:', error);
    return [];
  }
}

const getLogo = (name: string): string => {
  const lname = name.toLowerCase();
  if (lname.includes('deepseek')) return deepseekLogo;
  if (lname.includes('falcon')) return falconLogo;
  if (lname.includes('llama')) return llamaLogo;
  if (lname.includes('mistral')) return mistralLogo;
  if (lname.includes('phi')) return phiLogo;
  if (lname.includes('qwen')) return qwenLogo;
  return huggingfaceLogo;
};

function formatModelName(name: string): string {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function getHuggingFaceUrl(name: string): string {
  const companyName = getCompanyName(name);
  const formattedName = name
    .split('-')
    .map(part => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('-');

  let huggingFacePath = '';
  huggingFacePath = `${companyName}/${formattedName}`;

  return `https://huggingface.co/${huggingFacePath}`;
}

function getModelDescription(name: string): string {
  const descriptions: { [key: string]: string } = {
    'deepseek-r1-distill-llama-8b':
      'Distilled Llama 8B model by DeepSeek for efficient inference and strong performance.',
    'deepseek-r1-distill-qwen-14b':
      'Distilled Qwen 14B model by DeepSeek, optimized for speed and accuracy.',
    'falcon-7b':
      '7B parameter language model by TII, trained on RefinedWeb for high-quality text generation.',
    'falcon-7b-instruct':
      'Instruction-tuned Falcon-7B model for conversational and task-oriented outputs.',
    'falcon-40b':
      '40B parameter model by TII, designed for advanced language understanding and generation.',
    'falcon-40b-instruct':
      'Instruction-tuned Falcon-40B model for chat and instruction-based tasks.',
    'llama-3.1-8b-instruct':
      'Meta Llama 3.1 8B, instruction-tuned for multilingual and general-purpose tasks.',
    'llama-3.3-70b-instruct':
      'Meta Llama 3.3 70B, optimized for multilingual dialogue and instruction following.',
    'mistral-7b':
      'Mistral-7B is a fast, open-weight language model with strong performance on benchmarks.',
    'mistral-7b-instruct': 'Instruction-tuned Mistral-7B for chat and task-oriented applications.',
    'phi-2':
      'Phi-2 is a 2.7B parameter model by Microsoft, trained on synthetic and filtered web data.',
    'phi-3-mini-4k-instruct':
      'Phi-3 Mini 4K is a 3.8B parameter model with 4K context, optimized for efficiency.',
    'phi-3-mini-128k-instruct':
      'Phi-3 Mini 128K supports 128K context length for long document understanding.',
    'phi-3-medium-4k-instruct':
      'Phi-3 Medium 4K is a 14B parameter model for advanced language tasks.',
    'phi-3-medium-128k-instruct':
      'Phi-3 Medium 128K supports 128K context for extended input handling.',
    'phi-3.5-mini-instruct':
      'Phi-3.5 Mini is a lightweight, 128K context model for efficient language tasks.',
    'phi-4': 'Phi-4 is a state-of-the-art open model trained on diverse, high-quality datasets.',
    'phi-4-mini-instruct':
      'Phi-4 Mini Instruct is a compact model with 128K context for instruction tasks.',
    'qwen2.5-coder-7b-instruct':
      'Qwen2.5-Coder 7B is a code-specialized model for programming tasks.',
    'qwen2.5-coder-32b-instruct':
      'Qwen2.5-Coder 32B is a large code model for advanced programming assistance.',
  };

  return descriptions[name.toLowerCase()] || 'No description available for this model.';
}

function getInstanceType(name: string): string {
  const lname = name.toLowerCase();
  if (lname.includes('40b') || lname.includes('70b') || lname.includes('32b')) {
    return INSTANCE_TYPE_STANDARD_NC96ADS_A100_V4;
  }
  return INSTANCE_TYPE_STANDARD_NC24ADS_A100_V4;
}

function convertToPresetModels(supportedModels: SupportedModel[]): PresetModel[] {
  return supportedModels
    .filter(model => model.name !== 'base')
    .map((model, _i) => ({
      name: formatModelName(model.name),
      version: model.tag || '',
      company: {
        name: getCompanyName(model.name),
        url: getHuggingFaceUrl(model.name),
      },
      supportsTools: modelSupportsTools(model.name),
      logoImageId: getLogo(model.name),
      description: getModelDescription(model.name),
      instanceType: getInstanceType(model.name),
    }));
}

const getCompanyName = (name: string): string => {
  const lname = name.toLowerCase();
  const companyMap: { [key: string]: string } = {
    deepseek: 'deepseek-ai',
    falcon: 'tiiuae',
    llama: 'meta-llama',
    mistral: 'mistralai',
    phi: 'microsoft',
    qwen: 'Qwen',
  };
  for (const key in companyMap) {
    if (lname.includes(key)) {
      return companyMap[key];
    }
  }
  return 'Hugging Face';
};

const categories = [
  { title: 'All', value: 0 },
  { title: 'Meta', value: 1 },
  { title: 'Microsoft', value: 2 },
  { title: 'Mistral AI', value: 3 },
  { title: 'DeepSeek', value: 4 },
  { title: 'TII', value: 5 },
  { title: 'Qwen', value: 6 },
];

const KaitoModels = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [page, setPage] = useState(1);
  const [presetModels, setPresetModels] = useState<PresetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        setError(null);
        const supportedModels = await fetchSupportedModels();
        const presetModels = convertToPresetModels(supportedModels);
        setPresetModels(presetModels);
      } catch (err) {
        setError('Failed to load models. Please try again later.');
        console.error('Error loading models:', err);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);
  function handleDeploy(model: PresetModel) {
    setActiveModel(model);
    setEditorDialogOpen(true);
  }

  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<PresetModel | null>(null);

  const filteredModels = presetModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(search.toLowerCase());
    let matchesCategory = true;
    if (category.value !== 0) {
      switch (category.value) {
        case 1:
          matchesCategory = model.company.name.toLowerCase().includes('meta');
          break;
        case 2:
          matchesCategory = model.company.name.toLowerCase().includes('microsoft');
          break;
        case 3:
          matchesCategory = model.company.name.toLowerCase().includes('mistral');
          break;
        case 4:
          matchesCategory = model.company.name.toLowerCase().includes('deepseek');
          break;
        case 5:
          matchesCategory = model.company.name.toLowerCase().includes('tii');
          break;
        case 6:
          matchesCategory = model.company.name.toLowerCase().includes('qwen');
          break;
      }
    }

    return matchesSearch && matchesCategory;
  });

  const paginatedModels = filteredModels.slice(
    (page - 1) * PAGE_OFFSET_COUNT_FOR_MODELS,
    page * PAGE_OFFSET_COUNT_FOR_MODELS
  );

  return (
    <>
      <SectionHeader
        title="Models"
        actions={[
          <TextField
            label="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ width: '20vw', marginRight: 2 }}
          />,
          <Autocomplete
            options={categories}
            getOptionLabel={opt => opt.title}
            value={category}
            onChange={(e, val) => setCategory(val || categories[0])}
            sx={{ width: '20vw' }}
            renderInput={params => <TextField {...params} label="Category" />}
          />,
        ]}
      />
      {loading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Loader />
        </Box>
      )}
      {error && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      {!loading && !error && (
        <>
          <Box display="flex" flexWrap="wrap" justifyContent="left">
            {paginatedModels.map(model => (
              <Card
                key={model.name}
                sx={{
                  margin: '1rem',
                  width: { md: '40%', lg: '30%' },
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={2}
                  mx={2}
                >
                  <Box display="flex" alignItems="center">
                    {model.logoImageId && (
                      <CardMedia
                        component="img"
                        image={model.logoImageId}
                        alt={`${model.name} logo`}
                        sx={{ width: 60, height: 60, objectFit: 'contain', marginRight: 1 }}
                      />
                    )}
                  </Box>
                  <Box display="flex" alignItems="center">
                    {model.supportsTools && (
                      <Tooltip title="Supports Tool Calling">
                        <Icon
                          icon="material-symbols:build"
                          style={{ fontSize: 20, marginLeft: '0.5em' }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                <CardContent>
                  <Tooltip title={model.name}>
                    <Typography component="h2" variant="h5" noWrap>
                      <RouterLink
                        routeName="/kaito/models/:modelName"
                        params={{ modelName: model.name }}
                      >
                        {model.name}
                      </RouterLink>
                    </Typography>
                  </Tooltip>
                  <Box display="flex" justifyContent="space-between" my={1}>
                    <Typography>{model.version}</Typography>
                    <Tooltip title={model.company.name}>
                      <Typography noWrap>{model.company.name}</Typography>
                    </Tooltip>
                  </Box>
                  <Divider />
                  <Typography mt={1}>
                    {model.description.slice(0, 100)}
                    {model.description.length > 100 && (
                      <Tooltip title={model.description}>
                        <span>…</span>
                      </Tooltip>
                    )}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    sx={{ backgroundColor: '#000', color: 'white', textTransform: 'none' }}
                    onClick={() => handleDeploy(model)}
                  >
                    Deploy
                  </Button>
                  <Link href={model.company.url} target="_blank">
                    Learn More
                  </Link>
                </CardActions>
              </Card>
            ))}
          </Box>

          {filteredModels.length > PAGE_OFFSET_COUNT_FOR_MODELS && (
            <Box mt={3} mx="auto" maxWidth="max-content">
              <Pagination
                size="large"
                shape="rounded"
                page={page}
                count={Math.ceil(filteredModels.length / PAGE_OFFSET_COUNT_FOR_MODELS)}
                onChange={(e, val) => setPage(val)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
      <Box textAlign="right" mt={2} mr={2}></Box>
      <WorkspaceDeploymentDialog
        open={editorDialogOpen}
        onClose={() => setEditorDialogOpen(false)}
        model={activeModel}
        onDeploy={(yamlContent) => {
          // Here you could add logic to actually deploy the workspace
          // For now, we'll use the default EditorDialog save behavior
          console.log('Deploying workspace with YAML:', yamlContent);
          setEditorDialogOpen(false);
        }}
      />
    </>
  );
};

export default KaitoModels;
