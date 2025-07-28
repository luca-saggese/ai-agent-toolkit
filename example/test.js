// example/test_agent.js
// Test di creazione e uso base dell'agente

import { Agent, Tool } from '../src/index.js';

// Tool di esempio
const echoTool = new Tool({
  name: 'echo',
  description: 'Ripete il testo fornito',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Testo da ripetere' }
    },
    required: ['text']
  },
  handler: async ({ text }) => `Echo: ${text}`
});

async function main() {
  const agent = new Agent({
    model: 'qwen/qwen3-coder:free',
    apiKey: process.env.OPENROUTER_API_KEY,
    instructions: 'Sei un assistente di test.',
    tools: [echoTool],
    verbose: true
  });

  console.log('Agente creato con successo!');
  // const response = await agent.run('echo "Ciao mondo"');
  // console.log('Risposta agente:', response.content);
}

main().catch(console.error);
