/**
 * Esempio base di utilizzo dell'AI Agent Toolkit
 */

import 'dotenv/config'
import { Agent, Tool, createChatInterface } from '../src/index.js'

// Crea alcuni tools di esempio
const weatherTool = new Tool({
  name: 'get_weather',
  description: 'Ottiene il meteo per una città',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'Nome della città' }
    },
    required: ['city']
  },
  handler: async ({ city }) => {
    return `Il meteo a ${city}: 22°C, soleggiato ☀️`
  }
})

const calculatorTool = new Tool({
  name: 'calculate',
  description: 'Esegue calcoli matematici',
  parameters: {
    type: 'object',
    properties: {
      operation: { type: 'string', description: 'Operazione: add, subtract, multiply, divide' },
      a: { type: 'number', description: 'Primo numero' },
      b: { type: 'number', description: 'Secondo numero' }
    },
    required: ['operation', 'a', 'b']
  },
  handler: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add': return `${a} + ${b} = ${a + b}`
      case 'subtract': return `${a} - ${b} = ${a - b}`
      case 'multiply': return `${a} × ${b} = ${a * b}`
      case 'divide': 
        if (b === 0) throw new Error('Divisione per zero!')
        return `${a} ÷ ${b} = ${a / b}`
      default: throw new Error(`Operazione non supportata: ${operation}`)
    }
  }
})

// Configura l'agent
const agent = new Agent({
  model: 'qwen/qwen3-coder:free',
  apiKey: process.env.OPENROUTER_API_KEY,
  instructions: `
Sei un assistente AI utile e amichevole.
Se l'utente chiede il meteo, usa get_weather.
Se l'utente chiede calcoli, usa calculate.
Rispondi sempre in italiano e sii conciso.
`,
  tools: [weatherTool, calculatorTool],
  verbose: true,
  debug: false
})

// Avvia la chat interattiva
console.log('🚀 AI Agent Toolkit - Esempio Base')
console.log('━'.repeat(50))

createChatInterface(agent, {
  welcomeMessage: '🤖 Ciao! Sono il tuo assistente AI. Posso aiutarti con il meteo e calcoli matematici!',
  prompt: '💬 Tu: ',
  showHelp: true
})
