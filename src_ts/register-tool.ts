import type { ZodType } from 'zod';
import { defineTool, type ToolSpec } from './define-tool.ts';
import { supportsWebMcp } from './supports-webmcp.ts';

export interface RegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

interface DocumentModelContext {
  modelContext: {
    registerTool: (tool: unknown, options?: RegisterToolOptions) => unknown;
  };
}

export function registerTool<TSchema extends ZodType>(
  spec: ToolSpec<TSchema>,
  options?: RegisterToolOptions,
): boolean {
  const tool = defineTool(spec);

  if (!supportsWebMcp()) {
    console.warn(
      `fastwebmcp: WebMCP is not supported in this browser (document.modelContext is missing); skipping registration of tool "${tool.name}".`,
    );
    return false;
  }

  (globalThis.document as unknown as DocumentModelContext).modelContext.registerTool(tool, options);
  return true;
}
