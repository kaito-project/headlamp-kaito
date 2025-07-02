import { experimental_createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  description?: string;
  enabled: boolean;
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
    this.servers = servers.filter(server => server.enabled);

    await this.cleanup();
    this.clientManager.tools = {};

    for (const server of this.servers) {
      try {
        const transport = new StreamableHTTPClientTransport(new URL(server.endpoint));

        const client = await experimental_createMCPClient({
          transport,
        });

        this.clientManager.clients.set(server.id, client);

        const tools = await client.tools();

        this.clientManager.tools = {
          ...this.clientManager.tools,
          ...tools,
        };
      } catch (error) {
        console.error(`Failed to initialize MCP server ${server.name}:`, error);
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
    return Object.keys(this.clientManager.tools).length > 0 ? this.clientManager.tools : undefined;
  }

  async refreshClients(): Promise<void> {
    await this.initializeServers(this.servers);
  }

  isReady(): boolean {
    return this.clientManager.clients.size > 0;
  }

  hasTools(): boolean {
    return Object.keys(this.clientManager.tools).length > 0;
  }

  getServerStatus(): { serverId: string; name: string; connected: boolean; toolCount: number }[] {
    const totalTools = Object.keys(this.clientManager.tools).length;
    return this.servers.map(server => {
      const client = this.clientManager.clients.get(server.id);
      return {
        serverId: server.id,
        name: server.name,
        connected: !!client,
        toolCount: Math.floor(totalTools / this.servers.length),
      };
    });
  }

  async cleanup(): Promise<void> {
    for (const client of this.clientManager.clients.values()) {
      try {
        if (client && typeof client.close === 'function') {
          await client.close();
        }
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
    }
    this.clientManager.clients.clear();
    this.clientManager.tools = {};
  }
}

export const mcpIntegration = new MCPIntegration();

export async function validateMCPEndpoint(
  endpoint: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { valid: true };
    } else {
      return { valid: false, error: `Server responded with ${response.status}` };
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
