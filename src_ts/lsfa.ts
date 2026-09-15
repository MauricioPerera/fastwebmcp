import { z, type ZodType } from 'zod';
import { defineTool, type DefinedTool, type ToolAnnotations } from './define-tool.ts';
import { registerTool, type RegisterToolOptions } from './register-tool.ts';

export const LSFA_STATUSES = ['accepted', 'declined', 'cancelled', 'invalid', 'failed', 'expired'] as const;
export type LsfaStatus = (typeof LSFA_STATUSES)[number];
export type LsfaRisk = 'low' | 'medium' | 'high' | 'critical';

export interface LsfaPresentationLayout {
  sections: Array<{ id: string; title?: string; fields?: string[] }>;
}

export interface LsfaPresentation {
  profile?: string;
  layout?: LsfaPresentationLayout;
  locale?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface LsfaIntent {
  operation: string;
  purpose: string;
  presentation?: LsfaPresentation;
}

export interface LsfaBrokerRequest<TInput = unknown> {
  protocol: 'lsfa';
  version: '0.2';
  intent: LsfaIntent;
  agentInput: TInput;
}

export interface LsfaBrokerContext {
  signal: AbortSignal;
  origin: string;
}

export interface LsfaBroker {
  request(request: LsfaBrokerRequest, context: LsfaBrokerContext): Promise<unknown>;
}

export interface LsfaResult {
  status: LsfaStatus;
  operation: string;
  request_id: string;
  risk: LsfaRisk;
  checks: { confirmed: boolean; bound: boolean; single_use: boolean };
  stored_refs: Record<string, boolean>;
  error_code?: string;
}

export interface LsfaToolSpec<TSchema extends ZodType> {
  name: string;
  description: string;
  inputSchema: TSchema;
  intent: LsfaIntent;
  broker: LsfaBroker;
  annotations?: ToolAnnotations;
  title?: string;
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const SECRET_KEY = /(?:^|[_-])(password|passwd|secret|token|credential|credentials|pin|otp|totp|api[_-]?key|private[_-]?key)(?:$|[_-])/i;
const CAMEL_SECRET_KEY = /(password|passwd|secret|token|credential|credentials|pin|otp|totp|apiKey|privateKey)/i;
const resultSchema = z.strictObject({
  status: z.enum(LSFA_STATUSES),
  operation: z.string().regex(IDENTIFIER),
  request_id: z.string().regex(IDENTIFIER),
  risk: z.enum(['low', 'medium', 'high', 'critical']),
  checks: z.strictObject({ confirmed: z.boolean(), bound: z.boolean(), single_use: z.boolean() }),
  stored_refs: z.record(z.string().regex(IDENTIFIER), z.boolean()),
  error_code: z.string().regex(IDENTIFIER).optional(),
});

function containsSecretSchema(value: unknown, key = ''): boolean {
  if ((SECRET_KEY.test(key) || CAMEL_SECRET_KEY.test(key)) && key !== '') return true;
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.format === 'password' || record.writeOnly === true || record.sensitive === true) return true;
  return Object.entries(record).some(([childKey, child]) => containsSecretSchema(child, childKey));
}

function assertText(label: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw new Error(`fastwebmcp/lsfa: ${label} must be a safe identifier`);
  }
}

function validatePresentation(value: LsfaPresentation | undefined): void {
  if (value === undefined) return;
  const parsed = z.strictObject({
    profile: z.string().regex(IDENTIFIER).optional(),
    layout: z.strictObject({
      sections: z.array(z.strictObject({
        id: z.string().regex(IDENTIFIER),
        title: z.string().min(1).max(160).optional(),
        fields: z.array(z.string().regex(IDENTIFIER)).optional(),
      })),
    }).optional(),
    locale: z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  }).safeParse(value);
  if (!parsed.success || (value.profile !== undefined && value.layout !== undefined)) {
    throw new Error('fastwebmcp/lsfa: invalid presentation hint');
  }
}

function currentOrigin(): string {
  const candidate = (globalThis as { location?: { origin?: unknown } }).location?.origin;
  return typeof candidate === 'string' ? candidate : 'null';
}

export function defineLsfaTool<TSchema extends ZodType>(spec: LsfaToolSpec<TSchema>): DefinedTool {
  if (!spec.broker || typeof spec.broker.request !== 'function') {
    throw new Error('fastwebmcp/lsfa: broker with request() is required');
  }
  assertText('intent.operation', spec.intent?.operation);
  if (typeof spec.intent?.purpose !== 'string' || spec.intent.purpose.trim() === '') {
    throw new Error('fastwebmcp/lsfa: intent.purpose must be a non-empty string');
  }
  validatePresentation(spec.intent.presentation);
  const jsonSchema = spec.inputSchema.toJSONSchema() as Record<string, unknown>;
  if (containsSecretSchema(jsonSchema)) {
    throw new Error('fastwebmcp/lsfa: WebMCP inputSchema contains an LSFA-captured secret');
  }

  return defineTool({
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
    ...(spec.annotations !== undefined ? { annotations: spec.annotations } : {}),
    ...(spec.title !== undefined ? { title: spec.title } : {}),
    execute: async (agentInput, context): Promise<LsfaResult> => {
      const signal = context?.signal ?? new AbortController().signal;
      if (signal.aborted) {
        throw new Error('fastwebmcp/lsfa: request aborted before broker dispatch');
      }
      let rawResult: unknown;
      try {
        rawResult = await spec.broker.request(
          { protocol: 'lsfa', version: '0.2', intent: spec.intent, agentInput },
          { signal, origin: currentOrigin() },
        );
      } catch {
        throw new Error('fastwebmcp/lsfa: broker request failed');
      }
      const parsed = resultSchema.safeParse(rawResult);
      if (!parsed.success) throw new Error('fastwebmcp/lsfa: broker returned an invalid result');
      return parsed.data;
    },
  });
}

export function registerLsfaTool<TSchema extends ZodType>(
  spec: LsfaToolSpec<TSchema>,
  options?: RegisterToolOptions,
): boolean {
  const defined = defineLsfaTool(spec);
  return registerTool({
    name: defined.name,
    description: defined.description,
    inputSchema: spec.inputSchema,
    ...(defined.annotations !== undefined ? { annotations: defined.annotations } : {}),
    ...(defined.title !== undefined ? { title: defined.title } : {}),
    execute: (input, context) => defined.execute(input, context),
  }, options);
}
