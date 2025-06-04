import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

// Type aliases
export type ModelName = string;
export type ModelImageAccessMode = 'public' | 'private';
export type TuningMethod = 'lora' | 'qlora';

// ResourceSpec describes the resource requirement of running the workload
export interface ResourceSpec {
  /** Count is the required number of GPU nodes (default: 1) */
  count?: number;
  /** InstanceType specifies the GPU node SKU (default: "Standard_NC24ads_A100_v4") */
  instanceType?: string;
  /** LabelSelector specifies the required labels for the GPU nodes */
  labelSelector: {
    matchLabels?: Record<string, string>;
    matchExpressions?: Array<{
      key: string;
      operator: string;
      values?: string[];
    }>;
  };
  /** PreferredNodes is an optional node list specified by the user */
  preferredNodes?: string[];
}

export interface PresetMeta {
  /** Name of the supported models with preset configurations */
  name: ModelName;
  /** AccessMode specifies whether the containerized model image is accessible via public or private registry (deprecated in v1beta1) */
  accessMode?: ModelImageAccessMode;
}

export interface PresetOptions {
  /** Image is the name of the containerized model image (deprecated in v1beta1) */
  image?: string;
  /** ImagePullSecrets is a list of secret names used for pulling the model image (deprecated in v1beta1) */
  imagePullSecrets?: string[];
  /** ModelAccessSecret is the name of the secret that contains the huggingface access token */
  modelAccessSecret?: string;
}

export interface PresetSpec extends PresetMeta {
  presetOptions?: PresetOptions;
}

export interface DataSource {
  /** The name of the dataset */
  name?: string;
  /** URLs specifies the links to the public data sources */
  urls?: string[];
  /** The mounted volume that contains the data */
  volumeSource?: any; // v1.VolumeSource equivalent
  /** The name of the image that contains the source data */
  image?: string;
  /** ImagePullSecrets is a list of secret names used for pulling the data image */
  imagePullSecrets?: string[];
}

export interface DataDestination {
  /** The mounted volume that is used to save the output data */
  volumeSource?: any; // v1.VolumeSource equivalent
  /** Name of the image where the output data is pushed to */
  image?: string;
  /** ImagePushSecret is the name of the secret for docker push authentication */
  imagePushSecret?: string;
}

export interface AdapterSpec {
  /** Source describes where to obtain the adapter data */
  source?: DataSource;
  /** Strength specifies the default multiplier for applying the adapter weights */
  strength?: string;
}

export interface InferenceSpec {
  /** Preset describes the base model that will be deployed with preset configurations */
  preset?: PresetSpec;
  /** Template specifies the Pod template used to run the inference service */
  template?: any; // v1.PodTemplateSpec equivalent
  /** Config specifies the name of a custom ConfigMap that contains inference arguments */
  config?: string;
  /** Adapters are integrated into the base model for inference */
  adapters?: AdapterSpec[];
}

export interface TuningSpec {
  /** Preset describes which model to load for tuning */
  preset?: PresetSpec;
  /** Method specifies the Parameter-Efficient Fine-Tuning(PEFT) method */
  method?: TuningMethod;
  /** Config specifies the name of a custom ConfigMap that contains tuning arguments */
  config?: string;
  /** Input describes the input used by the tuning method */
  input: DataSource;
  /** Output specified where to store the tuning output */
  output: DataDestination;
}

export interface WorkspaceStatus {
  /** WorkerNodes is the list of nodes chosen to run the workload */
  workerNodes?: string[];
  /** Conditions report the current conditions of the workspace */
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
  static apiName = 'workspaces'; // lowercase(kind)+s
  static apiVersion = 'kaito.sh/v1beta1';
  static isNamespaced = true;

  // Note: This workaround is needed to make the plugin compatible with older versions of Headlamp
  static get detailsRoute() {
    return '/kaito/workspaces/:namespace/:name';
  }

  // get spec(): {
  //   resource?: ResourceSpec;
  //   inference?: InferenceSpec;
  //   tuning?: TuningSpec;
  // } {
  //   return this.jsonData.spec;
  // }

  // get resource(): ResourceSpec | undefined {
  //   return this.spec.resource;
  // }

  // get inference(): InferenceSpec | undefined {
  //   return this.spec.inference;
  // }

  // get tuning(): TuningSpec | undefined {
  //   return this.spec.tuning;
  // }
}
