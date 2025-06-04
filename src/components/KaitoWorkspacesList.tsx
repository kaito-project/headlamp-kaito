import React from 'react';
import {
  DetailsGrid,
  NameValueTable,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/components/common';
import { useParams } from 'react-router-dom';
import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Workspace } from './resources/workspace';

// const { name, namespace } = useParams<{ name: string; namespace: string }>();
const KaitoWorkspaces: React.FC = () => {
  return (
    <ResourceListView
      title="Kaito Workspaces"
      resourceClass={Workspace}
      columns={[
        'name',
        'namespace',
        {
          id: 'owner',
          label: 'Owner',
          getValue: ws => ws.owner,
        },
        {
          id: 'models',
          label: 'Models',
          getValue: ws => ws.modelCount,
        },
        {
          id: 'ready',
          label: 'Ready',
          getValue: ws => (ws.ready ? 'Yes' : 'No'),
        },
        'age',
      ]}
    />
  );
};

//brainstorming some ideas for workspaces breadcrumb
// workspaces

export default KaitoWorkspaces;
