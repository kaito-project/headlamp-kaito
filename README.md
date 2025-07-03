# headlamp-kaito

Headlamp-Kaito enhances the [KAITO VSCode Extension](https://learn.microsoft.com/en-us/azure/aks/aks-extension-kaito) with a modern, intuitive UI built directly into Headlamp. Instead of relying on YAML or CLI workflows, this release introduces a visual experience that simplifies GPU node provisioning and model deployment for AKS users. Key features include:

Enhanced UI for interacting with KAITO directly in Headlamp, replacing manual CLI steps
One-click deployment of validated models from the KAITO Model Catalog
Automatic provisioning of GPU-backed nodes using KAITO’s controller logic
Dynamic model discovery from within the current namespace
Built-in port forwarding with connection status and error handling
AI-powered chat assistant for guided troubleshooting and user support

## Developing Headlamp plugins

For more information on developing Headlamp plugins, please refer to:

- [Getting Started](https://headlamp.dev/docs/latest/development/plugins/), How to create a new Headlamp plugin.
- [API Reference](https://headlamp.dev/docs/latest/development/api/), API documentation for what you can do
- [UI Component Storybook](https://headlamp.dev/docs/latest/development/frontend/#storybook), pre-existing components you can use when creating your plugin.
- [Plugin Examples](https://github.com/kubernetes-sigs/headlamp/tree/main/plugins/examples), Example plugins you can look at to see how it's done.
