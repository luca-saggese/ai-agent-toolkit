# How to Use as NPM Package

## Installation

```bash
npm install @yourname/ai-agent-toolkit
```

## Quick Start

### Basic Usage

```javascript
import { Agent, Tool } from '@yourname/ai-agent-toolkit'

// Create a simple tool
const greetTool = new Tool({
  name: 'greet',
  description: 'Greets a person',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person name' }
    },
    required: ['name']
  },
  handler: async ({ name }) => `Hello, ${name}!`
})

// Create agent
const agent = new Agent({
  model: 'anthropic/claude-3-haiku', // Any OpenRouter model
  apiKey: process.env.OPENROUTER_API_KEY,
  instructions: 'You are a helpful assistant.',
  tools: [greetTool]
})

// Use the agent
const response = await agent.run('Greet John')
console.log(response.content) // Output: Hello, John!
```

### Interactive Chat

```javascript
import { Agent, createChatInterface } from '@yourname/ai-agent-toolkit'

const agent = new Agent({
  model: 'qwen/qwen3-coder:free', // Free model on OpenRouter
  apiKey: process.env.OPENROUTER_API_KEY,
  instructions: 'You are a helpful assistant.',
  tools: [],
  verbose: true
})

// Start interactive chat
createChatInterface(agent)
```

### Advanced Tool with Zod Validation

```javascript
import { Agent, Tool } from '@yourname/ai-agent-toolkit'
import { z } from 'zod'

const mathTool = new Tool({
  name: 'calculate',
  description: 'Performs mathematical calculations',
  schema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number')
  }),
  handler: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add': return a + b
      case 'subtract': return a - b
      case 'multiply': return a * b
      case 'divide': return a / b
    }
  }
})
```

### History Management

```javascript
import { saveHistory, loadHistory } from '@yourname/ai-agent-toolkit'

// Save conversation
const filename = saveHistory(agent)
console.log(`History saved to: ${filename}`)

// Load conversation
loadHistory(agent, 'chat_history_2025-07-27T10-30-00.json')
```

## API Reference

### Agent Class

#### Constructor Options
- `model`: AI model to use
- `apiKey`: OpenAI/OpenRouter API key
- `instructions`: System prompt
- `tools`: Array of Tool instances
- `verbose`: Show detailed logging (default: true)
- `debug`: Show debug information (default: false)
- `maxIterations`: Max tool call iterations (default: 10)
- `temperature`: Response creativity (default: 0.7)

#### Methods
- `run(message)`: Process a complete conversation
- `step()`: Execute a single conversation step
- `reset()`: Clear conversation history
- `getHistory()`: Get conversation messages
- `setHistory(messages)`: Set conversation history
- `addTool(tool)`: Add a tool
- `removeTool(name)`: Remove a tool
- `getTools()`: Get all tools

### Tool Class

#### Constructor Options
- `name`: Tool name
- `description`: Tool description
- `parameters`: JSON Schema parameters
- `schema`: Zod schema (alternative to parameters)
- `handler`: Async function to execute

#### Methods
- `execute(args)`: Execute the tool
- `getDefinition()`: Get OpenAI tool definition

### Utilities

#### createChatInterface(agent, options)
Creates an interactive chat interface.

Options:
- `prompt`: Input prompt text
- `welcomeMessage`: Welcome message
- `exitCommands`: Commands to exit chat
- `showHelp`: Show help on start

#### saveHistory(agent, filename)
Saves conversation history to JSON file.

#### loadHistory(agent, filename)
Loads conversation history from JSON file.

## Environment Variables

```env
# OpenRouter API Key (Recommended)
OPENROUTER_API_KEY=your_openrouter_key

# OpenAI API Key (Alternative)
OPENAI_API_KEY=your_openai_key
```

### Why OpenRouter?
- Single API key for 50+ models (GPT-4, Claude, Gemini, etc.)
- Up to 50% cost savings compared to direct APIs
- Free models available for testing
- Same OpenAI-compatible format
