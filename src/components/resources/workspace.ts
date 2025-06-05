import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export type ModelName = string;
export type ModelImageAccessMode = 'public' | 'private';
export type TuningMethod = 'lora' | 'qlora';
export interface ResourceSpec {
  count?: number;
  instanceType?: string;
  labelSelector: {
    matchLabels?: Record<string, string>;
    matchExpressions?: Array<{
      key: string;
      operator: string;
      values?: string[];
    }>;
  };
  preferredNodes?: string[];
}

export interface PresetMeta {
  name: ModelName;
  accessMode?: ModelImageAccessMode;
}

export interface PresetOptions {
  image?: string;
  imagePullSecrets?: string[];
  modelAccessSecret?: string;
}

export interface PresetSpec extends PresetMeta {
  presetOptions?: PresetOptions;
}

export interface DataSource {
  name?: string;
  urls?: string[];
  volumeSource?: any;
  image?: string;
  imagePullSecrets?: string[];
}

export interface DataDestination {
  volumeSource?: any;
  image?: string;
  imagePushSecret?: string;
}

export interface AdapterSpec {
  source?: DataSource;
  strength?: string;
}

export interface InferenceSpec {
  preset?: PresetSpec;
  template?: any;
  config?: string;
  adapters?: AdapterSpec[];
}

export interface TuningSpec {
  preset?: PresetSpec;
  method?: TuningMethod;
  config?: string;
  input: DataSource;
  output: DataDestination;
}

export interface WorkspaceStatus {
  workerNodes?: string[];
  conditions?: Array<{
    type: string;
    status: string;
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
}

export interface KaitoWorkspace extends KubeObjectInterface {
  resource?: ResourceSpec;
  inference?: InferenceSpec;
  tuning?: TuningSpec;
  status?: WorkspaceStatus;
}

export class Workspace extends KubeObject {
  static kind = 'Workspace';
  static apiName = 'workspaces';
  static apiVersion = 'kaito.sh/v1beta1';
  static isNamespaced = true;

  // Note: This workaround is needed to make the plugin compatible with older versions of Headlamp
  static get detailsRoute() {
    return '/kaito/workspaces/:namespace/:name';
  }
}
