---
sidebar_position: 3
---

# Tool Calling

Tool calling enables AI models to interact with external systems and execute functions beyond text generation. Headlamp-KAITO integrates with the Model Context Protocol (MCP) to provide powerful tool-calling capabilities directly within your Kubernetes environment.

## Overview

Tool calling allows AI models to:

- **Execute Functions**: Call predefined functions with structured parameters
- **Access External APIs**: Interact with external services and databases
- **Perform Actions**: Execute system commands and operations
- **Retrieve Real-time Data**: Access live data from various sources

### Model Context Protocol (MCP) Integration

Headlamp-KAITO leverages MCP to provide standardized tool calling:

```typescript
// MCP Server Configuration
const mcpConfig = {
  servers: {
    filesystem: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '/workspace'],
      env: {},
    },
    kubernetes: {
      command: 'mcp-server-kubernetes',
      args: ['--namespace', 'default'],
      env: {
        KUBECONFIG: '/etc/kubernetes/config',
      },
    },
  },
};
```

## Supported Tool Categories

### File System Operations

Access and manipulate files within the workspace:

```json
{
  "name": "read_file",
  "description": "Read contents of a file",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Path to the file to read"
      }
    },
    "required": ["path"]
  }
}
```

### Kubernetes Operations

Interact with Kubernetes resources:

```json
{
  "name": "get_pods",
  "description": "List pods in a namespace",
  "parameters": {
    "type": "object",
    "properties": {
      "namespace": {
        "type": "string",
        "description": "Kubernetes namespace"
      },
      "labelSelector": {
        "type": "string",
        "description": "Label selector for filtering"
      }
    }
  }
}
```

### Database Queries

Execute database operations:

```json
{
  "name": "sql_query",
  "description": "Execute SQL query",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "SQL query to execute"
      },
      "database": {
        "type": "string",
        "description": "Database connection name"
      }
    },
    "required": ["query"]
  }
}
```

## Model Compatibility

### Tool-Enabled Models

Not all models support tool calling. Headlamp-KAITO provides visual indicators for tool-capable models:

| Model    | Tool Support | Indicator                  |
| -------- | ------------ | -------------------------- |
| GPT-4    | ✅           | 🔧 Build icon with tooltip |
| Claude-3 | ✅           | 🔧 Build icon with tooltip |
| Llama-3  | ✅           | 🔧 Build icon with tooltip |
| Phi-3    | ❌           | Standard model icon        |
| Falcon   | ❌           | Standard model icon        |

### Configuration for Tool Calling

Enable tool calling in your workspace configuration:

```yaml
apiVersion: kaito.sh/v1beta1
kind: Workspace
metadata:
  name: tool-enabled-workspace
spec:
  resource:
    instanceType: 'Standard_NC24ads_A100_v4'
  inference:
    preset:
      name: 'gpt-4'
    presetOptions:
      toolCalling: true
      mcpServers:
        - name: 'filesystem'
          enabled: true
        - name: 'kubernetes'
          enabled: true
```

## MCP Server Management

### Built-in MCP Servers

Headlamp-KAITO includes several pre-configured MCP servers:

#### Filesystem Server

```typescript
const filesystemServer = {
  name: 'filesystem',
  description: 'File system operations',
  tools: ['read_file', 'write_file', 'list_directory', 'search_files'],
};
```

#### Kubernetes Server

```typescript
const kubernetesServer = {
  name: 'kubernetes',
  description: 'Kubernetes cluster operations',
  tools: ['get_pods', 'get_services', 'get_deployments', 'apply_manifest', 'delete_resource'],
};
```

#### Database Server

```typescript
const databaseServer = {
  name: 'database',
  description: 'Database operations',
  tools: ['sql_query', 'list_tables', 'describe_table', 'execute_procedure'],
};
```

### Custom MCP Servers

Create custom MCP servers for specific use cases:

```typescript
// Custom API Server
const apiServer = {
  name: 'custom-api',
  command: 'node',
  args: ['./custom-mcp-server.js'],
  env: {
    API_KEY: process.env.API_KEY,
    BASE_URL: 'https://api.example.com',
  },
  tools: [
    {
      name: 'fetch_user_data',
      description: 'Fetch user data from API',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User ID to fetch',
          },
        },
        required: ['userId'],
      },
    },
  ],
};
```

## Chat Interface Integration

### Tool Selection

In the chat interface, users can:

1. **View Available Tools**: See all available tools from connected MCP servers
2. **Tool Indicators**: Visual indicators show which models support tools
3. **Real-time Execution**: Watch tools execute in real-time during conversations

### Example Conversation

AI: I'll list the pods in the default namespace for you.

🔧 **Calling tool: get_pods**

<!-- Parameters: {"namespace": "default"} -->

**Tool Response:**

```
NAME                           READY   STATUS    RESTARTS   AGE
workspace-phi-3-5-mini-0       1/1     Running   0          2h
kaito-controller-manager-xyz   1/1     Running   0          1d
gpu-provisioner-abc           1/1     Running   0          1d
```

