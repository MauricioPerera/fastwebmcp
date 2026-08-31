// Same demo as the monorepo's examples/declarative-demo.ts, EXCEPT this imports from
// the real published package, not the local src_ts/.
import {
  defineDeclarativeTool,
  respondToAgentSubmit,
  type DeclarativeFormElementLike,
} from 'fastwebmcp';

const form = document.getElementById('support-form') as HTMLFormElement | null;

if (form) {
  // lib.dom.d.ts types HTMLFormControlsCollection items as the generic `Element`
  // interface, which has no `.name` -- even though real <input>/<select> elements do.
  // This is an imprecision in TypeScript's own DOM typings, not a mismatch with
  // fastwebmcp's (verified, duck-typed) DeclarativeFormElementLike contract.
  defineDeclarativeTool(form as unknown as DeclarativeFormElementLike, {
    name: 'submit_support_request',
    description: 'Submit a request for support.',
    fields: [
      {
        name: 'topic',
        description: 'Determines what team this request is routed to.',
      },
    ],
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const topic = String(formData.get('topic') ?? '');
    const firstName = String(formData.get('firstName') ?? '');

    const handled = respondToAgentSubmit(event as unknown as SubmitEvent & {
      agentInvoked: boolean;
      respondWith: (p: Promise<unknown>) => void;
    }, () => ({ status: 'submitted', routedTo: topic }));

    const result = document.getElementById('result');
    if (result) {
      result.textContent = handled
        ? `Submitted by an agent. Routed to: ${topic}`
        : `Submitted by ${firstName || 'a human'}. Routed to: ${topic}`;
    }
  });
}
