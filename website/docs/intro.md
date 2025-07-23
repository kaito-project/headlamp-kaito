---
sidebar_position: 1
slug: /
---

# Introduction to Headlamp KAITO

**Latest Release:** [July 14th, 2025 &mdash; Headlamp-KAITO v0.0.3](https://github.com/kaito-project/headlamp-kaito/releases/tag/0.0.3)

**First Release:** [June 25th, 2025. Headlamp-KAITO v0.0.1](https://github.com/kaito-project/headlamp-kaito/releases/tag/0.0.1)

## Purpose

Headlamp-KAITO is a Headlamp plugin that enhances the [KAITO VSCode Extension](https://learn.microsoft.com/en-us/azure/aks/aks-extension-kaito) By integrating directly with Headlamp, it eliminates the need for complex CLI commands or manual YAML editing, streamlining GPU node provisioning and AI model deployment with Kubernetes. This plugin bridges Headlamp’s Kubernetes cluster management with KAITO’s AI orchestration tools, allowing users to seamlessly deploy, monitor, and interact with AI models. It also features a built-in AI chat assistant, providing a powerful, interactive experience—all within the Headlamp UI.

## Key Features

The Headlamp KAITO plugin offers the following features:

- **Modern, Intuitive Interface:** Use KAITO directly within Headlamp through a streamlined UI that removes the need for manual CLI commands and simplifies Kubernetes workflows.
- **One-click Model Deployment:** Deploy pre-validated models from the KAITO Model Catalog with a single click.
- **Automatic GPU Provisioning:** KAITO’s controller logic provisions GPU-backed nodes automatically based on model requirements.
- **Dynamic Model Discovery:** Discover available models scoped to your current Kubernetes namespace.
- **Integrated Port Forwarding:** Access deployed models effortlessly with built-in port forwarding, complete with real-time connection status and error reporting.
- **AI-powered Chat Assistant:** Receive guided assistance and user support via an embedded AI assistant within the plugin.
- **MCP Server Support for Tool Calling:** Supports MCP server connection to enable secure, scalable tool calling for advanced AI workflows and automation.

## KAITO Architecture

KAITO follows the standard Kubernetes Custom Resource Definition(CRD) controller design pattern. Users manage a `workspace` custom resource that defines GPU requirements along with inference or tuning specifications. The KAITO controllers automate deployment by continuously reconciling the desired state defined in the `workspace` custom resource.

The major components consist of:

- **Workspace controller:** Reconciles the `workspace` custom resource, creates `machine` custom resources to trigger node auto provisioning, and creates the inference or tuning workload (`deployment`, `statefulset` or `job`) based on the model preset configurations.

- **Node provisioner controller:** The controller's name is gpu-provisioner in [gpu-provisioner helm chart](https://github.com/Azure/gpu-provisioner/tree/main/charts/gpu-provisioner). It uses the `machine` CRD originated from [Karpenter](https://sigs.k8s.io/karpenter) to interact with the workspace controller. It integrates with Azure Resource Manager REST APIs to add new GPU nodes to the AKS or AKS Arc cluster.

:::note
The [gpu-provisioner](https://github.com/Azure/gpu-provisioner) is an open sourced component. It can be replaced by other controllers if they support [Karpenter-core](https://sigs.k8s.io/karpenter) APIs.
:::
