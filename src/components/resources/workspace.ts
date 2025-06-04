import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface KaitoWorkspace extends KubeObjectInterface {
  spec: {
    inference: {
      preset: {
        accessMode: 'public' | 'private';
        name: string;
        presetOptions: {
          modelAccessSecret: string;
        };
      };
    };
    metadata: {
      // annotations
      creationTimestamp: string;
      finalizers: string[];
      generation: number;
      name: string;
      namespace: string;
      resourceVersion: string;
      uid: string;
    };
    resource: {
      count: number;
      instanceType: string;
      labelSelector: {
        matchLabels: string[];
      };
    };
    // status {}

    // below is from cert-manager Certificate spec
    // subject?: X509Subject;
    // literalSubject?: string;
    commonName?: string;
    duration?: string;
    renewBefore?: string;
    renewBeforePercentage?: number;
    dnsNames?: string[];
    ipAddresses?: string[];
    uris?: string[];
    otherNames?: {
      oid: string;
      utf8Value: string;
    }[];
    emailAddresses?: string[];
    secretName: string;
    secretTemplate?: {
      annotations?: Record<string, string>;
      labels?: Record<string, string>;
    };
    // keystores?: CertificateKeystores;
    // issuerRef: IssuerReference;
    // isCA?: boolean;
    // usages?: KeyUsage[];
    // privateKey?: CertificatePrivateKey;
    // encodeUsagesInRequest?: boolean;
    // revisionHistoryLimit?: number;
    // additionalOutputFormats?: {
    //   type: 'pem' | 'der';
    // };
    // nameConstraints?: {
    //   critical?: boolean;
    //   permitted?: NameConstraintItem;
    //   excluded?: NameConstraintItem;
    // };
  };
  // status: {
  //   conditions: Condition[];
  //   lastFailureTime?: string;
  //   notBefore?: string;
  //   notAfter?: string;
  //   renewalTime?: string;
  //   revision?: number;
  //   nextPrivateKeySecretName?: string;
  //   failedIssuanceAttempts?: number;
  // };
}

export class Workspace extends KubeObject {
  static kind = 'Workspace';
  static apiName = 'kaitoworkspaces'; // not sure
  static apiVersion = 'kaito.sh/v1beta1'; // not sure if hardcoded
  static isNamespaced = true;

  get ready() {
    return this.status.conditions.find(condition => condition.type === 'Ready')?.status === 'True';
  }

  // Note: This workaround is needed to make the plugin compatible with older versions of Headlamp
  static get detailsRoute() {
    return '/kaito/workspaces/:namespace/:name';
  }

  get organizations(): string[] {
    return this.spec.subject?.organizations || [];
  }

  get status() {
    return this.jsonData.status;
  }

  get spec() {
    return this.jsonData.spec;
  }
}
