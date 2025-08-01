import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export type ModelName = string;
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

  static get detailsRoute() {
    return '/kaito/workspaces/:namespace/:name';
  }

  get status(): WorkspaceStatus | undefined {
    return this.jsonData.status;
  }

  get resource() {
    return this.jsonData.resource;
  }
  get inference() {
    return this.jsonData.inference;
  }
  get tuning() {
    return this.jsonData.tuning;
  }

  get resourceReady(): string {
    const condition = this.status?.conditions?.find(
      condition => condition.type === 'ResourceReady'
    );
    return condition?.status;
  }
  get inferenceReady(): string {
    const condition = this.status?.conditions?.find(
      condition => condition.type === 'InferenceReady'
    );
    return condition?.status;
  }

  get jobStarted(): string {
    const condition = this.status?.conditions?.find(condition => condition.type === 'JobStarted');
    return condition?.status;
  }

  get workspaceSucceeded(): string {
    const condition = this.status?.conditions?.find(
      condition => condition.type === 'WorkspaceSucceeded'
    );
    return condition?.status;
  }

  get instanceType(): string {
    return this.resource?.instanceType;
  }
}
