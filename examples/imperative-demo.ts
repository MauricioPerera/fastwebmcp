import { z } from 'zod';
import { registerTool, supportsWebMcp } from '../src_ts/index.ts';

function addTodoToDom(text: string): void {
  const list = document.getElementById('todo-list');
  if (!list) return;
  const item = document.createElement('li');
  item.textContent = text;
  list.appendChild(item);
}

function renderSupportStatus(): void {
  const status = document.getElementById('webmcp-status');
  if (!status) return;
  if (supportsWebMcp()) {
    status.textContent = 'WebMCP is supported in this browser. The add_todo tool is registered and callable by an agent.';
    status.className = 'status status--supported';
  } else {
    status.textContent = 'WebMCP is not supported in this browser. The tool registration was skipped (see the console warning); the page still works normally for humans.';
    status.className = 'status status--unsupported';
  }
}

renderSupportStatus();

registerTool({
  name: 'add_todo',
  description: 'Add a todo item to the list.',
  inputSchema: z.object({ text: z.string().min(1) }),
  execute: async ({ text }) => {
    addTodoToDom(text);
    return `Added: ${text}`;
  },
});

const form = document.getElementById('human-add-form') as HTMLFormElement | null;
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('human-add-input') as HTMLInputElement | null;
  const text = input?.value.trim();
  if (input && text) {
    addTodoToDom(text);
    input.value = '';
  }
});
