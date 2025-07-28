/**
 * Test del sistema di streaming con tool calls
 * Testa sia l'Agent direttamente che il server HTTP
 */

import { Agent, Tool } from '../src/index.js'

// Tool di esempio
const getCurrentTime = new Tool({
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
    const now = new Date()
    return `Data e ora corrente (${timezone}): ${now.toLocaleString('it-IT', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'medium'
    })}`
  }
})

const calculate = new Tool({
  name: 'calculate',
  description: 'Esegue calcoli matematici semplici',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Espressione matematica da calcolare'
      }
    },
    required: ['expression']
  },
  handler: async ({ expression }) => {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
      const result = Function(`"use strict"; return (${sanitized})`)()
      return `${expression} = ${result}`
    } catch (error) {
      return `Errore nel calcolo: ${error.message}`
    }
  }
})

// Test 1: Agent con eventi
async function testAgentEvents() {
  console.log('🧪 Test 1: Agent con sistema di eventi')
  console.log('='.repeat(50))
  
  const agent = new Agent({
    model: 'qwen/qwen3-coder:free',
    tools: [getCurrentTime, calculate],
    instructions: 'Sei un assistente AI che può ottenere l\'orario e fare calcoli.',
    verbose: false, // Disabilita verbose per vedere solo gli eventi
    debug: false
  })

  // Ascolta tutti gli eventi
  agent.on('start', (data) => {
    console.log('🚀 [EVENT] Start:', data.userMessage)
  })

  agent.on('user_message', (message) => {
    console.log('👤 [EVENT] User Message:', message.content)
  })

  agent.on('assistant_tool_calls', (message) => {
    console.log('🛠️ [EVENT] Assistant Tool Calls:')
    message.tool_calls.forEach(call => {
      console.log(`   - ${call.function.name}(${call.function.arguments})`)
    })
  })

  agent.on('tool_message', (message) => {
    console.log(`🔧 [EVENT] Tool Result (${message.name}):`, message.content)
  })

  agent.on('assistant_message', (message) => {
    console.log('🤖 [EVENT] Assistant Final:', message.content)
  })

  agent.on('complete', (data) => {
    console.log('✅ [EVENT] Complete - Iterazioni:', data.iterations)
  })

  agent.on('error', (error) => {
    console.log('❌ [EVENT] Error:', error.message)
  })

  try {
    await agent.runStream('Che ora è in Italia? E quanto fa 15 * 7?')
  } catch (error) {
    console.error('Errore:', error.message)
  }

  console.log('\n')
}

// Test 2: Server HTTP streaming
async function testServerStreaming() {
  console.log('🧪 Test 2: Server HTTP streaming')
  console.log('='.repeat(50))
  
  const response = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3-coder:free',
      messages: [
        {
          role: 'user',
          content: 'Che ora è? E quanto fa 12 + 8?'
        }
      ],
      stream: true,
      tools: []
    })
  })

  if (!response.ok) {
    console.error('Errore HTTP:', response.status, response.statusText)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let chunkCount = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            console.log('🏁 Stream terminato')
            break
          }
          
          try {
            const parsed = JSON.parse(data)
            chunkCount++
            console.log(`\n📦 Chunk ${chunkCount}:`)
            console.log(`   ID: ${parsed.id}`)
            console.log(`   Object: ${parsed.object}`)
            console.log(`   Model: ${parsed.model}`)
            
            if (parsed.choices?.[0]?.delta) {
              const delta = parsed.choices[0].delta
              const finishReason = parsed.choices[0].finish_reason
              
              console.log(`   Delta:`)
              if (delta.role) {
                console.log(`     - Role: ${delta.role}`)
              }
              if (delta.content) {
                console.log(`     - Content: "${delta.content}"`)
                process.stdout.write(delta.content)
              }
              if (delta.tool_calls) {
                console.log(`     - Tool Calls:`)
                delta.tool_calls.forEach((call, i) => {
                  console.log(`       ${i + 1}. ${call.function.name}(${call.function.arguments})`)
                })
              }
              if (finishReason) {
                console.log(`   Finish Reason: ${finishReason}`)
              }
            }
          } catch (e) {
            console.log(`   [Parse Error: ${e.message}]`)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  console.log(`\n✅ Test completato. Ricevuti ${chunkCount} chunks`)
  console.log('\n')
}

// Test 3: Server HTTP non-streaming
async function testServerNonStreaming() {
  console.log('🧪 Test 3: Server HTTP non-streaming')
  console.log('='.repeat(50))
  
  try {
    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-coder:free',
        messages: [
          {
            role: 'user',
            content: 'Dimmi che ora è e calcola 25 * 4'
          }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      console.error('Errore HTTP:', response.status, response.statusText)
      return
    }

    const data = await response.json()
    console.log('📨 Risposta completa:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Errore:', error.message)
  }
}

// Esegui i test
async function runTests() {
  console.log('🧪 Test del sistema di streaming AI Agent Toolkit')
  console.log('='.repeat(60))
  console.log('')
  
  // Test 1: Eventi dell'Agent
  await testAgentEvents()
  
  console.log('\n' + '='.repeat(60))
  console.log('Ora avvia il server con: npm run server')
  console.log('Poi premi INVIO per continuare con i test HTTP...')
  
  // Aspetta input utente
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', async () => {
    process.stdin.setRawMode(false)
    process.stdin.pause()
    
    // Test 2 e 3: Server HTTP
    await testServerStreaming()
    await testServerNonStreaming()
    
    console.log('✅ Tutti i test completati!')
    process.exit(0)
  })
}

runTests().catch(console.error)
