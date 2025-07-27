import 'dotenv/config'
import readline from 'readline'
import fs from 'fs'
import { Agent } from '../src/Agent.js'
import { availableTools } from './functions.js'

// Configurazione dell'agent compatibile con @openai/agents
const agent = new Agent({
  model: 'qwen/qwen3-coder:free',
  apiKey: process.env.OPENROUTER_API_KEY,
  instructions: `
Sei un assistente AI utile e amichevole. 
Se l'utente chiede il meteo, usa get_weather.
Se l'utente dice qualcosa che vuoi ripetere, usa echo.
Se l'utente chiede calcoli, usa calculate.
CHIAMA SEMPRE SOLO 1 tool alla volta.
Rispondi sempre in italiano e sii conciso ma informativo.
`,
  tools: availableTools,
  temperature: 0.7,
  maxIterations: 10,
  debug: false
})

// Interfaccia readline per input da console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\n💬 Tu: '
})

// Funzione per gestire comandi speciali
function handleSpecialCommands(input) {
  const command = input.toLowerCase().trim()
  
  // Gestisci comando load history con filename
  if (command.startsWith('load history ')) {
    const filename = input.slice(13).trim() // rimuovi "load history "
    try {
      if (!fs.existsSync(filename)) {
        console.log(`\n❌ File non trovato: ${filename}`)
        return true
      }
      
      const historyData = fs.readFileSync(filename, 'utf8')
      const history = JSON.parse(historyData)
      
      agent.setHistory(history)
      console.log(`\n📁 Cronologia caricata da: ${filename}`)
      console.log(`   📊 Messaggi caricati: ${history.length}`)
      
    } catch (error) {
      console.error('\n❌ Errore nel caricare la cronologia:', error.message)
    }
    return true
  }
  
  switch (command) {
    case 'exit':
    case 'quit':
      console.log('\n👋 Arrivederci!')
      rl.close()
      return true
      
    case 'reset':
      agent.reset()
      console.log('\n🔄 Conversazione resettata!')
      return true
      
    case 'history':
      console.log('\n📚 Cronologia conversazione:')
      console.log(JSON.stringify(agent.getHistory(), null, 2))
      return true
      
    case 'history readable':
      console.log('\n📖 Cronologia leggibile:')
      console.log(agent.getReadableHistory())
      return true
      
    case 'history stats':
      console.log('\n📊 Statistiche cronologia:')
      const stats = agent.getHistoryStats()
      console.log(`   📝 Messaggi totali: ${stats.total}`)
      console.log(`   👤 Messaggi utente: ${stats.user}`)
      console.log(`   🤖 Messaggi assistant: ${stats.assistant}`)
      console.log(`   ⚙️ Messaggi system: ${stats.system}`)
      console.log(`   🛠 Messaggi tool: ${stats.tool}`)
      console.log(`   🔧 Tool calls totali: ${stats.toolCalls}`)
      return true
      
    case 'save history':
      try {
        const history = agent.getHistory()
        const filename = `chat_history_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
        fs.writeFileSync(filename, JSON.stringify(history, null, 2))
        console.log(`\n💾 Cronologia salvata in: ${filename}`)
      } catch (error) {
        console.error('\n❌ Errore nel salvare la cronologia:', error.message)
      }
      return true
      
    case 'load history':
      console.log('\n📁 Per caricare una cronologia, usa: load history <filename>')
      console.log('   Esempio: load history chat_history_2025-07-27T10-30-00.json')
      return true
      
    case 'tools':
      console.log('\n🛠 Tools disponibili:')
      agent.getTools().forEach(tool => {
        console.log(`  • ${tool.name}: ${tool.description}`)
      })
      return true
      
    case 'debug on':
      agent.setDebug(true)
      console.log('\n🐛 Modalità debug attivata')
      return true
      
    case 'debug off':
      agent.setDebug(false)
      console.log('\n🐛 Modalità debug disattivata')
      return true
      
    case 'verbose on':
      agent.setVerbose(true)
      console.log('\n📢 Modalità verbose attivata - Mostrerò thoughts e observations')
      return true
      
    case 'verbose off':
      agent.setVerbose(false)
      console.log('\n🔇 Modalità verbose disattivata')
      return true
      
    case 'stop':
      agent.stop()
      console.log('\n🛑 Comando di stop inviato')
      return true
      
    case 'help':
      showHelp()
      return true
      
    default:
      return false
  }
}

// Funzione per mostrare l'aiuto
function showHelp() {
  console.log('\n📖 Comandi disponibili:')
  console.log('  • exit/quit        - Esci dalla chat')
  console.log('  • reset            - Resetta la conversazione')
  console.log('  • history          - Mostra cronologia JSON completa')
  console.log('  • history readable - Mostra cronologia in formato leggibile')
  console.log('  • history stats    - Mostra statistiche della cronologia')
  console.log('  • save history     - Salva cronologia in file JSON')
  console.log('  • load history <file> - Carica cronologia da file JSON')
  console.log('  • tools            - Lista dei tools disponibili')
  console.log('  • debug on/off     - Attiva/disattiva modalità debug')
  console.log('  • verbose on/off   - Mostra/nasconde thoughts e observations')
  console.log('  • help             - Mostra questo aiuto')
  console.log('\n🛠 Tools disponibili:')
  agent.getTools().forEach(tool => {
    console.log(`  • ${tool.name}: ${tool.description}`)
  })
}

// Funzione principale per gestire l'input
async function handleInput(input) {
  // Gestisci comandi speciali
  if (handleSpecialCommands(input)) {
    return
  }

  // Ignora input vuoti
  if (input.trim() === '') {
    return
  }

  try {
    // Usa il nuovo metodo run per compatibilità con @openai/agents
    const result = await agent.run(input)
    console.log(`\n🤖 Assistant: ${result.content}`)
    
  } catch (error) {
    console.error('\n❌ Errore:', error.message)
    
    if (agent.debug) {
      console.error('Stack trace:', error.stack)
    }
  }
}

// Event listeners
rl.on('line', async (input) => {
  await handleInput(input)
  rl.prompt()
})

rl.on('close', () => {
  console.log('\n👋 Sessione terminata!')
  process.exit(0)
})

// Gestione interruzioni
process.on('SIGINT', () => {
  console.log('\n\n👋 Interruzione ricevuta, chiudo la chat...')
  rl.close()
})

// Avvio della chat
console.log('🚀 Chat Interattiva con AI Agent (compatibile @openai/agents)')
console.log('━'.repeat(60))
showHelp()
console.log('\n🤖 Assistant: Ciao! Come posso aiutarti oggi?')
console.log('💡 Prova a chiedere il meteo, fare un calcolo, o usare "help" per vedere tutti i comandi')

rl.prompt()

