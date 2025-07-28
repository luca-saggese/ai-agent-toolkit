/**
 * Test specifico per tool_calls in streaming
 * Testa la corretta sequenza di chunk per OpenAI compatibility
 */

// Test streaming con tool_calls - deve seguire il formato:
// Chunk 1: { delta: { role: "assistant" } }
// Chunk 2: { delta: { tool_calls: [...] } }  
// Chunk 3: { delta: {}, finish_reason: "tool_calls" }

async function testToolCallsStreaming() {
  console.log('🧪 Test Tool Calls Streaming Format')
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
          content: 'Che ora è adesso in Italia?'
        }
      ],
      stream: true,
      tools: [
        {
          type: 'function',
          function: {
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
            }
          }
        }
      ]
    })
  })

  if (!response.ok) {
    console.error('Errore HTTP:', response.status, response.statusText)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let chunkCount = 0
  let hasRole = false
  let hasToolCalls = false
  let hasFinishReason = false

  console.log('📦 Chunks ricevuti:')
  console.log('')

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
            console.log('🏁 [DONE]')
            break
          }
          
          try {
            const parsed = JSON.parse(data)
            chunkCount++
            
            const delta = parsed.choices?.[0]?.delta || {}
            const finishReason = parsed.choices?.[0]?.finish_reason
            
            console.log(`Chunk ${chunkCount}:`)
            console.log(`  object: "${parsed.object}"`)
            console.log(`  delta: ${JSON.stringify(delta, null, 4)}`)
            if (finishReason) {
              console.log(`  finish_reason: "${finishReason}"`)
            }
            console.log('')
            
            // Verifica formato corretto
            if (delta.role === 'assistant') {
              hasRole = true
              console.log('✅ Chunk con role: assistant trovato')
            }
            
            if (delta.tool_calls && delta.tool_calls.length > 0) {
              hasToolCalls = true
              console.log('✅ Chunk con tool_calls trovato')
              console.log(`   Tools: ${delta.tool_calls.map(tc => tc.function.name).join(', ')}`)
            }
            
            if (finishReason === 'tool_calls') {
              hasFinishReason = true
              console.log('✅ Chunk finale con finish_reason: tool_calls')
            }
            
          } catch (e) {
            console.log(`❌ Parse Error: ${e.message}`)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  console.log('📊 Risultati del test:')
  console.log(`   Chunk totali: ${chunkCount}`)
  console.log(`   Role assistant: ${hasRole ? '✅' : '❌'}`)
  console.log(`   Tool calls: ${hasToolCalls ? '✅' : '❌'}`)
  console.log(`   Finish reason: ${hasFinishReason ? '✅' : '❌'}`)
  
  const isCorrectFormat = hasRole && hasToolCalls && hasFinishReason
  console.log(`   Formato corretto: ${isCorrectFormat ? '✅' : '❌'}`)
  
  if (isCorrectFormat) {
    console.log('')
    console.log('🎉 Test PASSATO! Il formato streaming è corretto per OpenAI/OpenWebUI!')
  } else {
    console.log('')
    console.log('❌ Test FALLITO! Il formato streaming non è conforme a OpenAI.')
    if (!hasRole) console.log('   - Manca chunk con role: assistant')
    if (!hasToolCalls) console.log('   - Manca chunk con tool_calls')
    if (!hasFinishReason) console.log('   - Manca finish_reason: tool_calls')
  }
}

// Test streaming con risposta testuale normale
async function testTextStreaming() {
  console.log('')
  console.log('🧪 Test Text Response Streaming')
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
          content: 'Dimmi solo "Ciao!" senza usare alcun tool'
        }
      ],
      stream: true,
      tools: [] // Nessun tool per forzare una risposta normale
    })
  })

  if (!response.ok) {
    console.error('Errore HTTP:', response.status, response.statusText)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let chunkCount = 0
  let hasRole = false
  let hasContent = false
  let hasFinishReason = false
  let fullContent = ''

  console.log('📦 Chunks ricevuti:')
  console.log('')

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
            console.log('🏁 [DONE]')
            break
          }
          
          try {
            const parsed = JSON.parse(data)
            chunkCount++
            
            const delta = parsed.choices?.[0]?.delta || {}
            const finishReason = parsed.choices?.[0]?.finish_reason
            
            console.log(`Chunk ${chunkCount}: ${JSON.stringify(delta)} ${finishReason ? `(${finishReason})` : ''}`)
            
            // Verifica formato corretto
            if (delta.role === 'assistant') {
              hasRole = true
            }
            
            if (delta.content) {
              hasContent = true
              fullContent += delta.content
            }
            
            if (finishReason === 'stop') {
              hasFinishReason = true
            }
            
          } catch (e) {
            console.log(`❌ Parse Error: ${e.message}`)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  console.log('')
  console.log('📊 Risultati del test:')
  console.log(`   Chunk totali: ${chunkCount}`)
  console.log(`   Role assistant: ${hasRole ? '✅' : '❌'}`)
  console.log(`   Content chunks: ${hasContent ? '✅' : '❌'}`)
  console.log(`   Finish reason stop: ${hasFinishReason ? '✅' : '❌'}`)
  console.log(`   Contenuto completo: "${fullContent}"`)
  
  const isCorrectFormat = hasRole && hasContent && hasFinishReason
  console.log(`   Formato corretto: ${isCorrectFormat ? '✅' : '❌'}`)
}

// Esegui i test
async function runTests() {
  console.log('🧪 Test formato streaming OpenAI-compatible')
  console.log('='.repeat(60))
  console.log('')
  console.log('IMPORTANTE: Avvia prima il server con: npm run server')
  console.log('Poi premi INVIO per iniziare i test...')
  
  // Aspetta input utente
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', async () => {
    process.stdin.setRawMode(false)
    process.stdin.pause()
    
    try {
      await testToolCallsStreaming()
      await testTextStreaming()
      
      console.log('')
      console.log('✅ Tutti i test completati!')
    } catch (error) {
      console.error('❌ Errore durante i test:', error)
    }
    
    process.exit(0)
  })
}

runTests().catch(console.error)
