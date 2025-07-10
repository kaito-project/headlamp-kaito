---
sidebar_position: 1
---

# Introduction

![Kaito Logo](/img/kaito-logo.png)

**WHAT'S NEW!**
Retrieval-augmented generation (RAG) is live! - RagEngine support with
LlamaIndex orchestration and Faiss as the default vectorDB, learn about recent updates [here](https://github.com/kaito-project/kaito/issues/734)!

**Latest Release:** July 2nd, 2025. KAITO v0.5.0.

**First Release:** Nov 15th, 2023. KAITO v0.1.0.

KAITO is an operator that automates the AI/ML model inference or tuning workload
in a Kubernetes cluster. The target models are popular open-sourced large
models such as [falcon](https://huggingface.co/tiiuae) and [phi-3](https://huggingface.co/docs/transformers/main/en/model_doc/phi3).

## Key Features

KAITO has the following key differentiations compared to most of the mainstream
model deployment methodologies built on top of virtual machine infrastructures:

• **Container-based Model Management:** Manage large model files using container images with an OpenAI-compatible server for inference calls
• **Preset Configurations:** Avoid adjusting workload parameters based on GPU hardware with built-in configurations
• **Multiple Runtime Support:** Support for popular inference runtimes including [vLLM](https://github.com/vllm-project/vllm) and [transformers](https://github.com/huggingface/transformers)
• **Auto-provisioning:** Automatically provision GPU nodes based on model requirements
• **Public Registry:** Host large model images in the public Microsoft Container Registry (MCR) when licenses allow

Using KAITO, the workflow of onboarding large AI inference models in Kubernetes is largely simplified.

## Architecture

KAITO follows the classic Kubernetes Custom Resource Definition(CRD)/controller design pattern. Users manage a `workspace` custom resource which describes the GPU requirements and the inference or tuning specification. KAITO controllers automate the deployment by reconciling the `workspace` custom resource.

The major components consist of:

• **Workspace controller:** Reconciles the `workspace` custom resource, creates `machine` custom resources to trigger node auto provisioning, and creates the inference or tuning workload (`deployment`, `statefulset` or `job`) based on the model preset configurations.

• **Node provisioner controller:** The controller's name is gpu-provisioner in [gpu-provisioner helm chart](https://github.com/Azure/gpu-provisioner/tree/main/charts/gpu-provisioner). It uses the `machine` CRD originated from [Karpenter](https://sigs.k8s.io/karpenter) to interact with the workspace controller. It integrates with Azure Resource Manager REST APIs to add new GPU nodes to the AKS or AKS Arc cluster.

:::note
The [gpu-provisioner](https://github.com/Azure/gpu-provisioner) is an open sourced component. It can be replaced by other controllers if they support [Karpenter-core](https://sigs.k8s.io/karpenter) APIs.
:::

### RAGEngine Architecture

The RAGEngine architecture overview consists of:

• **RAGEngine controller:** It reconciles the `ragengine` custom resource, creating the `RAG Service`.
• **RAG Service:** This is the service that offer Retrieval Augmented Generation support with LlamaIndex orchestration and leveraging FAISS as the vector DB.
◦ **Local Embedding:** An embedding model running locally to embed queries and documents within the vector db.
◦ **Remote Embedding:** An optional embedding model running remotely used to embed queries and documents within the vector db.
◦ **FAISS:** [Facebook AI Similarity Search](https://github.com/facebookresearch/faiss)

For more information on RAGEngine installation and usage, check the docs [here](https://kaito-project.github.io/kaito/docs/rag).

## Getting Started

👉 To get started, please see the [Installation Guide](getting-started/installation)!

👉 For a quick start tutorial, check out [Quick Start](getting-started/quick-start)!

## Community

• **GitHub:** [kaito-project/kaito](https://github.com/kaito-project/kaito)
• **Slack:** [Join our community](https://join.slack.com/t/kaito-z6a6575/shared_invite/zt-37gh89vw7-odHfqmPRc5oRnDG99SBJNA)
• **Email:** [kaito-dev@microsoft.com](mailto:kaito-dev@microsoft.com)

The command also installs all necessary dependencies you need to run Docusaurus.

## Start your site

Run the development server:

```bash
cd my-website
npm run start
```

The `cd` command changes the directory you're working with. In order to work with your newly created Docusaurus site, you'll need to navigate the terminal there.

The `npm run start` command builds your website locally and serves it through a development server, ready for you to view at http://localhost:3000/.

Open `docs/intro.md` (this page) and edit some lines: the site **reloads automatically** and displays your changes.