I found 3 pods running in the default namespace:

- **workspace-phi-3-5-mini-0**: Your AI model inference pod
- **kaito-controller-manager-xyz**: The KAITO controller
- **gpu-provisioner-abc**: The GPU provisioning controller

All pods are in Running status. Would you like more details about any specific pod?

````

### Tool Execution Feedback

The chat interface provides rich feedback during tool execution:

- **🔧 Tool Indicator**: Shows when a tool is being called
- **Parameters Display**: Shows the parameters being passed to the tool
- **Real-time Status**: Live updates during tool execution
- **Results Integration**: Tool results are seamlessly integrated into the conversation

## Security and Permissions

### RBAC Integration

Tool calling respects Kubernetes RBAC permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: mcp-server-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["kaito.sh"]
  resources: ["workspaces"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
````

### Tool Access Control

Control which tools are available to different users:

```yaml
# MCP Server Configuration with Access Control
mcpServers:
  filesystem:
    enabled: true
    allowedPaths: ['/workspace', '/tmp']
    permissions: ['read', 'write']
  kubernetes:
    enabled: true
    allowedNamespaces: ['default', 'kaito-system']
    permissions: ['get', 'list']
  database:
    enabled: false # Disabled for security
```

## Performance Optimization

### Tool Caching

Implement caching for frequently called tools:

```typescript
// Tool result caching
const toolCache = new Map();

async function callTool(toolName, parameters) {
  const cacheKey = `${toolName}:${JSON.stringify(parameters)}`;

  if (toolCache.has(cacheKey)) {
    return toolCache.get(cacheKey);
  }

  const result = await executeTool(toolName, parameters);
  toolCache.set(cacheKey, result);

  return result;
}
```

### Batch Operations

Group related tool calls for efficiency:

```typescript
// Batch Kubernetes operations
async function batchKubernetesOperations(operations) {
  const results = await Promise.all(operations.map(op => callTool(op.tool, op.parameters)));

  return results;
}
```

## Troubleshooting

### Common Issues

#### Tool Not Found

```
Error: Tool 'custom_tool' not found
Solution: Verify MCP server is running and tool is registered
```

#### Permission Denied

```
Error: Insufficient permissions to execute 'get_pods'
Solution: Check RBAC permissions for the service account
```

#### Tool Timeout

```
Error: Tool execution timeout after 30s
Solution: Increase timeout or optimize tool implementation
```

### Debugging Tools

Enable debug logging for tool calls:

```typescript
// Debug configuration
const mcpConfig = {
  debug: true,
  logLevel: 'verbose',
  timeout: 30000,
};
```

Monitor tool execution:

```bash
# View MCP server logs
kubectl logs -f deployment/mcp-server

# Check tool call metrics
kubectl get events --field-selector reason=ToolCall
```

## Best Practices

### Tool Design

- **Clear Descriptions**: Provide clear, detailed descriptions for each tool
- **Parameter Validation**: Validate all input parameters
- **Error Handling**: Implement robust error handling and recovery
- **Documentation**: Document expected inputs and outputs

### Security

- **Principle of Least Privilege**: Grant minimal necessary permissions
- **Input Sanitization**: Sanitize all tool inputs to prevent injection attacks
- **Audit Logging**: Log all tool executions for security auditing
- **Rate Limiting**: Implement rate limiting for resource-intensive tools

### Performance

- **Caching**: Cache results when appropriate
- **Async Operations**: Use asynchronous operations for better performance
- **Resource Limits**: Set appropriate resource limits for tool execution
- **Monitoring**: Monitor tool performance and resource usage

## Integration Examples

### CI/CD Integration

Use tool calling for CI/CD operations:

```
User: Deploy the latest version of my application

AI: I'll help you deploy the latest version. Let me check the current deployment and update it.

🔧 **Calling tool: get_deployment**
Parameters: {"name": "my-app", "namespace": "production"}

🔧 **Calling tool: update_deployment**
Parameters: {"name": "my-app", "image": "my-app:latest", "namespace": "production"}

Deployment updated successfully! The new version is rolling out now.
```

### Monitoring and Observability

Use tools for system monitoring:

```
User: What's the health status of my workspaces?

AI: Let me check the status of all your KAITO workspaces.

🔧 **Calling tool: get_workspaces**
Parameters: {"namespace": "default"}

🔧 **Calling tool: get_pod_metrics**
Parameters: {"labelSelector": "app=kaito-workspace"}

All your workspaces are healthy:
- **workspace-phi-3-5**: Running, CPU: 45%, Memory: 2.1GB
- **workspace-llama-2**: Running, CPU: 67%, Memory: 3.8GB

GPU utilization is optimal across all workspaces.
```

This powerful tool calling system transforms Headlamp-KAITO from a simple chat interface into a comprehensive AI-powered Kubernetes management platform.
Assistant: Sure, I can help with that. Just to confirm, you want to list all the pods in the Kubernetes default namespace, correct?
User: Yes, please.
Assistant: Great! Executing the command to list the pods now.

```

```
