import { experimental_createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  description?: string;
  enabled: boolean;
  apiKey?: string;
  authMethod?: 'url' | 'header';
  transportType?: 'streamableHttp' | 'sse';
}

export interface MCPClientManager {
  clients: Map<string, any>;
  tools: any;
}

export class MCPIntegration {
  private clientManager: MCPClientManager;
  private servers: MCPServer[];

  constructor() {
    this.clientManager = {
      clients: new Map(),
      tools: {},
    };
    this.servers = [];
  }

  async initializeServers(servers: MCPServer[]): Promise<void> {
    const enabledServers = servers.filter(server => server.enabled);
    const newServerIds = new Set(enabledServers.map(server => server.id));
    const existingClientIds = new Set(this.clientManager.clients.keys());

    // Remove clients that are no longer in the servers list
    const clientsToRemove = Array.from(existingClientIds).filter(id => !newServerIds.has(id));
    for (const clientId of clientsToRemove) {
      const client = this.clientManager.clients.get(clientId);
      if (client && typeof client.close === 'function') {
        try {
          await client.close();
        } catch (error) {
          console.error(`Error closing MCP client ${clientId}:`, error);
        }
      }
      this.clientManager.clients.delete(clientId);
    }

    // Add new servers that don't exist in the clients map
    const serversToAdd = enabledServers.filter(server => !existingClientIds.has(server.id));

    for (const server of serversToAdd) {
      try {
        let transport: StreamableHTTPClientTransport | SSEClientTransport;
        const transportType = server.transportType || 'streamableHttp'; // Default to streamableHttp

        if (transportType === 'sse') {
          // SSE Transport
          let endpointUrl: string;
          let eventSourceInit: EventSourceInit = {};
          let requestInit: RequestInit = {};

          if (server.apiKey) {
            if (server.authMethod === 'url') {
              // API key in URL path: https://<mcp-server-address>/<api-key>/sse
              const url = new URL(server.endpoint);
              endpointUrl = `${url.origin}/${server.apiKey}/sse`;
            } else {
              // API key in Authorization header (default)
              endpointUrl = server.endpoint;
              eventSourceInit = {
                headers: {
                  Authorization: `Bearer ${server.apiKey}`,
                },
              } as any;
              requestInit.headers = {
                Authorization: `Bearer ${server.apiKey}`,
                'Content-Type': 'application/json',
              };
            }
          } else {
            endpointUrl = server.endpoint;
          }

          transport = new SSEClientTransport(new URL(endpointUrl), {
            eventSourceInit,
            requestInit,
          });
        } else {
          // StreamableHTTP Transport (default)
          let endpointUrl: string;
          let transportOptions: { requestInit?: RequestInit } = {};

          if (server.apiKey) {
            if (server.authMethod === 'url') {
              // API key in URL path: https://<mcp-server-address>/<api-key>/mcp
              const url = new URL(server.endpoint);
              endpointUrl = `${url.origin}/${server.apiKey}/mcp`;
            } else {
              // API key in Authorization header (default)
              endpointUrl = server.endpoint;
              transportOptions.requestInit = {
                headers: {
                  Authorization: `Bearer ${server.apiKey}`,
                  'Content-Type': 'application/json',
                },
              };
            }
          } else {
            endpointUrl = server.endpoint;
          }

          transport = new StreamableHTTPClientTransport(new URL(endpointUrl), transportOptions);
        }

        const client = await experimental_createMCPClient({
          transport,
        });

        this.clientManager.clients.set(server.id, client);
      } catch (error) {
        console.error(`Failed to initialize MCP server ${server.name}:`, error);
      }
    }

    this.servers = enabledServers;
    await this.rebuildTools();
  }

  private async rebuildTools(): Promise<void> {
    this.clientManager.tools = {};

    const clientsArray = Array.from(this.clientManager.clients.values());
    for (const client of clientsArray) {
      try {
        const tools = await client.tools();
        this.clientManager.tools = {
          ...this.clientManager.tools,
          ...tools,
        };
      } catch (error) {
        console.error('Error fetching tools from MCP client:', error);
      }
    }
  }

  getClients(): Map<string, any> {
    return this.clientManager.clients;
  }

  getClient(serverId: string) {
    return this.clientManager.clients.get(serverId);
  }

  getTools() {
    return Object.keys(this.clientManager.tools).length > 0 ? this.clientManager.tools : [];
  }

  isReady(): boolean {
    return this.clientManager.clients.size > 0;
  }

  hasTools(): boolean {
    return Object.keys(this.clientManager.tools).length > 0;
  }

  async getServerStatus(): Promise<{
    serverId: string;
    name: string;
    connected: boolean;
    toolCount: number;
    transportType: string;
  }[]> {
    return Promise.all(this.servers.map(async server => {
      const client = this.clientManager.clients.get(server.id);
      let toolCount = 0;
      if (client && typeof client.tools === 'function') {
        try {
          const tools = await client.tools();
          toolCount = Array.isArray(tools) ? tools.length : 0;
        } catch (error) {
          console.error(`Error fetching tools for server ${server.name}:`, error);
        }
      }
      return {
        serverId: server.id,
        name: server.name,
        connected: !!client,
        toolCount,
        transportType: server.transportType || 'streamableHttp',
      };
    });
  }

  async cleanup(serverIds?: string[]): Promise<void> {
    const clientsToClose = serverIds
      ? serverIds.map(id => this.clientManager.clients.get(id)).filter(Boolean)
      : Array.from(this.clientManager.clients.values());

    for (const client of clientsToClose) {
      try {
        if (client && typeof client.close === 'function') {
          await client.close();
        }
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
    }

    if (serverIds) {
      // Remove specific clients
      for (const serverId of serverIds) {
        this.clientManager.clients.delete(serverId);
      }
      // Rebuild tools from remaining clients
      await this.rebuildTools();
    } else {
      // Clean up everything
      this.clientManager.clients.clear();
      this.clientManager.tools = {};
    }
  }
}

export const mcpIntegration = new MCPIntegration();
