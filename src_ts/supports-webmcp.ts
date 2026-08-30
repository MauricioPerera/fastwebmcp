export function supportsWebMcp(): boolean {
  if (typeof globalThis.navigator !== 'object' || globalThis.navigator === null) {
    return false;
  }
  const modelContext = (globalThis.navigator as { modelContext?: unknown }).modelContext;
  return typeof modelContext === 'object' && modelContext !== null;
}
