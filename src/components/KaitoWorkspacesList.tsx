import React from 'react';
import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DateLabel } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Workspace } from './resources/workspace';

const KaitoWorkspacesList: React.FC = () => {
  return (
    <ResourceListView
      title="Workspaces"
      resourceClass={Workspace}
      columns={['name', 'namespace', 'age']}
    />
  );
};

export default KaitoWorkspacesList;
