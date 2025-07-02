/*
 * MCP (Model Context Protocol) Integration
 *
 * This module handles integration with MCP servers for tool-augmented AI queries.
 *
 * Requirements:
 * 1. MCP servers must be running and accessible via HTTP/SSE
 * 2. Server URLs should be configured in the MCPServerManager
 * 3. Servers should support the standard MCP protocol endpoints
 *
 * Troubleshooting:
 * - If you see "404 NOT FOUND" errors, ensure your MCP server is running
 * - If you see "listTools is not a function" errors, this has been fixed to use client.tools()
 * - Check the browser console for connection status messages
 */

import { experimental_createMCPClient } from 'ai';

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

export interface MCPContext {
  resources: MCPResource[];
  availableTools: MCPTool[];
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
      console.log(`Initializing MCP client for ${server.name} at ${server.url}`);

      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: server.url,
        },
      });

      // Test the connection by trying to get tools
      try {
        await client.tools();
        mcpClients.set(server.name, client);
        console.log(`✅ Successfully initialized MCP client for ${server.name}`);
      } catch (testError) {
        console.error(`❌ Failed to connect to MCP server ${server.name}:`, testError);
        // Don't add this client to the map if it's not working
      }
    } catch (error) {
      console.error(`Failed to initialize MCP client for ${server.name}:`, error);
    }
  }

  console.log(
    `Initialized ${mcpClients.size} MCP clients out of ${servers.length} configured servers`
  );
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
      // Use the correct AI SDK MCP client API
      const serverTools = await client.tools();

      for (const tool of serverTools) {
        tools.push({
          name: tool.name || tool.function?.name,
          description: tool.description || tool.function?.description || '',
          inputSchema: tool.inputSchema || tool.function?.parameters || {},
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
      // Use the correct AI SDK MCP client API
      const serverResources = await client.resources();

      for (const resource of serverResources) {
        resources.push({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
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
  const models: MCPModel[] = [];

  for (const [serverName, client] of mcpClients) {
    try {
      // get models from resources
      try {
        const serverResources = await client.resources();
        const modelResources = serverResources.filter(
          (resource: any) =>
            resource.uri?.includes('model') || resource.name?.toLowerCase().includes('model')
        );

        for (const modelResource of modelResources) {
          models.push({
            id: modelResource.name || modelResource.uri.split('/').pop() || `${serverName}-model`,
            name: modelResource.description || modelResource.name || `${serverName} Model`,
            serverName: serverName,
            baseURL: getServerURL(serverName),
          });
        }
      } catch (resourceError) {
        console.log(`No model resources found for ${serverName}:`, resourceError);
      }

      // get models from tools (some MCP servers expose model info as tools)
      try {
        const serverTools = await client.tools();
        const modelTools = serverTools.filter(
          (tool: any) =>
            tool.name?.toLowerCase().includes('model') ||
            tool.description?.toLowerCase().includes('model') ||
            tool.name?.toLowerCase().includes('chat') ||
            tool.name?.toLowerCase().includes('completion') ||
            tool.function?.name?.toLowerCase().includes('model') ||
            tool.function?.description?.toLowerCase().includes('model')
        );

        for (const modelTool of modelTools) {
          const toolName = modelTool.name || modelTool.function?.name;
          const toolDescription = modelTool.description || modelTool.function?.description;

          // avoid duplicates by checking if we already have a model with this name
          if (!models.find(m => m.id === toolName && m.serverName === serverName)) {
            models.push({
              id: toolName,
              name: toolDescription || toolName,
              serverName: serverName,
              baseURL: getServerURL(serverName),
            });
          }
        }
      } catch (toolError) {
        console.log(`No model tools found for ${serverName}:`, toolError);
      }

      // if no models found through resources or tools, create a default entry
      const serverModels = models.filter(m => m.serverName === serverName);
      if (serverModels.length === 0) {
        models.push({
          id: `${serverName}-default`,
          name: `${serverName} Default Model`,
          serverName: serverName,
          baseURL: getServerURL(serverName),
        });
      }
    } catch (error) {
      console.error(`Failed to get models from ${serverName}:`, error);
      // fallback: add a default model entry even if querying fails
      models.push({
        id: `${serverName}-default`,
        name: `${serverName} Default Model`,
        serverName: serverName,
        baseURL: getServerURL(serverName),
      });
    }
  }

  return models;
}

export async function executeMCPTool(
  serverName: string,
  toolName: string,
  arguments_: any
): Promise<any> {
  const client = getMCPClient(serverName);
  if (!client) {
    throw new Error(`MCP client not found for server: ${serverName}`);
  }

  try {
    // Use the correct AI SDK MCP client API
    const result = await client.callTool({
      name: toolName,
      arguments: arguments_,
    });

    return result;
  } catch (error) {
    console.error(`Failed to execute tool ${toolName} on ${serverName}:`, error);
    throw error;
  }
}

export async function getMCPResource(serverName: string, uri: string): Promise<any> {
  const client = getMCPClient(serverName);
  if (!client) {
    throw new Error(`MCP client not found for server: ${serverName}`);
  }

  try {
    // Use the correct AI SDK MCP client API
    const result = await client.readResource({ uri });
    return result;
  } catch (error) {
    console.error(`Failed to get resource ${uri} from ${serverName}:`, error);
    throw error;
  }
}

function getServerURL(serverName: string): string {
  const servers = loadMCPServers();
  const server = servers.find(s => s.name === serverName);
  return server?.url || '';
}
