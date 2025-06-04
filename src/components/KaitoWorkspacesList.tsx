import React from 'react';
import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DateLabel } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Workspace } from './resources/workspace';

const KaitoWorkspacesList: React.FC = () => {
  return (
    <ResourceListView
      title="Kaito Workspaces"
      resourceClass={Workspace}
      columns={[
        'name',
        'namespace',
        'age',
        // {
        //   id: 'ready',
        //   label: 'Ready',
        //   getValue: item => (item.ready ? 'Ready' : 'Not Ready'),
        // },
        // {
        //   id: 'secret',
        //   label: 'Secret',
        //   getValue: item => item.spec.secretName,
        // },
        // {
        //   id: 'created',
        //   label: 'Created',
        //   getValue: item => <DateLabel date={item.metadata.creationTimestamp} />,
        // },
      ]}
    />
  );
};

export default KaitoWorkspacesList;
