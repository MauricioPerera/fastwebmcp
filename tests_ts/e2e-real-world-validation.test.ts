import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  registerTool,
  createWebMcpMock,
  withMockDocument,
  createMockAgentSubmitEvent,
  defineDeclarativeTool,
  respondToAgentSubmit,
  type DeclarativeFormElementLike,
} from '../src_ts/index.ts';
import { withDocument } from './mock-globals.ts';

function createMockForm(fields: string[]) {
  const attributes = new Map<string, string>();
  const elementAttributes = new Map<string, Map<string, string>>();
  const elements = fields.map((name) => {
    const attrs = new Map<string, string>();
    elementAttributes.set(name, attrs);
    return {
      name,
      setAttribute(attrName: string, value: string) {
        attrs.set(attrName, value);
      },
    };
  });
  return {
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    elements,
    attributes,
    elementAttributes,
  };
}

test('TOOL 1 (Imperativa): calculate_cart_total - calculo exitoso y validacion Zod', async () => {
  const mock = createWebMcpMock();

  const CartItemSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    price: z.number().positive(),
    quantity: z.number().int().min(1),
  });

  const CartInputSchema = z.object({
    items: z.array(CartItemSchema).min(1),
    coupon: z.string().optional(),
    currency: z.enum(['USD', 'EUR', 'MXN']).default('USD'),
  });

  withDocument(mock.document, () => {
    registerTool({
      name: 'calculate_cart_total',
      description: 'Calcula subtotal, descuentos e impuestos de un carrito de compras.',
      inputSchema: CartInputSchema,
      execute: async ({ items, coupon, currency }) => {
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountRate = coupon === 'DESCUENTO20' ? 0.20 : 0;
        const discountAmount = subtotal * discountRate;
        const taxable = subtotal - discountAmount;
        const tax = taxable * 0.16;
        const total = taxable + tax;

        return {
          currency,
          itemCount: items.length,
          subtotal: Number(subtotal.toFixed(2)),
          discountApplied: discountAmount > 0,
          discountAmount: Number(discountAmount.toFixed(2)),
          tax: Number(tax.toFixed(2)),
          total: Number(total.toFixed(2)),
        };
      },
    });
  });

  assert.equal(mock.hasTool('calculate_cart_total'), true);
  assert.ok(mock.getTool('calculate_cart_total') !== undefined);

  const res1 = (await mock.invokeTool('calculate_cart_total', {
    items: [
      { id: 'p1', name: 'Laptop', price: 1000, quantity: 1 },
      { id: 'p2', name: 'Mouse', price: 50, quantity: 2 },
    ],
  })) as Record<string, unknown>;

  assert.equal(res1.subtotal, 1100);
  assert.equal(res1.discountApplied, false);
  assert.equal(res1.tax, 176);
  assert.equal(res1.total, 1276);
  assert.equal(res1.currency, 'USD');

  const res2 = (await mock.invokeTool('calculate_cart_total', {
    items: [{ id: 'p1', name: 'Laptop', price: 1000, quantity: 1 }],
    coupon: 'DESCUENTO20',
    currency: 'MXN',
  })) as Record<string, unknown>;

  assert.equal(res2.subtotal, 1000);
  assert.equal(res2.discountApplied, true);
  assert.equal(res2.discountAmount, 200);
  assert.equal(res2.tax, 128);
  assert.equal(res2.total, 928);
  assert.equal(res2.currency, 'MXN');

  await assert.rejects(
    () =>
      mock.invokeTool('calculate_cart_total', {
        items: [{ id: 'p1', name: 'Item', price: -50, quantity: 1 }],
      }),
    /price/
  );

  await assert.rejects(
    () =>
      mock.invokeTool('calculate_cart_total', {
        items: [],
      }),
    /items/
  );
});

