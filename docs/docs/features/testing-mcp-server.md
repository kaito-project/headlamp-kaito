---
sidebar_position: 4
---

# Testing your MCP Server

## MCP Kubernetes Integration Guide (with RBAC)

This guide walks you through deploying the MCP Inspector UI and Kubernetes MCP Server inside a Kubernetes cluster role-based access control (RBAC)-based access to the Kubernetes API.

## Prerequisites

- A working Kubernetes cluster (e.g., AKS, EKS, GKE, or Minikube)
- kubectl configured for the cluster

## 1. Create a Service Account and RBAC for the Kubernetes MCP Server

The kubernetes-mcp service account will be used only by the Kubernetes MCP Server, allowing it to read basic cluster resources via the Kubernetes API.

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

The MCP Server is responsible for handling tool execution related to the Kubernetes API. It must run using the kubernetes-mcp service account defined above.

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
          image: chloe608/kubernetes-mcp-server:latest
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

Apply and restart:

```bash
kubectl apply -f kubernetes-mcp-server.yaml
kubectl rollout restart deployment kubernetes-mcp-server
```

## 3. Deploy MCP Inspector UI (No RBAC Required)

The Inspector UI is just a client that connects to the MCP server. It does not need Kubernetes API access, so it does not require a service account or RBAC.

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
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-inspector
spec:
  selector:
    app: mcp-inspector
  ports:
    - protocol: TCP
      port: 6274
      targetPort: 6274
```

Apply and restart:

```bash
kubectl apply -f mcp-inspector.yaml
kubectl rollout restart deployment mcp-inspector
```

## 4. Port Forward (for Local Testing)

```bash
kubectl port-forward deployment/mcp-inspector 6274:6274
kubectl port-forward deployment/kubernetes-mcp-server 6277:8080
```

Then open:

```
http://localhost:6274
```

And set the MCP server endpoint to:

```bash
http://localhost:6277/mcp
```

## 5. Testing

In the Inspector UI:

1. Select the MCP server
2. Run the pods_list tool
3. You should see live pod data returned via the MCP server.

If you get a "forbidden" error, confirm that:

- The MCP server pod is using the kubernetes-mcp service account
- All three RBAC YAMLs have been applied correctly
