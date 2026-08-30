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

export function defineDeclarativeTool(
  form: DeclarativeFormElementLike,
  spec: DeclarativeToolSpec,
): void {
  if (typeof spec.name !== 'string' || spec.name.trim() === '') {
    throw new Error('defineDeclarativeTool: name must be a non-empty string');
  }
  if (typeof spec.description !== 'string' || spec.description.trim() === '') {
    throw new Error('defineDeclarativeTool: description must be a non-empty string');
  }

  form.setAttribute('toolname', spec.name);
  form.setAttribute('tooldescription', spec.description);
  if (spec.autoSubmit) {
    form.setAttribute('toolautosubmit', '');
  }

  for (const field of spec.fields ?? []) {
    const element = [...form.elements].find((candidate) => candidate.name === field.name);
    if (!element) {
      throw new Error(`defineDeclarativeTool: no form control named "${field.name}" found`);
    }
    element.setAttribute('toolparamdescription', field.description);
  }
}
