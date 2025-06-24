import {
  request,
  startPortForward,
  stopOrDeletePortForward,
} from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';

export async function resolvePodAndPort(namespace: string, workspaceName: string) {
  const labelSelector = `kaito.sh/workspace=${workspaceName}`;
  const podsResp = await request(
    `/api/v1/namespaces/${namespace}/pods?labelSelector=${labelSelector}`
  );
  const pod = podsResp?.items?.[0];
  if (!pod) return null;

  const containers = pod.spec.containers || [];
  for (const container of containers) {
    const portObj = container.ports?.[0];
    if (portObj && portObj.containerPort) {
      return {
        podName: pod.metadata.name,
        targetPort: portObj.containerPort,
      };
    }
  }
  return null;
}

export function getClusterOrEmpty() {
  try {
    const clusterValue = getCluster();
    if (clusterValue !== null && clusterValue !== undefined) {
      return clusterValue;
    }
  } catch {
    // ignore
  }
  return '';
}

export async function startWorkspacePortForward({
  namespace,
  workspaceName,
  podName,
  targetPort,
  localPort,
  portForwardId,
}: {
  namespace: string;
  workspaceName: string;
  podName: string;
  targetPort: string | number;
  localPort: string;
  portForwardId: string;
}) {
  const cluster = getClusterOrEmpty();
  await startPortForward(
    cluster,
    namespace,
    podName,
    targetPort.toString(),
    workspaceName,
    namespace,
    localPort,
    'localhost',
    portForwardId
  );
}

export async function stopWorkspacePortForward(portForwardId: string) {
  const cluster = getClusterOrEmpty();
  await stopOrDeletePortForward(cluster, portForwardId, true);
}

export async function fetchModelsWithRetry(localPort: string, retries = 3, delay = 800) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`http://localhost:${localPort}/v1/models`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      return (data.data || []).map((model: any) => ({
        title: model.id,
        value: model.id,
      }));
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
  return [];
}