test('TOOL 2 (Declarativa): flight_search_form - anotacion, atomicidad y agente submit', async () => {
  const form = createMockForm(['origin', 'destination', 'departure_date', 'passengers']);

  defineDeclarativeTool(form as unknown as DeclarativeFormElementLike, {
    name: 'search_flights',
    description: 'Busca vuelos disponibles entre dos aeropuertos.',
    autoSubmit: true,
    fields: [
      { name: 'origin', description: 'Codigo IATA o ciudad de origen' },
      { name: 'destination', description: 'Codigo IATA o ciudad de destino' },
      { name: 'departure_date', description: 'Fecha de salida' },
      { name: 'passengers', description: 'Numero de pasajeros' },
    ],
  });

  assert.equal(form.attributes.get('toolname'), 'search_flights');
  assert.equal(form.attributes.get('tooldescription'), 'Busca vuelos disponibles entre dos aeropuertos.');
  assert.equal(form.attributes.get('toolautosubmit'), '');

  assert.equal(
    form.elementAttributes.get('origin')!.get('toolparamdescription'),
    'Codigo IATA o ciudad de origen'
  );

  let agentResponsePromise: Promise<unknown> | undefined;
  const mockSubmitEvent = {
    agentInvoked: true,
    respondWith(p: Promise<unknown>) {
      agentResponsePromise = p;
    },
  };

  const handled = respondToAgentSubmit(mockSubmitEvent, () => ({
    status: 'success',
    flightsFound: 3,
    cheapestPrice: 420,
  }));

  assert.equal(handled, true);
  const result = await agentResponsePromise;
  assert.deepEqual(result, {
    status: 'success',
    flightsFound: 3,
    cheapestPrice: 420,
  });

  const badForm = createMockForm(['origin']);
  assert.throws(
    () =>
      defineDeclarativeTool(badForm as unknown as DeclarativeFormElementLike, {
        name: 'fail_tool',
        description: 'Should fail atomically',
        fields: [{ name: 'non_existent_control', description: 'Missing' }],
      }),
    /no form control named "non_existent_control"/
  );
  assert.equal(badForm.attributes.size, 0);
});

test('CICLO DE VIDA: mock.reset() limpia estado y aisla pruebas', async () => {
  const mock = createWebMcpMock();

  withDocument(mock.document, () => {
    registerTool({
      name: 'temp_tool',
      description: 'Herramienta temporal.',
      inputSchema: z.object({}),
      execute: async () => 'active',
    });
  });

  assert.equal(mock.hasTool('temp_tool'), true);
  assert.equal(await mock.invokeTool('temp_tool', {}), 'active');

  mock.reset();

  assert.equal(mock.hasTool('temp_tool'), false);
  assert.equal(mock.getTool('temp_tool'), undefined);

  await assert.rejects(
    () => mock.invokeTool('temp_tool', {}),
    /no tool registered/
  );
});

test('DESREGISTRO: options.signal abort desregistra la tool del mock', async () => {
  const mock = createWebMcpMock();
  const controller = new AbortController();

  withDocument(mock.document, () => {
    registerTool(
      {
        name: 'abortable_tool',
        description: 'Herramienta cancelable.',
        inputSchema: z.object({}),
        execute: async () => 'running',
      },
      { signal: controller.signal },
    );
  });

  assert.equal(mock.hasTool('abortable_tool'), true);
  assert.ok(mock.getTool('abortable_tool') !== undefined);

  // Emitimos abort en el signal
  controller.abort();

  // Debe haberse desregistrado automaticamente
  assert.equal(mock.hasTool('abortable_tool'), false);
  assert.equal(mock.getTool('abortable_tool'), undefined);
});

test('PARIDAD DECLARATIVA: name charset pattern [A-Za-z0-9_.-] es validado estrictamente', () => {
  const form = createMockForm(['q']);

  // Nombres con espacios o caracteres ilegales deben lanzar antes de tocar el form
  assert.throws(
    () =>
      defineDeclarativeTool(form as unknown as DeclarativeFormElementLike, {
        name: 'invalid tool name',
        description: 'valid desc',
      }),
    /name must be 1-128 characters/
  );

  assert.throws(
    () =>
      defineDeclarativeTool(form as unknown as DeclarativeFormElementLike, {
        name: 'invalid@name!',
        description: 'valid desc',
      }),
    /name must be 1-128 characters/
  );

  // El form no debe haber sido tocado
  assert.equal(form.attributes.size, 0);
});

test('ERGONOMIA: withMockDocument aisla globalThis.document sin fugas', async () => {
  const mock = createWebMcpMock();
  const priorDoc = globalThis.document;

  const res = withMockDocument(mock, () => {
    assert.equal(globalThis.document, mock.document);
    registerTool({
      name: 'isolated_tool',
      description: 'Herramienta en entorno aislado.',
      inputSchema: z.object({}),
      execute: async () => 'from-isolated',
    });
    return mock.hasTool('isolated_tool');
  });

  assert.equal(res, true);
  // Al salir de withMockDocument, globalThis.document debe estar restaurado
  assert.equal(globalThis.document, priorDoc);
  assert.equal(await mock.invokeTool('isolated_tool', {}), 'from-isolated');
});

test('ERGONOMIA: createMockAgentSubmitEvent facilita pruebas de formularios declarativos', async () => {
  const { event, waitForResponse } = createMockAgentSubmitEvent();

  const handled = respondToAgentSubmit(event, () => ({
    processed: true,
    timestamp: 12345,
  }));

  assert.equal(handled, true);
  const response = await waitForResponse();
  assert.deepEqual(response, {
    processed: true,
    timestamp: 12345,
  });
});


