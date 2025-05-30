import {
  Link as RouterLink,
  Loader,
  SectionHeader,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Icon } from '@iconify/react';
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
import { useEffect, useRef, useState } from 'react';
// Importing logos
import falconLogo from '../logos/falcon-logo.webp';
import deepseekLogo from '../logos/deepseek-logo.webp';
import llamaLogo from '../logos/llama-logo.webp';
import mistralLogo from '../logos/mistral-logo.webp';
import phiLogo from '../logos/phi-logo.webp';
import qwenLogo from '../logos/qwen-logo.webp';
import huggingfaceLogo from '../logos/hugging-face-logo.webp';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Editor from '@monaco-editor/react';
import { useSnackbar } from 'notistack';

// took inspiration from app catalog from plugin https://github.com/headlamp-k8s/plugins/tree/main/app-catalog
export const PAGE_OFFSET_COUNT_FOR_MODELS = 9;
interface PresetModel {
  name: string;
  version: string;
  company: {
    name: string;
    url: string;
  };
  verifiedPublisher: boolean;
  official: boolean;
  cncf: boolean;
  logoImageId: string;
  description: string;
}

const modelInfo = [
  {
    name: 'DeepSeek-R1-Distill-Llama-8B',
    url: 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
    description: 'A distilled version of Llama 8B by DeepSeek.',
  },
  {
    name: 'DeepSeek-R1-Distill-Qwen-14B',
    url: 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
    description: 'A distilled version of Qwen 14B by DeepSeek.',
  },
  {
    name: 'Falcon-7B',
    url: 'https://huggingface.co/tiiuae/falcon-7b',
    description:
      'Falcon-7B is a 7B parameters causal decoder-only model built by TII and trained on 1,500B tokens of RefinedWeb enhanced with curated corpora.',
  },
  {
    name: 'Falcon-40B',
    url: 'https://huggingface.co/tiiuae/falcon-40b',
    description:
      'Falcon-40B is a 40B parameters causal decoder-only model built by TII and trained on 1,000B tokens of RefinedWeb enhanced with curated corpora.',
  },
  {
    name: 'Falcon-7B-Instruct',
    url: 'https://huggingface.co/tiiuae/falcon-7b-instruct',
    description:
      'Falcon-7B-Instruct is a 7B parameters causal decoder-only model built by TII based on Falcon-7B and finetuned on a mixture of chat/instruct datasets.',
  },
  {
    name: 'Falcon-40B-Instruct',
    url: 'https://huggingface.co/tiiuae/falcon-40b-instruct',
    description:
      'Falcon-40B-Instruct is a 40B parameters causal decoder-only model built by TII based on Falcon-40B and finetuned on a mixture of Baize.',
  },
  {
    name: 'Llama-3.1-8B-Instruct',
    url: 'https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct',
    description:
      'The Meta Llama 3.1 collection of multilingual large language models (LLMs) is a collection of pretrained and instruction tuned generative models in 8B, 70B and 405B sizes (text in/text out). The Llama 3.1 instruction tuned text only models (8B, 70B, 405B) are optimized for multilingual dialogue use cases and outperform many of the available open source and closed chat models on common industry benchmarks.',
  },
  {
    name: 'Mistral-7B',
    url: 'https://huggingface.co/mistralai/Mistral-7B-v0.3',
    description:
      'The Mistral-7B-v0.3 Large Language Model (LLM) is a Mistral-7B-v0.2 with extended vocabulary.',
  },
  {
    name: 'Mistral-7B-Instruct',
    url: 'https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3',
    description:
      'The Mistral-7B-Instruct-v0.3 Large Language Model (LLM) is an instruct fine-tuned version of the Mistral-7B-v0.3.',
  },
  {
    name: 'Phi-2',
    url: 'https://huggingface.co/microsoft/Phi-2',
    description:
      'Phi-2 is a Transformer with 2.7 billion parameters. It was trained using the same data sources as Phi-1.5, augmented with a new data source that consists of various NLP synthetic texts and filtered websites (for safety and educational value).',
  },
  {
    name: 'Phi-3-Mini-4k-Instruct',
    url: 'https://huggingface.co/microsoft/Phi-3-Mini-4k-Instruct',
    description:
      'The Phi-3-Mini-4K-Instruct is a 3.8B parameters, lightweight, state-of-the-art open model trained with the Phi-3 datasets that includes both synthetic data and the filtered publicly available websites data with a focus on high-quality and reasoning dense properties. The model belongs to the Phi-3 family with the Mini version in two variants 4K and 128K which is the context length (in tokens) that it can support.',
  },
  {
    name: 'Phi-3-Mini-128k-Instruct',
    url: 'https://huggingface.co/microsoft/Phi-3-Mini-128k-Instruct',
    description:
      'The Phi-3-Mini-128K-Instruct is a 3.8 billion-parameter, lightweight, state-of-the-art open model trained using the Phi-3 datasets. This dataset includes both synthetic data and filtered publicly available website data, with an emphasis on high-quality and reasoning-dense properties. The model belongs to the Phi-3 family with the Mini version in two variants 4K and 128K which is the context length (in tokens) that it can support.',
  },
  {
    name: 'Phi-3-Medium-4k-Instruct',
    url: 'https://huggingface.co/microsoft/Phi-3-Medium-4k-Instruct',
    description:
      'The Phi-3-Medium-4K-Instruct is a 14B parameters, lightweight, state-of-the-art open model trained with the Phi-3 datasets that includes both synthetic data and the filtered publicly available websites data with a focus on high-quality and reasoning dense properties. The model belongs to the Phi-3 family with the Medium version in two variants 4K and 128K which is the context length (in tokens) that it can support.',
  },
  {
    name: 'Phi-3-Medium-128k-Instruct',
    url: 'https://huggingface.co/microsoft/Phi-3-Medium-128k-Instruct',
    description:
      'The Phi-3-Medium-128K-Instruct is a 14B parameters, lightweight, state-of-the-art open model trained with the Phi-3 datasets that includes both synthetic data and the filtered publicly available websites data with a focus on high-quality and reasoning dense properties. The model belongs to the Phi-3 family with the Medium version in two variants 4k and 128K which is the context length (in tokens) that it can support.',
  },
  {
    name: 'Phi-3.5-Mini-Instruct',
    url: 'https://huggingface.co/microsoft/Phi-3.5-Mini-Instruct',
    description:
      'Phi-3.5-mini is a lightweight, state-of-the-art open model built upon datasets used for Phi-3 - synthetic data and filtered publicly available websites - with a focus on very high-quality, reasoning dense data. The model belongs to the Phi-3 model family and supports 128K token context length.',
  },
  {
    name: 'Phi-4',
    url: 'https://huggingface.co/microsoft/Phi-4',
    description:
      'phi-4 is a state-of-the-art open model built upon a blend of synthetic datasets, data from filtered public domain websites, and acquired academic books and Q&A datasets. The goal of this approach was to ensure that small capable models were trained with data focused on high quality and advanced reasoning.',
  },
  {
    name: 'Phi-4-Mini-Instruct',
    url: 'https://huggingface.co/microsoft/Phi-4-Mini-Instruct',
    description:
      'Phi-4-mini-instruct is a lightweight open model built upon synthetic data and filtered publicly available websites - with a focus on high-quality, reasoning dense data. The model belongs to the Phi-4 model family and supports 128K token context length.',
  },
  {
    name: 'Qwen-2.5-Coder-7B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct',
    description:
      'Qwen2.5-Coder is the latest series of Code-Specific Qwen large language models (formerly known as CodeQwen). Qwen2.5-Coder-7B has 7 billion parameters.',
  },
  {
    name: 'Qwen-2.5-Coder-32B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct',
    description:
      'Qwen2.5-Coder is the latest series of Code-Specific Qwen large language models (formerly known as CodeQwen). As of now, Qwen2.5-Coder-32B has 32 billion parameters.',
  },
];

