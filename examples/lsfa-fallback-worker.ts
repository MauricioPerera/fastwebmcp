import { z } from 'zod';
import { registerLsfaTool } from '../src_ts/lsfa.ts';

let warnings = 0;
console.warn = () => { warnings += 1; };

const registered = registerLsfaTool({
  name: 'worker_fallback_probe',
  description: 'Verify safe behavior in a browser realm without document.modelContext.',
  inputSchema: z.object({ operation: z.literal('probe') }),
  intent: { operation: 'probe', purpose: 'Verify no-WebMCP fallback.' },
  broker: { async request() { throw new Error('must not execute'); } },
});

postMessage({ registered, warnings });
