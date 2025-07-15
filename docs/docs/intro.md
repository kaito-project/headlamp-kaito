---
sidebar_position: 1
slug: /
---

# Introduction to Headlamp KAITO

**Latest Release:** July 14th, 2025. Headlamp-KAITO v0.0.3.

**First Release:** June 25th, 2025. Headlamp-KAITO v0.0.1.

## Purpose

Headlamp-KAITO enhances the [KAITO VSCode Extension](https://learn.microsoft.com/en-us/azure/aks/aks-extension-kaito) with a modern, intuitive UI built directly into Headlamp. Instead of relying on YAML or CLI workflows, this version introduces a visual experience that simplifies GPU node provisioning and model deployment for AKS users.
This plugin serves as a bridge between Headlamp's Kubernetes management capabilities and KAITO's AI workload orchestration. It transforms complex CLI and YAML-based AI model deployment workflows into an intuitive web interface that handles GPU node provisioning, model deployment, and interactive AI chat sessions.

## Integration Points

The plugin connects to several external systems to provide its functionality:

• **Headlamp Plugin API:** Provides UI framework and Kubernetes API access
• **KAITO Controller:** Manages AI workload deployments and GPU provisioning
• **Kubernetes API:** Accesses Workspace CRDs and pod management
• **GitHub Repository:** Retrieves supported model definitions
• **AI Model Endpoints:** Facilitates chat interactions through port forwarding

## Key Features

KAITO has the following key differentiations compared to most of the mainstream
model deployment methodologies built on top of virtual machine infrastructures:

• **Enhanced UI:** Interact with KAITO directly in Headlamp through a modern, intuitive interface, eliminating manual CLI steps.
• **One-click Model Deployment:** Deploy validated models from the KAITO Model Catalog with a single click.
• **Automatic GPU Provisioning:** KAITO’s controller logic provisions GPU-backed nodes automatically based on model requirements.
• **Dynamic Model Discovery:** Discover available models dynamically from within the current namespace.
• **Integrated Port Forwarding:** Built-in port forwarding with real-time connection status and error handling.
• **AI-powered Chat Assistant:** Get guided troubleshooting and user support through an integrated AI chat assistant.

## KAITO Architecture

KAITO follows the classic Kubernetes Custom Resource Definition(CRD)/controller design pattern. Users manage a `workspace` custom resource which describes the GPU requirements and the inference or tuning specification. KAITO controllers automate the deployment by reconciling the `workspace` custom resource.

The major components consist of:

• **Workspace controller:** Reconciles the `workspace` custom resource, creates `machine` custom resources to trigger node auto provisioning, and creates the inference or tuning workload (`deployment`, `statefulset` or `job`) based on the model preset configurations.

• **Node provisioner controller:** The controller's name is gpu-provisioner in [gpu-provisioner helm chart](https://github.com/Azure/gpu-provisioner/tree/main/charts/gpu-provisioner). It uses the `machine` CRD originated from [Karpenter](https://sigs.k8s.io/karpenter) to interact with the workspace controller. It integrates with Azure Resource Manager REST APIs to add new GPU nodes to the AKS or AKS Arc cluster.

:::note
The [gpu-provisioner](https://github.com/Azure/gpu-provisioner) is an open sourced component. It can be replaced by other controllers if they support [Karpenter-core](https://sigs.k8s.io/karpenter) APIs.
:::
