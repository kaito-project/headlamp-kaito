export const TOOL_SUPPORTING_MODELS = ['llama'];

export function modelSupportsTools(modelName: string): boolean {
  if (!modelName) return false;
  const lowerName = modelName.toLowerCase();
  return TOOL_SUPPORTING_MODELS.some(pattern => lowerName.includes(pattern));
}
