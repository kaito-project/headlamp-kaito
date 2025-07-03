/**
 * Utility functions for determining model capabilities
 */

/**
 * Check if a model supports MCP tools based on its name
 * Currently only Llama models support tools
 */
export function modelSupportsTools(modelName: string): boolean {
  if (!modelName) return false;
  return modelName.toLowerCase().includes('llama');
}

/**
 * List of model name patterns that support tools
 * This can be expanded in the future if other models add tool support
 */
export const TOOL_SUPPORTING_MODELS = ['llama'];

/**
 * Check if a model name matches any of the tool-supporting patterns
 */
export function isToolSupportingModel(modelName: string): boolean {
  if (!modelName) return false;
  const lowerName = modelName.toLowerCase();
  return TOOL_SUPPORTING_MODELS.some(pattern => lowerName.includes(pattern));
}
