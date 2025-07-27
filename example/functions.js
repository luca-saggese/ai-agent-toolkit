import { Tool } from '../src/Tool.js'
import { z } from 'zod'

/**
 * Tool per ottenere informazioni meteo usando schema Zod
 */
export const weatherTool = new Tool({
  name: 'get_weather',
  description: 'Restituisce il meteo per una città specifica.',
  schema: z.object({
    city: z.string().describe('Nome della città per cui ottenere il meteo'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().describe('Unità di temperatura')
  }),
  handler: async ({ city, unit = 'celsius' }) => {
    const temp = unit === 'fahrenheit' ? '77°F' : '25°C'
    return `A ${city} ci sono ${temp} e cielo sereno ☀️`
  }
})

/**
 * Tool per ripetere un testo usando parametri JSON Schema tradizionali
 */
export const echoTool = new Tool({
  name: 'echo',
  description: 'Ripete il testo fornito dall\'utente',
  parameters: {
    type: 'object',
    properties: {
      text: { 
        type: 'string', 
        description: 'Testo da ripetere esattamente come fornito' 
      },
      repeat_count: {
        type: 'number',
        description: 'Numero di volte da ripetere il testo (default: 1)',
        default: 1
      }
    },
    required: ['text']
  },
  handler: async ({ text, repeat_count = 1 }) => {
    return Array(repeat_count).fill(`Echo: ${text}`).join('\n')
  }
})

/**
 * Tool per calcoli matematici semplici
 */
export const calculatorTool = new Tool({
  name: 'calculate',
  description: 'Esegue calcoli matematici semplici',
  schema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Operazione da eseguire'),
    a: z.number().describe('Primo numero'),
    b: z.number().describe('Secondo numero')
  }),
  handler: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add':
        return `${a} + ${b} = ${a + b}`
      case 'subtract':
        return `${a} - ${b} = ${a - b}`
      case 'multiply':
        return `${a} × ${b} = ${a * b}`
      case 'divide':
        if (b === 0) throw new Error('Divisione per zero non permessa')
        return `${a} ÷ ${b} = ${a / b}`
      default:
        throw new Error(`Operazione non supportata: ${operation}`)
    }
  }
})

// Array di tutti i tools disponibili
export const availableTools = [weatherTool, echoTool, calculatorTool]
