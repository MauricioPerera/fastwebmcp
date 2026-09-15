import type { LsfaBroker, LsfaBrokerContext, LsfaBrokerRequest } from './lsfa.ts';

export interface LsfaBrokerMockOptions {
  results?: unknown[];
  handler?: (request: LsfaBrokerRequest, context: LsfaBrokerContext) => Promise<unknown> | unknown;
}

export interface LsfaBrokerMock {
  broker: LsfaBroker;
  requests: Array<{ request: LsfaBrokerRequest; context: LsfaBrokerContext }>;
  readonly callCount: number;
  reset(): void;
}

function abortPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('createLsfaBrokerMock: request aborted')), { once: true });
  });
}

export function createLsfaBrokerMock(options: LsfaBrokerMockOptions = {}): LsfaBrokerMock {
  const requests: LsfaBrokerMock['requests'] = [];
  const results = [...(options.results ?? [])];
  const broker: LsfaBroker = {
    async request(request, context) {
      if (context.signal.aborted) throw new Error('createLsfaBrokerMock: request aborted');
      requests.push({ request, context });
      let response: Promise<unknown>;
      if (options.handler) response = Promise.resolve(options.handler(request, context));
      else if (results.length > 0) response = Promise.resolve(results.shift());
      else throw new Error('createLsfaBrokerMock: no result queued');
      return Promise.race([response, abortPromise(context.signal)]);
    },
  };
  return {
    broker,
    requests,
    get callCount() { return requests.length; },
    reset() { requests.length = 0; },
  };
}

