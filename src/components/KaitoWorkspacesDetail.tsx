import {
  DetailsGrid,
  MetadataDictGrid,
  NameValueTable,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/components/common';
import { useParams } from 'react-router-dom';
import { Workspace } from './resources/workspace';

const StringArray = ({ items }: { items?: string[] }) => (items?.length ? items.join(', ') : '');

const getPresetName = (item: Workspace) =>
  item.tuning?.preset?.name || item.inference?.preset?.name;

export function WorkspaceDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      name={name}
      namespace={namespace}
      resourceType={Workspace}
      withEvents
      // Resources section
      extraSections={(item: Workspace) =>
        item && [
          {
            id: 'ResourceSpec',
            section: item.resource && (
              <SectionBox title="Resources">
                <NameValueTable
                  rows={[
                    {
                      name: 'Count',
                      value: item.resource.count?.toString(),
                    },
                    {
                      name: 'Instance Type',
                      value: item.resource.instanceType,
                    },
                    {
                      name: 'Preferred Nodes',
                      value: <StringArray items={item.resource.preferredNodes} />,
                    },
                    {
                      name: 'Node Selector',
                      value: item.resource.labelSelector?.matchLabels && (
                        <MetadataDictGrid
                          dict={
                            item.resource.labelSelector.matchLabels as { [key: string]: string }
                          }
                        />
                      ),
                    },
                  ]}
                />
              </SectionBox>
            ),
          },
          // Inference section
          {
            id: 'InferenceSpec',
            section: item.inference && (
              <SectionBox title="Inference">
                <NameValueTable
                  rows={[
                    {
                      name: 'Preset Name',
                      value: item.inference.preset?.name,
                    },
                    {
                      name: 'Preset Image',
                      value: item.inference.preset?.presetOptions?.image,
                    },
                    {
                      name: 'Config',
                      value: item.inference.config,
                    },
                    {
                      name: 'Adapters',
                      value: item.inference.adapters
                        ? item.inference.adapters
                            .map(a => `${a.source?.name} (${a.strength})`)
                            .join(', ')
                        : '',
                    },
                  ]}
                />
              </SectionBox>
            ),
          },
          // Tuning section
          {
            id: 'TuningSpec',
            section: item.tuning && (
              <SectionBox title="Tuning">
                <NameValueTable
                  rows={[
                    {
                      name: 'Preset Name',
                      value: item.tuning.preset?.name,
                    },
                    {
                      name: 'Preset Image',
                      value: item.tuning.preset?.presetOptions?.image,
                    },
                    {
                      name: 'Tuning Method',
                      value: item.tuning.method,
                    },
                    {
                      name: 'Config',
                      value: item.tuning.config,
                    },
                    {
                      name: 'Input Data Source',
                      value: item.tuning.input?.name,
                    },
                    {
                      name: 'Output Data Destination',
                      value: item.tuning.output?.volumeSource ? 'Volume' : '',
                    },
                  ]}
                />
              </SectionBox>
            ),
          },
          // Status section
          {
            id: 'Status',
            section: item.status?.conditions && (
              <SectionBox title="Status Conditions">
                <NameValueTable
                  rows={[
                    {
                      name: 'Worker Nodes',
                      value: item.status.workerNodes?.join(', ') || '',
                    },
                    ...item.status.conditions.map(c => ({
                      name: c.type,
                      value: `${c.status} ${c.reason ? `(${c.reason})` : ''} ${
                        c.message ? `- ${c.message}` : ''
                      }`,
                    })),
                  ]}
                />
              </SectionBox>
            ),
          },
        ]
      }
    />
  );
}
