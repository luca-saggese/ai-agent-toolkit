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
  model: 'qwen/qwen3-coder:free',
  tools: [greetTool],
  instructions: 'You are a helpful assistant.'
})

// Use agent
const result = await agent.run('Greet John')
console.log(result.content) // AI will use the greet tool
```

## Streaming Support

### Event-based Streaming

The Agent class extends EventEmitter and provides real-time events for all messages:

```javascript
import { Agent, Tool } from '@yourname/ai-agent-toolkit'

const agent = new Agent({
  model: 'qwen/qwen3-coder:free',
  tools: [/* your tools */],
  verbose: false // Disable console output for cleaner event handling
})

// Listen to all events
agent.on('start', (data) => {
  console.log('🚀 Started processing:', data.userMessage)
})

agent.on('user_message', (message) => {
  console.log('👤 User:', message.content)
})

agent.on('assistant_tool_calls', (message) => {
  console.log('🛠️ Tool calls:', message.tool_calls)
})

agent.on('tool_message', (message) => {
  console.log('🔧 Tool result:', message.content)
})

agent.on('assistant_message', (message) => {
  console.log('🤖 Assistant:', message.content)
})

agent.on('complete', (data) => {
  console.log('✅ Complete:', data.content)
})

agent.on('error', (error) => {
  console.log('❌ Error:', error.message)
})

// Use streaming version
await agent.runStream('Your message here')
```

### Available Events

- `start` - Processing started with user message
- `user_message` - User message added to conversation
- `assistant_tool_calls` - Assistant wants to call tools
- `tool_message` - Tool execution result
- `assistant_message` - Final assistant response
- `iteration` - New iteration started
- `complete` - Processing completed
- `error` - Error occurred
- `message` - Generic event for all messages (includes eventType)

## OpenAI-Compatible Server

### Running the Server

```bash
npm run server
```

The server provides an OpenAI-compatible API endpoint with streaming support:

```
POST /v1/chat/completions
```

### Server Features

- ✅ **OpenAI-compatible API** - Drop-in replacement for OpenAI API
- ✅ **Streaming support** - Real-time response streaming with proper chunk format
- ✅ **Tool calling** - Full support for function calling
- ✅ **OpenWebUI compatible** - Works seamlessly with OpenWebUI
- ✅ **Multiple models** - Supports various OpenRouter models

### Example Usage

#### Non-streaming request:

```javascript
const response = await fetch('http://localhost:11434/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'qwen/qwen3-coder:free',
    messages: [
      { role: 'user', content: 'What time is it?' }
    ],
    stream: false
  })
})

const data = await response.json()
console.log(data.choices[0].message.content)
```

#### Streaming request:

```javascript
const response = await fetch('http://localhost:11434/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'qwen/qwen3-coder:free',
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
    stream: true
  })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6)
      if (data === '[DONE]') break
      
      const parsed = JSON.parse(data)
      const content = parsed.choices?.[0]?.delta?.content
      if (content) {
        process.stdout.write(content)
      }
    }
  }
}
```

### Streaming Format

The server follows OpenAI's exact streaming format:

#### For tool calls:
1. **Chunk 1**: `{ delta: { role: "assistant" } }`
2. **Chunk 2**: `{ delta: { tool_calls: [...] } }`
3. **Chunk 3**: `{ delta: {}, finish_reason: "tool_calls" }`

#### For text responses:
1. **Chunk 1**: `{ delta: { role: "assistant" } }`
2. **Chunk N**: `{ delta: { content: "word" } }`
3. **Final**: `{ delta: {}, finish_reason: "stop" }`

### Testing Streaming

Test the streaming format with the provided test scripts:

```bash
# Test basic streaming functionality
npm run test:streaming

# Test OpenAI format compliance
npm run test:openai
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
OPENAI_API_KEY=your_open_ai_key
```

### Why OpenRouter?
- Single API key for 50+ models (GPT-4, Claude, Gemini, etc.)
- Up to 50% cost savings compared to direct APIs
- Free models available for testing
- Same OpenAI-compatible format
