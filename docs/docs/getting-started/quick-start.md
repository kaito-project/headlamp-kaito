---
sidebar_position: 2
---

# Quick Start

After installing the headlamp-kaito plugin, you can quickly deploy and interact with AI models through Headlamp's intuitive interface.

## Prerequisites

Before starting, ensure you have:

- **Headlamp** installed with the headlamp-kaito plugin enabled
- **A Kubernetes cluster** with the KAITO controller deployed
- **Sufficient GPU resources** (Standard_NC24ads_A100_v4 or Standard_NC96ads_A100_v4 instances)

## Step 1: Explore the Model Catalog

### Model Catalog Features

The model catalog provides filtering and search capabilities:

| Feature         | Description                               |
| --------------- | ----------------------------------------- |
| Search          | Filter models by name                     |
| Category Filter | Filter by company (Meta, Microsoft, etc.) |
| Pagination      | Navigate through model pages              |

## Step 2: Deploy Your First Model

### Deploying a Model

1. **Select a model** from the catalog based on your requirements
2. **Click "Deploy"** to open the YAML editor dialog
3. **Review the generated Workspace YAML** which includes:
   - `instanceType` (automatically selected based on model size)
   - `preset.name` (the model identifier)
   - `presetOptions` (for models requiring access tokens)
4. **Modify the YAML** if needed (namespace, resource requests, etc.)
5. **Click "Apply"** to deploy the Workspace resource to Kubernetes

### Workspace Status Indicators

The workspace list displays critical status information:

| Column              | Description            | Status Logic                            |
| ------------------- | ---------------------- | --------------------------------------- |
| Resource Ready      | GPU nodes provisioned  | condition.status === 'True' → Green     |
| Inference Ready     | Model pods running     | condition.status === 'False' → Red      |
| Job Started         | Deployment job active  | condition.status === 'Unknown' → Yellow |
| Workspace Succeeded | Overall success status | Tooltip shows condition.message         |

## Step 3: Chat with Deployed Model

Once your workspace shows "Inference Ready", you can interact with the model through the chat interface.

### Starting a Chat Session

1. Navigate to `/kaito/chat` or click the chat icon in the workspace detail view
2. Select a workspace from the dropdown (if not already selected)
3. Wait for port forwarding to establish connection to the model pod

### Chat Interface Features

The ChatUI component provides a full-featured chat experience:

| Feature           | Description                  | Implementation                          |
| ----------------- | ---------------------------- | --------------------------------------- |
| Message Streaming | Real-time response display   | streamText() with textStream            |
| Model Selection   | Choose from available models | Autocomplete with /v1/models data       |
| Message History   | Conversation persistence     | messages state array                    |
| Markdown Support  | Rich text formatting         | ReactMarkdown component                 |
| Error Handling    | Fallback responses           | Try-catch with connection timeout logic |

## Legacy CLI Method (Optional)

For users familiar with kubectl, you can also deploy models using YAML:

```yaml title="phi-3.5-workspace.yaml"
apiVersion: kaito.sh/v1beta1
kind: Workspace
metadata:
  name: workspace-phi-3-5-mini
resource:
  instanceType: 'Standard_NC24ads_A100_v4'
  labelSelector:
    matchLabels:
      apps: phi-3-5
inference:
  preset:
    name: phi-3.5-mini-instruct
```

Apply this configuration to your cluster:

```bash
kubectl apply -f phi-3.5-workspace.yaml
```

### Monitor Deployment

Track the workspace status to see when the model has been deployed successfully:

```bash
kubectl get workspace workspace-phi-3-5-mini
```

When the `WORKSPACEREADY` column becomes `True`, the model has been deployed successfully:

```
NAME                     INSTANCE                   RESOURCEREADY   INFERENCEREADY   JOBSTARTED   WORKSPACESUCCEEDED   AGE
workspace-phi-3-5-mini   Standard_NC24ads_A100_v4   True            True                          True                 4h15m
```

### Test the Model

Find the inference service's cluster IP and test it using a temporary curl pod:

```bash
# Get the service endpoint
kubectl get svc workspace-phi-3-5-mini
export CLUSTERIP=$(kubectl get svc workspace-phi-3-5-mini -o jsonpath="{.spec.clusterIPs[0]}")
```

#### List available models

```bash
kubectl run -it --rm --restart=Never curl --image=curlimages/curl -- curl -s http://$CLUSTERIP/v1/models | jq
```

You should see output similar to:

```json
{
  "object": "list",
  "data": [
    {
      "id": "phi-3.5-mini-instruct",
      "object": "model",
      "created": 1733370094,
      "owned_by": "vllm",
      "root": "/workspace/vllm/weights",
      "parent": null,
      "max_model_len": 16384
    }
  ]
}
```

### Make an Inference Call

Now make an inference call using the model:

```bash
kubectl run -it --rm --restart=Never curl --image=curlimages/curl -- curl -X POST http://$CLUSTERIP/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi-3.5-mini-instruct",
    "prompt": "What is kubernetes?",
    "max_tokens": 50,
    "temperature": 0
  }'
```

## Next Steps

🎉 Congratulations! You've successfully deployed and tested your first model with the headlamp-kaito plugin.

After completing this quick start:

• **Explore advanced features** in Core Features
• **Customize model settings** using the settings dialog (⚙️ icon in chat)
• **Learn about workspace configuration** in Workspace Resources
• **Understand the technical architecture** in Technical Architecture

### Additional Resources

• **Learn More:** Explore the full range of supported models in the [presets documentation](https://github.com/kaito-project/kaito/tree/main/presets)
• **Advanced Usage:** Learn about [workspace configurations](https://github.com/kaito-project/kaito/blob/main/api/v1alpha1/workspace_types.go)
• **Contributing:** See how to [contribute new models](https://github.com/kaito-project/kaito/blob/main/docs/How-to-add-new-models.md)
