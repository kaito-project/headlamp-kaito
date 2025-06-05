import {
  DetailsGrid,
  NameValueTable,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/components/common';
import { useParams } from 'react-router-dom';
import { KaitoWorkspace, Workspace } from './resources/workspace';
import KaitoWorkspacesList from './KaitoWorkspacesList';

const StringArray = ({ items }: { items?: string[] }) => (items?.length ? items.join(', ') : '-');

export function WorkspaceDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();

  return (
    <DetailsGrid
      name={name}
      namespace={namespace}
      resourceType={Workspace}
      withEvents
      extraInfo={(item: KaitoWorkspace) =>
        item && [
          {
            name: 'Tuning Method',
            value: item.tuning?.method || '-',
          },
          {
            name: 'Preset Name',
            value: item.tuning?.preset?.name || item.inference?.preset?.name || '-',
          },
          {
            name: 'Preset Image',
            value:
              item.tuning?.preset?.presetOptions?.image ||
              item.inference?.preset?.presetOptions?.image ||
              '-',
          },
          {
            name: 'Config',
            value: item.tuning?.config || item.inference?.config || '-',
          },
          {
            name: 'Worker Nodes',
            value: item.status?.workerNodes?.join(', ') || '-',
          },
        ]
      }
      extraSections={(item: KaitoWorkspace) =>
        item && [
          {
            id: 'ResourceSpec',
            section: item.resource && (
              <SectionBox title="Resources">
                <NameValueTable
                  rows={[
                    {
                      name: 'Count',
                      value: item.resource.count?.toString() || '-',
                    },
                    {
                      name: 'Instance Type',
                      value: item.resource.instanceType || '-',
                    },
                    {
                      name: 'Preferred Nodes',
                      value: StringArray({ items: item.resource.preferredNodes }),
                    },
                    {
                      name: 'Label Selector (matchLabels)',
                      value: item.resource.labelSelector?.matchLabels
                        ? JSON.stringify(item.resource.labelSelector.matchLabels)
                        : '-',
                    },
                  ]}
                />
              </SectionBox>
            ),
          },
          {
            id: 'Status',
            section: item.status?.conditions && (
              <SectionBox title="Status Conditions">
                <NameValueTable
                  rows={item.status.conditions.map(c => ({
                    name: c.type,
                    value: `${c.status} ${c.reason ? `(${c.reason})` : ''} ${
                      c.message ? `- ${c.message}` : ''
                    }`,
                  }))}
                />
              </SectionBox>
            ),
          },
        ]
      }
    />
  );
}
