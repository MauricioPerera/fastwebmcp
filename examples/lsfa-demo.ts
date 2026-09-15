import { z } from 'zod';
import { registerLsfaTool, supportsWebMcp } from '../src_ts/index.ts';
import { createLsfaBrokerMock } from '../src_ts/lsfa-testing.ts';

const output = document.getElementById('simulation-output');
const support = document.getElementById('webmcp-status');
const mock = createLsfaBrokerMock({
  results: [{
    status: 'accepted',
    operation: 'send_email',
    request_id: 'req_demo_001',
    risk: 'high',
    checks: { confirmed: true, bound: true, single_use: true },
    stored_refs: { smtp_credential: true },
  }],
});

const spec = {
  name: 'send_email_securely',
  description: 'Request trusted local capture and confirmation before sending email.',
  inputSchema: z.object({
    recipient: z.string().email(),
    subject: z.string().min(1),
  }),
  intent: {
    operation: 'send_email',
    purpose: 'Send an email only after trusted local confirmation.',
    presentation: { profile: 'confirmation', locale: 'en-US', theme: 'system' as const },
  },
  broker: mock.broker,
};

if (new URLSearchParams(location.search).has('without-webmcp')) {
  if (support) support.textContent = 'Testing the no-WebMCP fallback in a browser Web Worker…';
  const worker = new Worker('../dist/lsfa-fallback-worker.js', { type: 'module' });
  worker.addEventListener('message', (event: MessageEvent<{ registered: boolean; warnings: number }>) => {
    if (support) {
      support.textContent = event.data.registered === false && event.data.warnings === 1
        ? 'WebMCP unavailable in the Worker: safe no-op verified (one warning, no registration).'
        : 'Fallback verification failed.';
    }
    worker.terminate();
  }, { once: true });
} else {
  if (support) {
    support.textContent = supportsWebMcp()
      ? 'WebMCP available: the simulated tool is registered.'
      : 'WebMCP unavailable: registration safely degrades to a no-op.';
  }
  registerLsfaTool(spec);
}

document.getElementById('show-envelope')?.addEventListener('click', () => {
  if (output) {
    output.textContent = JSON.stringify({
      protocol: 'lsfa',
      version: '0.2',
      agentInput: { recipient: 'ana@example.com', subject: 'Hello' },
      secretsVisibleToAgent: false,
      realAuthorizationPerformed: false,
    }, null, 2);
  }
});
