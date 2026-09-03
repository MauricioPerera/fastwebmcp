export interface DeclarativeFieldSpec {
  name: string;
  description: string;
}

export interface DeclarativeToolSpec {
  name: string;
  description: string;
  autoSubmit?: boolean;
  fields?: DeclarativeFieldSpec[];
}

export interface DeclarativeFormElementLike {
  setAttribute(name: string, value: string): void;
  elements: Iterable<{ name?: string | null; setAttribute(name: string, value: string): void }>;
}

// Same charset/length rule and Chrome budgets as the imperative defineTool()
// (define-tool.ts): the name pattern is spec-enforced (thrown), the budgets are
// Chrome's recommendations (warned, never thrown).
const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const NAME_BUDGET = 30;
const DESCRIPTION_BUDGET = 500;

function warnIfOverBudget(label: string, value: string, limit: number): void {
  if (value.length > limit) {
    console.warn(
      `fastwebmcp: ${label} is ${value.length} characters; Chrome recommends <=${limit} for reliable agent results.`,
    );
  }
}

export function defineDeclarativeTool(
  form: DeclarativeFormElementLike,
  spec: DeclarativeToolSpec,
): void {
  if (typeof spec.name !== 'string' || spec.name.trim() === '') {
    throw new Error('defineDeclarativeTool: name must be a non-empty string');
  }
  if (!NAME_PATTERN.test(spec.name)) {
    throw new Error('defineDeclarativeTool: name must be 1-128 characters of letters, numbers, "_", "-", or "."');
  }
  if (typeof spec.description !== 'string' || spec.description.trim() === '') {
    throw new Error('defineDeclarativeTool: description must be a non-empty string');
  }

  warnIfOverBudget('tool name', spec.name, NAME_BUDGET);
  warnIfOverBudget('tool description', spec.description, DESCRIPTION_BUDGET);

  // Atomic validation: resolve every field's element BEFORE mutating any
  // attribute, so a missing control leaves the form completely untouched.
  const elements = [...form.elements];
  const matched = (spec.fields ?? []).map((field) => {
    const element = elements.find((candidate) => candidate.name === field.name);
    if (!element) {
      throw new Error(`defineDeclarativeTool: no form control named "${field.name}" found`);
    }
    return { field, element };
  });

  form.setAttribute('toolname', spec.name);
  form.setAttribute('tooldescription', spec.description);
  if (spec.autoSubmit) {
    form.setAttribute('toolautosubmit', '');
  }

  for (const { field, element } of matched) {
    element.setAttribute('toolparamdescription', field.description);
  }
}
