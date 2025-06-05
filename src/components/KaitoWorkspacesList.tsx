import React from 'react';
import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DateLabel } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Workspace } from './resources/workspace';

const KaitoWorkspacesList: React.FC = () => {
  return (
    <ResourceListView
      title="Workspaces"
      resourceClass={Workspace}
      columns={[
        'name',
        'namespace',
        {
          id: 'instanceType',
          label: 'Instance Type',
          getValue: item => item.instanceType,
        },
        {
          id: 'resourceReady',
          label: 'Resource Ready',
          getValue: item => item.resourceReady,
        },
        {
          id: 'inferenceReady',
          label: 'Inference Ready',
          getValue: item => item.inferenceReady,
        },
        {
          id: 'jobStarted',
          label: 'Job Started',
          getValue: item => item.jobStarted,
        },
        {
          id: 'workspaceSucceeded',
          label: 'Workspace Succeeded',
          getValue: item => item.workspaceSucceeded,
        },

        'age',
      ]}
    />
  );
};

export default KaitoWorkspacesList;
