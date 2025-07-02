const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/mcp', async (req, res) => {
  try {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const { StreamableHTTPServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    const { z } = await import('zod');

    const server = new McpServer({
      name: 'test-headlamp-server',
      version: '1.0.0',
    });

    server.tool(
      'get-kubernetes-info',
      'Get information about Kubernetes resources',
      {
        resourceType: z.string().describe('Type of Kubernetes resource (pods, services, etc.)'),
        namespace: z.string().optional().describe('Kubernetes namespace'),
      },
      async ({ resourceType, namespace }) => {
        return {
          content: [
            {
              type: 'text',
              text: `Here is information about ${resourceType} in namespace ${
                namespace || 'default'
              }:`,
            },
            {
              type: 'text',
              text: `This is a mock response from the MCP server for demonstration purposes.`,
            },
            {
              type: 'text',
              text: `In a real implementation, this would query the Kubernetes API.`,
            },
          ],
        };
      }
    );

    server.tool(
      'get-pod-logs',
      'Get logs from a Kubernetes pod',
      {
        podName: z.string().describe('Name of the pod'),
        namespace: z.string().optional().describe('Kubernetes namespace'),
        lines: z.number().optional().describe('Number of log lines to return'),
      },
      async ({ podName, namespace, lines }) => {
        const logLines = lines || 10;
        return {
          content: [
            {
              type: 'text',
              text: `Logs for pod ${podName} in namespace ${
                namespace || 'default'
              } (last ${logLines} lines):`,
            },
            {
              type: 'text',
              text: `2025-01-02T10:30:00Z INFO Starting application...`,
            },
            {
              type: 'text',
              text: `2025-01-02T10:30:01Z INFO Server listening on port 8080`,
            },
            {
              type: 'text',
              text: `2025-01-02T10:30:02Z INFO Health check endpoint ready`,
            },
          ],
        };
      }
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', (req, res) => {
  console.log('Received GET MCP request');
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed.',
    },
    id: null,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'test-headlamp-mcp-server' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test MCP server running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

process.on('SIGINT', () => {
  console.log('Shutting down test MCP server...');
  process.exit(0);
});
