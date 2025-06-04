/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import KaitoModels from './components/KaitoModels';
import KaitoWorkspacesList from './components/KaitoWorkspacesList';

// Inspired by kompose plugin:
//Main sidebar entry
registerSidebarEntry({
  parent: '',
  name: 'Kaito',
  url: `/kaito/workspaces`,
  label: 'KAITO',
  icon: 'mdi:kubernetes',
});

// Workspaces sidebar entry
registerSidebarEntry({
  parent: 'Kaito',
  name: 'workspaces',
  label: 'Kaito Workspaces',
  url: '/kaito/workspaces',
});

registerRoute({
  path: '/kaito/workspaces',
  parent: 'Kaito',
  sidebar: 'workspaces',
  component: () => <KaitoWorkspacesList />,
  exact: true,
  name: 'workspaces',
});

// Models sidebar entry
registerSidebarEntry({
  parent: 'Kaito',
  name: 'models',
  label: 'Model Catalog',
  url: '/kaito/models',
});

registerRoute({
  path: '/kaito/models',
  parent: 'Kaito',
  sidebar: 'models',
  component: () => <KaitoModels />,
  exact: true,
  name: 'models',
});
