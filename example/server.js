/**
 * OpenAI-compatible web server with tool calling support for OpenWebUI
 * Compatible with OpenRouter and other OpenAI-format APIs
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { Agent, Tool } from '../src/index.js'

const app = express()
const PORT = process.env.PORT || 11434

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/v1/', limiter)

// Default tools disponibili
const defaultTools = [
  new Tool({
    name: 'get_current_time',
    description: 'Ottiene l\'ora e data corrente',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (es: Europe/Rome, UTC)',
          default: 'UTC'
        }
      }
    },
    handler: async ({ timezone = 'UTC' }) => {
      try {
        const now = new Date()
        return `Data e ora corrente (${timezone}): ${now.toLocaleString('it-IT', {
          timeZone: timezone,
          dateStyle: 'full',
          timeStyle: 'medium'
        })}`
      } catch (error) {
        return `Data e ora corrente (UTC): ${new Date().toISOString()}`
      }
    }
  }),

  new Tool({
    name: 'calculate',
    description: 'Esegue calcoli matematici semplici',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Espressione matematica da calcolare (es: "2 + 3 * 4")'
        }
      },
      required: ['expression']
    },
    handler: async ({ expression }) => {
      try {
        // Sanifica l'espressione per sicurezza
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
        const result = Function(`"use strict"; return (${sanitized})`)()
        return `${expression} = ${result}`
      } catch (error) {
        return `Errore nel calcolo: ${error.message}`
      }
    }
  }),

  new Tool({
    name: 'search_web',
    description: 'Simula una ricerca web (placeholder)',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query di ricerca'
        }
      },
      required: ['query']
    },
    handler: async ({ query }) => {
      return `Risultati di ricerca per "${query}": [Questa è una funzione di esempio. In una implementazione reale, qui faresti una vera ricerca web]`
    }
  })
]

// Crea l'agent con i tools di default
const createAgent = (model, tools = [], history = []) => {
  return new Agent({
    model: model || 'qwen/qwen3-coder:free',
    apiKey: process.env.OPENROUTER_API_KEY,
    instructions: `Sei un assistente AI utile e amichevole. 
Hai accesso a diversi tools per aiutare l'utente.
Quando l'utente fa una domanda che richiede informazioni in tempo reale, usa i tools appropriati.
Rispondi sempre in italiano a meno che l'utente non richieda esplicitamente un'altra lingua.`,
    tools: [...defaultTools, ...tools],
    verbose: false,
    messages: history,
    debug: false
  })
}

// Endpoint per ottenere i modelli disponibili (compatibile OpenAI)
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: 'deepseek/deepseek-chat-v3-0324:free',
        object: 'model',
        created: Date.now(),
        owned_by: 'openrouter',
        permission: [],
        root: 'deepseek/deepseek-chat-v3-0324:free'
      },
      {
        id: 'qwen/qwen3-coder:free',
        object: 'model',
        created: Date.now(),
        owned_by: 'openrouter',
        permission: [],
        root: 'qwen/qwen3-coder:free'
      },
      {
        id: 'moonshotai/kimi-k2:free',
        object: 'model',
        created: Date.now(),
        owned_by: 'openrouter',
        permission: [],
        root: 'moonshotai/kimi-k2:free'
      },
      {
        id: 'mistralai/mistral-small-3.1-24b-instruct:free',
        object: 'model',
        created: Date.now(),
        owned_by: 'openrouter',
        permission: [],
        root: 'mistralai/mistral-small-3.1-24b-instruct:free'
      }
    ]
  })
})

// Endpoint principale per chat completions (compatibile OpenAI)
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const {
      model = 'qwen/qwen3-coder:free',
      messages = [],
      tools = [],
      stream = false,
      temperature = 0.7,
      max_tokens = 2000
    } = req.body

    console.log(`🚀 Request: ${model} - ${messages.length} messages - Tools: ${tools.length}`)

    // Crea agent con tools personalizzati se forniti
    let customTools = []
    if (tools && tools.length > 0) {
      customTools = tools.map(tool => new Tool({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
        handler: async (args) => {
          // Per ora simula l'esecuzione del tool
          return `[Tool ${tool.function.name} executed with args: ${JSON.stringify(args)}]`
        }
      }))
    }

    let history = []
    if (messages.length > 2) {
      history = messages.filter(m => m.role !== 'system').slice(0, -1) // Mantieni solo i messaggi precedenti all'ultimo
    }

    const agent = createAgent(model, customTools, history)

    // Converte i messaggi OpenAI in formato per l'agent
    if (messages.length > 0) {
      // Rimuovi il system message se presente (lo gestisce l'agent)
      const userMessages = messages.filter(msg => msg.role !== 'system')

      // Prendi solo l'ultimo messaggio utente per semplicità
      const lastUserMessage = userMessages
        .filter(msg => msg.role === 'user')
        .pop()

      if (!lastUserMessage) {
        return res.status(400).json({
          error: {
            message: 'No user message found',
            type: 'invalid_request_error'
          }
        })
      }

      // Esegui l'agent
      const result = await agent.run(lastUserMessage.content)

      // Prepara la risposta in formato OpenAI
      const response = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: result.content
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: Math.floor(lastUserMessage.content.length / 4),
          completion_tokens: Math.floor(result.content.length / 4),
          total_tokens: Math.floor((lastUserMessage.content.length + result.content.length) / 4)
        }
      }

      // Se ci sono stati tool calls, includili nella risposta
      const history = agent.getHistory()
      const toolCalls = history
        .filter(msg => msg.role === 'assistant' && msg.tool_calls)
        .map(msg => msg.tool_calls)
        .flat()

      if (toolCalls.length > 0) {
        response.choices[0].message.tool_calls = toolCalls.map(call => ({
          id: call.id,
          type: 'function',
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }))
        response.choices[0].finish_reason = 'tool_calls'
      }

      console.log(`✅ Response: ${result.content.substring(0, 100)}...`)

      if (stream) {
        // Per lo streaming, invia la risposta chunk per chunk
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        // Simula streaming dividendo la risposta in chunks
        const chunks = result.content.split(' ')
        for (let i = 0; i < chunks.length; i++) {
          const chunk = {
            id: response.id,
            object: 'chat.completion.chunk',
            created: response.created,
            model: model,
            choices: [{
              index: 0,
              delta: {
                content: (i === 0 ? '' : ' ') + chunks[i]
              },
              finish_reason: null
            }]
          }

          res.write(`data: ${JSON.stringify(chunk)}\n\n`)
          await new Promise(resolve => setTimeout(resolve, 50)) // Piccolo delay
        }

        // Chunk finale
        const finalChunk = {
          id: response.id,
          object: 'chat.completion.chunk',
          created: response.created,
          model: model,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }]
        }
        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
      } else {
        res.json(response)
      }
    } else {
      res.status(400).json({
        error: {
          message: 'Messages array is required',
          type: 'invalid_request_error'
        }
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'server_error'
      }
    })
  }
})

// Endpoint per ottenere informazioni sui tools disponibili
app.get('/v1/tools', (req, res) => {
  const toolsInfo = defaultTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }))

  res.json({
    object: 'list',
    data: toolsInfo
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Root endpoint con informazioni
app.get('/', (req, res) => {
  res.json({
    name: 'OpenRouter AI Agent Server',
    description: 'OpenAI-compatible API server with tool calling support',
    version: '1.0.0',
    endpoints: {
      'GET /v1/models': 'List available models',
      'POST /v1/chat/completions': 'Chat completions with tool support',
      'GET /v1/tools': 'List available tools',
      'GET /health': 'Health check'
    },
    tools_available: defaultTools.length,
    openwebui_compatible: true
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OpenRouter AI Agent Server running on port ${PORT}`)
  console.log(`📡 OpenAI-compatible API: http://localhost:${PORT}/v1`)
  console.log(`🛠️ Available tools: ${defaultTools.length}`)
  console.log(`🌐 OpenWebUI compatible: ✅`)
  console.log(`💡 Health check: http://localhost:${PORT}/health`)
})
