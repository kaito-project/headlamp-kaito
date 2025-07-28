---
sidebar_position: 4
---

# Testing your MCP Server

Before connecting your MCP server to Headlamp-KAITO, it's recommended to test it independently to ensure it's working correctly. This guide provides a complete walkthrough for testing a Kubernetes MCP Server using the MCP Inspector UI.
> **Note:** Headlamp-KAITO allows you to test MCP Server tool calling support, but does not currently support deploying MCP servers to your cluster. Deployment support is coming soon!

## Why Test Your MCP Server First?

Testing your MCP server outside of Headlamp-KAITO helps you:

- **Verify Server Functionality**: Ensure your MCP server responds correctly to tool calls
- **Debug Connection Issues**: Isolate network and authentication problems
- **Validate Tool Responses**: Confirm that tools return expected data
- **Test RBAC Permissions**: Verify Kubernetes API access works properly

Once your MCP server passes these tests, you can confidently connect it to Headlamp-KAITO via the [MCP Tool Calling](./mcp-tool-calling.md) interface.

## MCP Kubernetes Integration Guide (with RBAC)

This guide walks you through deploying the MCP Inspector UI and Kubernetes MCP Server inside a Kubernetes cluster with role-based access control (RBAC)-based access to the Kubernetes API.

## Prerequisites

- A working Kubernetes cluster (e.g., AKS, EKS, GKE, or Minikube)
- kubectl configured for the cluster

## 1. Create a Service Account and RBAC for the Kubernetes MCP Server

The kubernetes-mcp service account will be used only by the Kubernetes MCP Server, allowing it to read basic cluster resources via the Kubernetes API.

[Download kubernetes-mcp-0.1.0.zip](/kubernetes-mcp-0.1.0.zip) and install with:

```bash
# Extract the zip file
unzip kubernetes-mcp-0.1.0.zip
# Install using Helm
helm install kubernetes-mcp ./kubernetes-mcp
```

