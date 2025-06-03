import React from 'react';
import {
  DetailsGrid,
  NameValueTable,
  SectionBox,
} from '@kinvolk/headlamp-plugin/lib/components/common';
import { useParams } from 'react-router-dom';

const { name, namespace } = useParams<{ name: string; namespace: string }>();
const KaitoWorkspaces: React.FC = () => {
  return (
    <div>
      <h1>Hello Workspaces!</h1>
    </div>
  );
};

export default KaitoWorkspaces;
//brainstorming some ideas for workspaces breadcrumb
// workspaces
