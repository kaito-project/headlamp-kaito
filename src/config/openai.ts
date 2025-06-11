export const OPENAI_CONFIG = {
  baseURL: 'http://20.167.105.235:80', // Current
  // baseURL: 'http://20.167.105.235:443',   // Alternative 1
  // baseURL: 'http://20.167.105.235:80',    // Alternative 2
  // baseURL: 'http://20.167.105.235:3000',  // Alternative 3
  // baseURL: 'http://20.167.105.235:8000',  // Alternative 4

  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
};

export default OPENAI_CONFIG;
