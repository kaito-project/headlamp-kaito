export const OPENAI_CONFIG = {
  // Using kubectl port-forward: kubectl port-forward service/workspace-phi-4-mini-instruct 8080:80
  // This creates a tunnel: localhost:8080 -> service:80 -> pod:5000
  baseURL: 'http://localhost:8080/v1', // vLLM OpenAI-compatible API endpoint

  temperature: 0.7,
  maxTokens: 1000,
};

export default OPENAI_CONFIG;