After completing this step, proceed directly to **[Step&nbsp;2: Deploy Kubernetes MCP Server](#2-deploy-kubernetes-mcp-server)** on this page. If you experience any issues, manually apply the RBAC configuration files by following steps a, b, and c below.

### a. mcp-serviceaccount.yaml

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubernetes-mcp
  namespace: default
```

### b. mcp-clusterrole.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubernetes-mcp-role
rules:
  - apiGroups: ['']
    resources: ['pods', 'services', 'nodes']
    verbs: ['get', 'list', 'watch']
  - apiGroups: ['apps']
    resources: ['deployments']
    verbs: ['get', 'list', 'watch']
```

### c. mcp-clusterrolebinding.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubernetes-mcp-binding
subjects:
  - kind: ServiceAccount
    name: kubernetes-mcp
    namespace: default
roleRef:
  kind: ClusterRole
  name: kubernetes-mcp-role
  apiGroup: rbac.authorization.k8s.io
```

Apply all:

```bash
kubectl apply -f mcp-serviceaccount.yaml
kubectl apply -f mcp-clusterrole.yaml
kubectl apply -f mcp-clusterrolebinding.yaml
```

## 2. Deploy Kubernetes MCP Server

The Kubernetes MCP Server handles AI tool requests and must be deployed using the `kubernetes-mcp` account created above.

### kubernetes-mcp-server.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubernetes-mcp-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kubernetes-mcp-server
  template:
    metadata:
      labels:
        app: kubernetes-mcp-server
    spec:
      serviceAccountName: kubernetes-mcp
      automountServiceAccountToken: true
      containers:
        - name: mcp
          image: ghcr.io/kaito-project/headlamp-kaito/kubernetes-mcp-server:latest
          ports:
            - containerPort: 8080
          env:
            - name: HOST
              value: '0.0.0.0'
            - name: PORT
              value: '8080'
            - name: ALLOWED_ORIGINS
              value: "*"
---
apiVersion: v1
kind: Service
metadata:
  name: kubernetes-mcp-server
spec:
  selector:
    app: kubernetes-mcp-server
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
```

## 3. Deploy MCP Inspector

The MCP Inspector is a UI client that connects to an MCP server. It does not need Kubernetes API access, so it does not require a service account or RBAC.

### mcp-inspector.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-inspector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mcp-inspector
  template:
    metadata:
      labels:
        app: mcp-inspector
    spec:
      containers:
        - name: mcp-inspector
          image: ghcr.io/modelcontextprotocol/inspector:latest
          ports:
            - containerPort: 6274
            - containerPort: 6277
          env:
            - name: MCP_URL
              value: 'http://kubernetes-mcp-server:8080/mcp'
            - name: HOST
              value: '0.0.0.0'
            - name: PORT
              value: '6277'
            - name: DANGEROUSLY_OMIT_AUTH
              value: 'true'
            - name: ALLOWED_ORIGINS
              value: 'http://localhost:6274'
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-inspector
spec:
  selector:
    app: mcp-inspector
  ports:
    - name: ui
      protocol: TCP
      port: 6274
      targetPort: 6274
    - name: proxy
      protocol: TCP
      port: 6277
      targetPort: 6277
```

Apply and restart:

```bash
kubectl apply -f mcp-inspector.yaml
kubectl rollout restart deployment mcp-inspector
```
To see the status of your pod services, run:
```
kubectl run service
```

Then port-forward the MCP-Inspector to a local port:

```
kubectl port-forward service/mcp-inspector 6274:6274 6277:6277
```

Once that is running, navigate to

```
http://localhost:6274/
```
**Note**: Port forwarding only works while the command is running and only from the machine running the command.

## 5. Testing

In the in the browser Inspector UI:

1. Connect to the MCP server via

- Transport Type: `StreamableHTTP`
- URL: `http://kubernetes-mcp-server:8080/mcp`
- Click Connect

2. Navigate to Tools (on the same line as Resources), click List Tools to see what tools the connected MCP offers (in this case, the Kubernetes MCP server).

- Try running the `pods_list` tool

3. You should see live pod data returned via the Kubernetes MCP server.

If you get a "forbidden" error, confirm that:

- The MCP server pod is using the kubernetes-mcp service account
- Port forwarding is currently running in terminal

## Next Steps: Integrating with Headlamp-KAITO

Once your MCP server is successfully responding to tool calls in the Inspector UI, you can proceed to integrate it with Headlamp-KAITO:

**Network connectivity depends on how Headlamp was installed:**

- **Headlamp running inside Kubernetes** ([in-cluster installation](https://headlamp.dev/docs/latest/installation/in-cluster)): Can use internal service names (See Option 1)
- **Headlamp running outside Kubernetes** (desktop app, external web service): Must use external access methods (See Option 2)

### Option 1: Internal Service Access (Headlamp Installed In-Cluster)

If Headlamp is deployed inside the same Kubernetes cluster using the [in-cluster installation](https://headlamp.dev/docs/latest/installation/in-cluster), you can use internal service names directly:

```
http://kubernetes-mcp-server:8080/mcp
```

Or the full FQDN:
```
http://kubernetes-mcp-server.default.svc.cluster.local:8080/mcp
```

**Requirements**: 
- Headlamp deployed as a Kubernetes workload in the same cluster as the Kubernetes MCP and MCP Inspector  
- Both services in the same namespace, or use full FQDN for cross-namespace access

### Option 2: LoadBalancer Service (Headlamp Intalled as External/Browser App)

:::warning
Security Risks with LoadBalancer Service

Using `type: LoadBalancer` exposes your MCP server directly to the internet without authentication. This means:
- Anyone can access your Kubernetes cluster data through the MCP server
- No built-in rate limiting or access controls
- Potential exposure of sensitive cluster information

**Recommendations:**
- Use LoadBalancer only in development/testing environments
- For production: Use port-forwarding, ingress with authentication, or VPN access
- Consider adding authentication to your MCP server
- Restrict access using network policies or firewall rules

:::

Update your `kubernetes-mcp-server.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubernetes-mcp-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kubernetes-mcp-server
  template:
    metadata:
      labels:
        app: kubernetes-mcp-server
    spec:
      serviceAccountName: kubernetes-mcp
      automountServiceAccountToken: true
      containers:
        - name: mcp
          image: ghcr.io/kaito-project/headlamp-kaito/kubernetes-mcp-server:latest
          ports:
            - containerPort: 8080
          env:
            - name: ENABLE_UNSAFE_SSE_TRANSPORT
              value: '1'
            - name: HOST
              value: '0.0.0.0'
            - name: PORT
              value: '8080'
            - name: DANGEROUSLY_OMIT_AUTH
              value: 'true'
            - name: ALLOWED_ORIGINS
              value: '*'
---
apiVersion: v1
kind: Service
metadata:
  name: kubernetes-mcp-server
spec:
  type: LoadBalancer
  selector:
    app: kubernetes-mcp-server
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
```
**Changes made:**
- env: ENABLE_UNSAFE_SSE_TRANSPORT, DANGEROUSLY_OMIT_AUTH
- Service type: LoadBalancer

Similarly, update your `mcp-inspector.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-inspector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mcp-inspector
  template:
    metadata:
      labels:
        app: mcp-inspector
    spec:
      containers:
        - name: mcp-inspector
          image: ghcr.io/modelcontextprotocol/inspector:latest
          ports:
            - containerPort: 6274
            - containerPort: 6277
          env:
            - name: MCP_URL
              value: 'http://kubernetes-mcp-server:8080/mcp'
            - name: HOST
              value: '0.0.0.0'
            - name: PORT
              value: '6277'
            - name: DANGEROUSLY_OMIT_AUTH
              value: 'true'
            - name: DISABLE_CONFIG_AUTH
              value: 'true'
            - name: NO_AUTH
              value: 'true'
            - name: ALLOWED_ORIGINS
              value: 'http://<mcp-inspector-EXTERNAL-IP>:6274,http://localhost:6274,*' # Replace <mcp-inspector-EXTERNAL-IP> with the external IP address of the mcp-inspector service
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-inspector
spec:
  type: LoadBalancer
  selector:
    app: mcp-inspector
  ports:
    - name: ui
      protocol: TCP
      port: 6274
      targetPort: 6274
    - name: proxy
      protocol: TCP
      port: 6277
      targetPort: 6277
```
Changes made: 
- env: DISABLE_CONFIG_AUTH, NO_AUTH, ALLOWED_ORIGINS
- Service type: LoadBalancer

If you're using a cloud provider (AKS, EKS, GKE), the LoadBalancer service will automatically provision an external IP. Get the external IP with:

```bash
kubectl get service
```

1. Open Headlamp-KAITO and navigate to a chat interface with a tool-enabled model (Llama models)
2. Click the **MCP Chip** in the chat header to open the MCP Server Management interface
3. Add your MCP server using the appropriate endpoint URL:
   - **LoadBalancer**: `http://kubernetes-mcp-server-EXTERNAL-IP:8080/mcp` (get external IP with `kubectl get service kubernetes-mcp-server`)

### 2. Configuration Tips

- **Server Name**: Use a descriptive name like "Kubernetes Tools"
- **Endpoint URL**: Use the external URL for LoadBalancer or localhost URL for port-forwarding
- **Authentication**: Configure if your server requires API keys
- **Transport**: Ensure your server supports streamableHTTP transport

### 3. Validation

After adding your server to Headlamp-KAITO:

- Verify the server shows as "connected" with a green indicator
- Check that tools are discovered and listed
- Test tool execution through chat interactions

For detailed integration instructions, see the [MCP Tool Calling](./mcp-tool-calling.md) documentation.