const getLogo = (name: string): string => {
  const lname = name.toLowerCase();
  if (lname.includes('deepseek')) return deepseekLogo;
  if (lname.includes('falcon')) return falconLogo;
  if (lname.includes('llama')) return llamaLogo;
  if (lname.includes('mistral')) return mistralLogo;
  if (lname.includes('phi')) return phiLogo;
  if (lname.includes('qwen')) return qwenLogo;
  return huggingfaceLogo; // default logo for Hugging Face or others
};

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
  return 'Hugging Face'; // default for Hugging Face or others
};

const PresetModels: PresetModel[] = modelInfo.map((model, i) => ({
  name: model.name,
  version: model.name.includes('Mistral') ? 'v0.3' : '',
  company: {
    name: getCompanyName(model.name),
    url: model.url || 'https://huggingface.co/',
  },
  verifiedPublisher: true,
  official: i % 3 === 0,
  cncf: i % 4 === 0,
  logoImageId: getLogo(model.name),
  description: model.description || 'No description available for this model.',
}));

// Will replace this with common filter categories
const categories = [
  { title: 'All', value: 0 },
  { title: 'option2', value: 1 },
  { title: 'option3', value: 2 },
];

const KaitoModels = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [page, setPage] = useState(1);
  const [openEditor, setOpenEditor] = useState(false);
  const [activeModel, setActiveModel] = useState<PresetModel | null>(null);
  const [editorValue, setEditorValue] = useState<string>('');
  const { enqueueSnackbar } = useSnackbar();
  function handleInstall(model: PresetModel) {
    setEditorValue(generateWorkspaceYAML(model));
    setActiveModel(model);
    setOpenEditor(true);
  }

  // convert search to lower case
  const filteredModels = PresetModels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedModels = filteredModels.slice(
    (page - 1) * PAGE_OFFSET_COUNT_FOR_MODELS,
    page * PAGE_OFFSET_COUNT_FOR_MODELS
  );

  function generateWorkspaceYAML(model: PresetModel): string {
    return `
apiVersion: owldb.rice.dev/v1alpha1
kind: Workspace
metadata:
  name: ${model.name.toLowerCase()}-workspace
spec:
  model: ${model.name}
  version: ${model.version}
  description: "${model.description}"
`;
  }

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
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mx={2}>
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
                {model.cncf && (
                  <Tooltip title="CNCF Project">
                    <Icon icon="simple-icons:cncf" style={{ fontSize: 20, marginLeft: '0.5em' }} />
                  </Tooltip>
                )}
                {model.official && (
                  <Tooltip title="Official Model">
                    <Icon icon="mdi:star-circle" style={{ fontSize: 22, marginLeft: '0.5em' }} />
                  </Tooltip>
                )}
                {model.verifiedPublisher && (
                  <Tooltip title="Verified Publisher">
                    <Icon icon="mdi:check-decagram" style={{ fontSize: 22, marginLeft: '0.5em' }} />
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
                onClick={() => handleInstall(model)}
              >
                Install
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

      <Box textAlign="right" mt={2} mr={2}>
        {/* <Link href="https://artifacthub.io/" target="_blank"> */}
      </Box>
      <Dialog
        open={openEditor}
        onClose={() => setOpenEditor(false)}
        maxWidth="md"
        fullWidth
        title={`Install: ${activeModel?.name}`}
      >
        <Box p={2}>
          <Editor
            language="yaml"
            value={editorValue}
            onChange={val => val && setEditorValue(val)}
            height="400px"
            theme="vs-dark"
          />
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button onClick={() => setOpenEditor(false)}>Cancel</Button>
            <Button
              sx={{ ml: 2, backgroundColor: '#000', color: 'white' }}
              onClick={() => {
                enqueueSnackbar('Install triggered (not implemented)', { variant: 'info' });
                setOpenEditor(false);
              }}
            >
              Install
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default KaitoModels;
