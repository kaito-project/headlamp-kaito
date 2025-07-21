---
sidebar_position: 4
---

# Testing your MCP Server

Before connecting your MCP server to Headlamp-KAITO, it's recommended to test it independently to ensure it's working correctly. This guide provides a complete walkthrough for testing a Kubernetes MCP Server using the MCP Inspector UI.

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

[Download kubernetes-mcp-0.1.0.tgz](../../kubernetes-mcp-0.1.0.tgz) and install with:

```bash
helm install kubernetes-mcp ./kubernetes-mcp-0.1.0.tgz
```

After completing this step, proceed directly to [Step&nbsp;2: Deploy Kubernetes MCP Server](#2-deploy-kubernetes-mcp-server) on this page. If you experience any issues, manually apply the RBAC configuration files by following steps a, b, and c below.

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

The Kubernetes MCP Server handles AI tool requests and must be deployed using the `mcp-service` account created above.

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
          image: YOUR_DOCKER_USERNAME/kubernetes-mcp-server:latest
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
  selector:
    app: kubernetes-mcp-server
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
```

<div style={{background: '#ADD8E6', padding: '1em', borderRadius: '6px', marginRight: '1em'}}>

**Note about the container image**

- The line `image: YOUR_DOCKER_USERNAME/kubernetes-mcp-server:latest` refers to a Docker image that must be available in a container registry like DockerHub. To host your own Docker image like this example, see the following steps:

  1. Fork or clone the repo here https://github.com/manusa/kubernetes-mcp-server?tab=readme-ov-file

     ```
     git clone git@github.com:manusa/kubernetes-mcp-server.git
     cd kubernetes-mcp-server
     ```

  2. Build your Docker image locally. (Must have Docker desktop running in the background)

     ```
     docker build -t YOUR_DOCKER_USERNAME/kubernetes-mcp-server:latest .
     ```

  3. Push it to DockerHub (or another registry)

     ```
     docker push YOUR_DOCKER_USERNAME/kubernetes-mcp-server:latest
     ```

  4. You're ready to use your image in your Kubernetes manifest in `kubernetes-mcp-server.yaml`!

     ```
     image: YOUR_DOCKER_USERNAME/kubernetes-mcp-server:latest
     ```

</div>

Apply and restart:

```bash
kubectl apply -f kubernetes-mcp-server.yaml
kubectl rollout restart deployment kubernetes-mcp-server
```

## 3. Deploy MCP Inspector

The Inspector MCP is a UI client that connects to the MCP server. It does not need Kubernetes API access, so it does not require a service account or RBAC.

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
          env:
            - name: MCP_URL
              value: 'http://kubernetes-mcp-server:8080/mcp'
            - name: HOST
              value: '0.0.0.0'
            - name: ALLOWED_ORIGINS
              value: 'http://20.83.66.22:6274'
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

Apply and restart:

```bash
kubectl apply -f mcp-inspector.yaml
kubectl rollout restart deployment mcp-inspector
```

Then run

```
kubectl logs deployment/mcp-inspector
```

and you will see something like this:

```
Starting MCP inspector...
⚙️ Proxy server listening on 0.0.0.0:6277
🔑 Session token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Use this token to authenticate requests or set DANGEROUSLY_OMIT_AUTH=true to disable auth

🚀 MCP Inspector is up and running at:
   http://0.0.0.0:6274/?MCP_PROXY_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then get the external IP by running:

```bash
kubectl get service mcp-inspector
```

Your output should look like this:

```
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)                         AGE
mcp-inspector   LoadBalancer   10.0.211.173   20.83.66.22   6274:30572/TCP,6277:32271/TCP   5d10h
```

Navigate to

```
http://<external_ip>:<port>/?MCP_PROXY_AUTH_TOKEN=<token>
```

for example:

```
http://20.83.66.22:6274/?MCP_PROXY_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#tools
```

## 5. Testing

In the in the browser Inspector UI:

1. Connect to the MCP server via

- Transport Type: `StreamableHTTP`
- URL: `http://kubernetes-mcp-server:8080/mcp`
- Click Connect

2. Navigate to Tools (on the same line as Resources)

- Run the `pods_list` tool

3. You should see live pod data returned via the MCP server.

If you get a "forbidden" error, confirm that:

- The MCP server pod is using the kubernetes-mcp service account
- All three RBAC YAMLs have been applied correctly

## Next Steps: Integrating with Headlamp-KAITO

Once your MCP server is successfully responding to tool calls in the Inspector UI, you can proceed to integrate it with Headlamp-KAITO:

### 1. Connect to Headlamp-KAITO

1. Open Headlamp-KAITO and navigate to a chat interface with a tool-enabled model (Llama models)
2. Click the **MCP Chip** in the chat header to open the MCP Server Management interface
3. Add your MCP server using the endpoint URL: `http://kubernetes-mcp-server:8080/mcp`

### 2. Configuration Tips

- **Server Name**: Use a descriptive name like "Kubernetes Tools"
- **Endpoint URL**: Use the internal Kubernetes service URL for cluster-deployed servers
- **Authentication**: Configure if your server requires API keys
- **Transport**: Ensure your server supports streamableHTTP transport

### 3. Validation

After adding your server to Headlamp-KAITO:

- Verify the server shows as "connected" with a green indicator
- Check that tools are discovered and listed
- Test tool execution through chat interactions

For detailed integration instructions, see the [MCP Tool Calling](./mcp-tool-calling.md) documentation.
