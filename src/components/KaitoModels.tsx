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
//took inspiration from app catalog from plugin
export const PAGE_OFFSET_COUNT_FOR_CHARTS = 9;
const modelNames = [
  'PresetDeepSeekR1DistillLlama8BModel',
  'PresetDeepSeekR1DistillQwen14BModel',
  'PresetFalcon7BModel',
  'PresetFalcon40BModel',
  'PresetFalcon7BInstructModel',
  'PresetFalcon40BInstructModel',
  'PresetLlama3_1_8BInstructModel',
  'PresetMistral7BModel',
  'PresetMistral7BInstructModel',
  'PresetPhi2Model',
  'PresetPhi3Mini4kModel',
  'PresetPhi3Mini128kModel',
  'PresetPhi3Medium4kModel',
  'PresetPhi3Medium128kModel',
  'PresetPhi3_5MiniInstruct',
  'PresetPhi4Model',
  'PresetPhi4MiniInstructModel',
  'PresetQwen2_5Coder7BInstructModel',
  'PresetQwen2_5Coder32BInstructModel',
];

const getLogo = name => {
  if (name.includes('DeepSeek')) return '../logos/deepseek-logo.webp';
  if (name.includes('Falcon')) return 'falcon-logo.png';
  if (name.includes('Llama')) return 'llama-logo.png';
  if (name.includes('Mistral')) return 'mistral-logo.png';
  if (name.includes('Phi')) return 'phi-logo.png';
  if (name.includes('Qwen')) return 'qwen-logo.png';
  return 'default-logo.png';
};

const modelCharts = modelNames.map((name, i) => ({
  name,
  version: `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
  repository: {
    name: `Repo-${i + 1}`,
    url: 'https://microsoft.com',
    verified_publisher: i % 2 === 0,
  },
  official: i % 3 === 0,
  cncf: i % 4 === 0,
  logo_image_id: getLogo(name),
  description:
    'this is a long description of the model which may be very long and spills over to the next line.',
}));

//Will replace this with common filter categories
const categories = [
  { title: 'All', value: 0 },
  { title: 'option2', value: 1 },
  { title: 'option3', value: 2 },
];

const KaitoModels = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [page, setPage] = useState(1);

  // convert search to lower case
  const filteredCharts = modelCharts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedCharts = filteredCharts.slice(
    (page - 1) * PAGE_OFFSET_COUNT_FOR_CHARTS,
    page * PAGE_OFFSET_COUNT_FOR_CHARTS
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

      <Box display="flex" flexWrap="wrap" justifyContent="left">
        {paginatedCharts.map((chart, i) => (
          <Card
            key={i}
            sx={{
              margin: '1rem',
              width: { md: '40%', lg: '30%' },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mx={2}>
              <Box display="flex" alignItems="center">
                {chart.logo_image_id && (
                  <CardMedia
                    component="img"
                    image={`https://artifacthub.io/image/${chart.logo_image_id}`}
                    alt={`${chart.name} logo`}
                    sx={{ width: 60, height: 60, objectFit: 'contain', marginRight: 1 }}
                  />
                )}
              </Box>
              <Box display="flex" alignItems="center">
                {chart.cncf && (
                  <Tooltip title="CNCF Project">
                    <Icon icon="simple-icons:cncf" style={{ fontSize: 20, marginLeft: '0.5em' }} />
                  </Tooltip>
                )}
                {chart.official && (
                  <Tooltip title="Official Chart">
                    <Icon icon="mdi:star-circle" style={{ fontSize: 22, marginLeft: '0.5em' }} />
                  </Tooltip>
                )}
                {chart.repository.verified_publisher && (
                  <Tooltip title="Verified Publisher">
                    <Icon icon="mdi:check-decagram" style={{ fontSize: 22, marginLeft: '0.5em' }} />
                  </Tooltip>
                )}
              </Box>
            </Box>

            <CardContent>
              <Tooltip title={chart.name}>
                <Typography component="h2" variant="h5" noWrap>
                  <RouterLink
                    routeName="/kaito/models/:modelName"
                    params={{ modelName: chart.name }}
                  >
                    {chart.name}
                  </RouterLink>
                </Typography>
              </Tooltip>
              <Box display="flex" justifyContent="space-between" my={1}>
                <Typography>{chart.version}</Typography>
                <Tooltip title={chart.repository.name}>
                  <Typography noWrap>{chart.repository.name}</Typography>
                </Tooltip>
              </Box>
              <Divider />
              <Typography mt={1}>
                {chart.description.slice(0, 100)}
                {chart.description.length > 100 && (
                  <Tooltip title={chart.description}>
                    <span>…</span>
                  </Tooltip>
                )}
              </Typography>
            </CardContent>

            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
              <Button
                sx={{ backgroundColor: '#000', color: 'white', textTransform: 'none' }}
                onClick={() => console.log('View details clicked')}
              >
                Install
              </Button>
              <Link href={chart.repository.url} target="_blank">
                Learn More
              </Link>
            </CardActions>
          </Card>
        ))}
      </Box>

      {filteredCharts.length > PAGE_OFFSET_COUNT_FOR_CHARTS && (
        <Box mt={3} mx="auto" maxWidth="max-content">
          <Pagination
            size="large"
            shape="rounded"
            page={page}
            count={Math.ceil(filteredCharts.length / PAGE_OFFSET_COUNT_FOR_CHARTS)}
            onChange={(e, val) => setPage(val)}
            color="primary"
          />
        </Box>
      )}

      <Box textAlign="right" mt={2} mr={2}>
        {/* <Link href="https://artifacthub.io/" target="_blank"> */}
        <Link>putting some text here</Link>
      </Box>
    </>
  );
};

export default KaitoModels;
