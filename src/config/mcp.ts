import { experimental_createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

export interface MCPServerConfig {
  name: string;
  url: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

export interface MCPModel {
  id: string;
  name: string;
  serverName: string;
  baseURL: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  serverName: string;
}

let mcpClients: Map<string, any> = new Map();

export function loadMCPServers(): MCPServerConfig[] {
  const stored = localStorage.getItem('mcpServers');
  return stored ? JSON.parse(stored) : [];
}

export async function initializeMCPClients(): Promise<void> {
  const servers = loadMCPServers();

  // Clear existing clients
  mcpClients.clear();

  for (const server of servers) {
    try {
      const url = new URL(server.url);
      const client = experimental_createMCPClient({
        transport: new StreamableHTTPClientTransport(url, {
          sessionId: `session_${server.name}_${Date.now()}`,
        }),
      });

      mcpClients.set(server.name, client);
    } catch (error) {
      console.error(`Failed to initialize MCP client for ${server.name}:`, error);
    }
  }
}

export function getMCPClient(serverName: string) {
  return mcpClients.get(serverName);
}

export function getAllMCPClients(): Map<string, any> {
  return mcpClients;
}

export async function getMCPTools(): Promise<MCPTool[]> {
  const tools: MCPTool[] = [];

  for (const [serverName, client] of mcpClients) {
    try {
      const { tools: serverTools } = await client.listTools();
      for (const tool of serverTools) {
        tools.push({
          ...tool,
          serverName,
        });
      }
    } catch (error) {
      console.error(`Failed to get tools from ${serverName}:`, error);
    }
  }

  return tools;
}

export async function getMCPResources(): Promise<MCPResource[]> {
  const resources: MCPResource[] = [];

  for (const [serverName, client] of mcpClients) {
    try {
      const { resources: serverResources } = await client.listResources();
      for (const resource of serverResources) {
        resources.push({
          ...resource,
          serverName,
        });
      }
    } catch (error) {
      console.error(`Failed to get resources from ${serverName}:`, error);
    }
  }

  return resources;
}

export async function getMCPModels(): Promise<MCPModel[]> {
  const servers = loadMCPServers();
  const models: MCPModel[] = [];

  for (const server of servers) {
    try {
      // For now, we'll create a default model entry for each server
      // In a real implementation, you'd query the server for available models
      models.push({
        id: `${server.name}-default`,
        name: `${server.name} Default Model`,
        serverName: server.name,
        baseURL: server.url,
      });
    } catch (error) {
      console.error(`Failed to get models from ${server.name}:`, error);
    }
  }

  return models;
}
