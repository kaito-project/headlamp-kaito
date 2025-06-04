import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface KaitoWorkspaceSpec {
  owner?: string;
  models?: string[];
  status?: string;
}

// export interface KaitoWorkspaceType extends KubeObjectInterface {
//   spec: KaitoWorkspaceSpec;
//   status?: {
//     phase?: string;
//     conditions?: any[];
//   };
// }

export class KaitoWorkspace extends KubeObject {
  static kind = 'KaitoWorkspace';
  static apiName = 'kaitoworkspaces';
  static apiVersion = 'kaito.ai/v1';
  static isNamespaced = true;

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status;
  }

  static get detailsRoute() {
    return '/kaito/workspaces/:namespace/:name';
  }

  get ready() {
    return this.status?.phase === 'Ready';
  }

  get owner() {
    return this.spec?.owner ?? '-';
  }

  get modelCount() {
    return this.spec?.models?.length ?? 0;
  }
}
