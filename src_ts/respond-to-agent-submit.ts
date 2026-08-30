export interface AgentSubmitEventLike {
  readonly agentInvoked: boolean;
  respondWith(promise: Promise<unknown>): void;
}

export function respondToAgentSubmit(
  event: AgentSubmitEventLike,
  handler: (event: AgentSubmitEventLike) => unknown,
): boolean {
  if (!event.agentInvoked) {
    return false;
  }
  event.respondWith(Promise.resolve().then(() => handler(event)));
  return true;
}
