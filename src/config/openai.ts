// OpenAI Configuration
// Update these settings to match your OpenAI service

export const OPENAI_CONFIG = {
  // Try these different endpoint configurations:
  baseURL: 'http://20.167.105.235:80', // Current
  // baseURL: 'http://20.167.105.235:443',   // Alternative 1
  // baseURL: 'http://20.167.105.235:80',    // Alternative 2
  // baseURL: 'http://20.167.105.235:3000',  // Alternative 3
  // baseURL: 'http://20.167.105.235:8000',  // Alternative 4

  model: 'gpt-4',

  // You can also try other models available on your service:
  // model: 'gpt-3.5-turbo',
  // model: 'gpt-4-turbo',

  // Additional options you can configure:
  temperature: 0.7,
  maxTokens: 1000,
};

export default OPENAI_CONFIG;
