import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { experimental_createMCPClient } from 'ai';

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

export interface MCPServerStatusEvent {
  type: 'status-changed';
  serverStatus: {
    serverId: string;
    name: string;
    connected: boolean;
    toolCount: number;
    transportType: string;
  }[];
}

export type MCPEventListener = (event: MCPServerStatusEvent) => void;

export class MCPIntegration {
  private clientManager: MCPClientManager;
  private servers: MCPServer[];
  private eventListeners: Set<MCPEventListener> = new Set();
  private lastServerStatus: {
    serverId: string;
    name: string;
    connected: boolean;
    toolCount: number;
    transportType: string;
  }[] = [];

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
        const transportType = server.transportType || 'streamableHttp';

        if (transportType === 'sse') {
          // SSE Transport
          let endpointUrl: string;
          let eventSourceInit: EventSourceInit = {};
          const requestInit: RequestInit = {};

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
          const transportOptions: { requestInit?: RequestInit } = {};

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

    await this.emitStatusChangeEvent();
  }

  private async emitStatusChangeEvent(): Promise<void> {
    const currentStatus = await this.getServerStatus();

    const hasChanged = this.hasStatusChanged(this.lastServerStatus, currentStatus);

    if (hasChanged) {
      this.lastServerStatus = currentStatus;
      const event: MCPServerStatusEvent = {
        type: 'status-changed',
        serverStatus: currentStatus,
      };

      this.eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in MCP event listener:', error);
        }
      });
    }
  }

  private hasStatusChanged(
    oldStatus: { serverId: string; connected: boolean; toolCount: number; transportType: string }[],
    newStatus: { serverId: string; connected: boolean; toolCount: number; transportType: string }[]
  ): boolean {
    if (oldStatus.length !== newStatus.length) return true;

    for (let i = 0; i < oldStatus.length; i++) {
      const old = oldStatus[i];
      const newItem = newStatus.find(s => s.serverId === old.serverId);

      if (!newItem || old.connected !== newItem.connected || old.toolCount !== newItem.toolCount) {
        return true;
      }
    }

    return false;
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

  addEventListener(listener: MCPEventListener): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: MCPEventListener): void {
    this.eventListeners.delete(listener);
  }

  async getServerStatus(): Promise<
    {
      serverId: string;
      name: string;
      connected: boolean;
      toolCount: number;
      transportType: string;
    }[]
  > {
    return Promise.all(
      this.servers.map(async server => {
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
      })
    );
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
      for (const serverId of serverIds) {
        this.clientManager.clients.delete(serverId);
      }
      await this.rebuildTools();
    } else {
      this.clientManager.clients.clear();
      this.clientManager.tools = {};
      this.lastServerStatus = [];
    }

    await this.emitStatusChangeEvent();
  }
}

export const mcpIntegration = new MCPIntegration();
