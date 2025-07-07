export const TOOL_SUPPORTING_MODELS = ['llama'];

// Check if a model supports MCP tools based on its name
// Uses the TOOL_SUPPORTING_MODELS array for flexible pattern matching

export function modelSupportsTools(modelName: string): boolean {
  if (!modelName) return false;
  const lowerName = modelName.toLowerCase();
  return TOOL_SUPPORTING_MODELS.some(pattern => lowerName.includes(pattern));
}
