import { experimental_createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * MCP Integration with API Key Authentication Support
 *
 * Supports two authentication methods for MCP servers:
 * 1. URL Path Authentication: API key embedded in URL path (https://server/<api-key>/mcp)
 * 2. Header Authentication: API key sent in Authorization header (Bearer token)
 *
 * Based on the Model Context Protocol documentation:
 * - https://modelcontextprotocol.io/docs/concepts/transports
 *
 * Example usage:
 *
 * // Server with API key in header (default)
 * const serverWithHeader: MCPServer = {
 *   id: 'server1',
 *   name: 'My MCP Server',
 *   endpoint: 'https://api.example.com/mcp',
 *   apiKey: 'your-api-key-here',
 *   authMethod: 'header', // or omit for default
 *   enabled: true
 * };
 *
 * // Server with API key in URL path
 * const serverWithUrlAuth: MCPServer = {
 *   id: 'server2',
 *   name: 'URL Auth Server',
 *   endpoint: 'https://api.example.com',
 *   apiKey: 'your-api-key-here',
 *   authMethod: 'url',
 *   enabled: true
 * };
 *
 * // Server without authentication
 * const publicServer: MCPServer = {
 *   id: 'server3',
 *   name: 'Public Server',
 *   endpoint: 'https://public.example.com/mcp',
 *   enabled: true
 * };
 */

export interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  description?: string;
  enabled: boolean;
  apiKey?: string;
  authMethod?: 'url' | 'header';
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
        const transport = new StreamableHTTPClientTransport(new URL(endpointUrl), transportOptions);

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
    return this.servers.map(server => {
      const client = this.clientManager.clients.get(server.id);
      let toolCount = 0;
      if (client && typeof client.tools === 'function') {
        try {
          const tools = client.tools();
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
  endpoint: string,
  apiKey?: string,
  authMethod: 'url' | 'header' = 'header'
): Promise<{ valid: boolean; error?: string }> {
  try {
    let validationUrl: string;
    let headers: Record<string, string> = {};

    if (apiKey) {
      if (authMethod === 'url') {
        // API key in URL path: https://<mcp-server-address>/<api-key>/health
        const url = new URL(endpoint);
        validationUrl = `${url.origin}/${apiKey}/health`;
      } else {
        // API key in Authorization header (default)
        validationUrl = `${endpoint}/health`;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } else {
      validationUrl = `${endpoint}/health`;
    }

    const response = await fetch(validationUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return { valid: true };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        valid: false,
        error: `Server responded with ${response.status}: ${errorText}`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
