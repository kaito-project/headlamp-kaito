import {
  request,
  startPortForward,
  stopOrDeletePortForward,
} from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import {
  MCPTool,
  MCPModel,
  MCPResource,
  initializeMCPClients,
  getMCPTools,
  getMCPModels,
  getMCPResources,
  loadMCPServers,
  getAllMCPClients,
  getMCPClient,
} from '../../config/mcp';

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
  } catch {}
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

export async function fetchToolsFromAllMCPServers(): Promise<MCPTool[]> {
  try {
    await initializeMCPClients();

    const tools = await getMCPTools();
    return tools;
  } catch (error) {
    console.error('Failed to fetch MCP tools:', error);
    return [];
  }
}

export async function fetchModelsFromAllMCPServers(): Promise<MCPModel[]> {
  try {
    await initializeMCPClients();

    const models = await getMCPModels();
    return models;
  } catch (error) {
    console.error('Failed to fetch MCP models:', error);
    return [];
  }
}

export interface MCPContext {
  resources: MCPResource[];
  availableTools: MCPTool[];
}

export async function getMCPContext(serverNames?: string[]): Promise<MCPContext> {
  try {
    await initializeMCPClients();

    const allResources = await getMCPResources();
    const allTools = await getMCPTools();

    // Filter by server names if provided
    const resources = serverNames
      ? allResources.filter(r => serverNames.includes(r.serverName))
      : allResources;

    const availableTools = serverNames
      ? allTools.filter(t => serverNames.includes(t.serverName))
      : allTools;

    return { resources, availableTools };
  } catch (error) {
    console.error('Failed to get MCP context:', error);
    return { resources: [], availableTools: [] };
  }
}

export async function enhancePromptWithMCPContext(
  originalPrompt: string,
  enabledServerNames?: string[]
): Promise<string> {
  try {
    const context = await getMCPContext(enabledServerNames);

    if (context.resources.length === 0 && context.availableTools.length === 0) {
      return originalPrompt;
    }

    let enhancedPrompt = originalPrompt;

    // Add available resources context
    if (context.resources.length > 0) {
      const resourcesInfo = context.resources
        .map(r => `- ${r.name} (${r.serverName}): ${r.description || r.uri}`)
        .join('\n');

      enhancedPrompt += `\n\n[Available Resources]\n${resourcesInfo}`;
    }

    // Add available tools context
    if (context.availableTools.length > 0) {
      const toolsInfo = context.availableTools
        .map(t => `- ${t.name} (${t.serverName}): ${t.description}`)
        .join('\n');

      enhancedPrompt += `\n\n[Available Tools]\n${toolsInfo}`;
    }

    return enhancedPrompt;
  } catch (error) {
    console.error('Failed to enhance prompt with MCP context:', error);
    return originalPrompt;
  }
}

export async function executeMCPToolFromChat(
  toolName: string,
  serverName: string,
  arguments_: any
): Promise<any> {
  try {
    const client = getMCPClient(serverName);
    if (!client) {
      throw new Error(`MCP client not found for server: ${serverName}`);
    }

    // Use the correct AI SDK MCP client API
    const result = await client.callTool({
      name: toolName,
      arguments: arguments_,
    });

    return result;
  } catch (error) {
    console.error(`Failed to execute MCP tool ${toolName} from ${serverName}:`, error);
    throw error;
  }
}

export async function getMCPToolsForChat(selectedServers?: string[]): Promise<any[]> {
  try {
    await initializeMCPClients();

    const allTools: any[] = [];
    const clients = getAllMCPClients();

    for (const [serverName, client] of clients) {
      // Skip if selectedServers is provided and this server is not in the list
      if (selectedServers && !selectedServers.includes(serverName)) {
        continue;
      }

      try {
        // Use the correct AI SDK MCP client API
        const serverTools = await client.tools();

        // Format tools for AI SDK compatibility
        const formattedTools = serverTools.map((tool: any) => ({
          type: 'function',
          function: {
            name: `${serverName}_${tool.name || tool.function?.name}`,
            description: tool.description || tool.function?.description || '',
            parameters: tool.inputSchema ||
              tool.function?.parameters || {
                type: 'object',
                properties: {},
              },
          },
          serverName,
          originalName: tool.name || tool.function?.name,
        }));

        allTools.push(...formattedTools);
      } catch (error) {
        console.error(`Failed to get tools from ${serverName}:`, error);
      }
    }

    return allTools;
  } catch (error) {
    console.error('Failed to get MCP tools for chat:', error);
    return [];
  }
}
