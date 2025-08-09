import { Icon } from '@iconify/react';
import {
  LightTooltip,
  ResourceListView,
  StatusLabel,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box } from '@mui/material';
import React from 'react';
import { Workspace } from './resources/workspace';
import WorkspaceUsagePanel from './WorkspaceUsagePanel';

const KaitoWorkspacesList: React.FC = () => {
  const makeConditionStatusLabel = (conditionType: string) => {
    return (workspace: Workspace) => {
      const condition = workspace.status?.conditions?.find(cond => cond.type === conditionType);
      if (!condition) {
        return (
          <Box display="inline-block">
            <StatusLabel status="">N/A</StatusLabel>
          </Box>
        );
      }
      const getConditionStatus = condition => {
        if (condition.status === 'True') return 'success'; // success = green
        if (condition.status === 'False') return 'error'; // error = red
        return 'warning'; // warning = yellow
      };
      const status = getConditionStatus(condition);

      return (
        <Box display="inline">
          <LightTooltip title={condition.message} placement="top">
            <Box display="inline">
              <StatusLabel status={getConditionStatus(condition)}>
                {(status === 'warning' || status === 'error') && (
                  <Icon
                    aria-label="hidden"
                    icon="mdi:alert-outline"
                    width="1.2rem"
                    height="1.2rem"
                  />
                )}
                {condition.status === 'True' ? 'Ready' : 'Not Ready'}
              </StatusLabel>
            </Box>
          </LightTooltip>
        </Box>
      );
    };
  };

  return (
    <>
      <WorkspaceUsagePanel />
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
            render: makeConditionStatusLabel('ResourceReady'),
          },
          {
            id: 'inferenceReady',
            label: 'Inference Ready',
            getValue: item => item.inferenceReady,
            render: makeConditionStatusLabel('InferenceReady'),
          },
          {
            id: 'jobStarted',
            label: 'Job Started',
            getValue: item => item.jobStarted,
            render: makeConditionStatusLabel('JobStarted'),
          },
            {
            id: 'workspaceSucceeded',
            label: 'Workspace Succeeded',
            getValue: item => item.workspaceSucceeded,
            render: makeConditionStatusLabel('WorkspaceSucceeded'),
          },
          'age',
        ]}
      />
    </>
  );
};

export default KaitoWorkspacesList;
