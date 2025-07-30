/**
 * Utility functions for AI Agent Toolkit
 */

import readline from 'readline'
import fs from 'fs'

/**
 * Creates a complete chat interface with readline
 */
export function createChatInterface(agent, options = {}) {
  const {
    prompt = '💬 Tu: ',
    welcomeMessage = '🤖 Assistant: Ciao! Come posso aiutarti oggi?',
    exitCommands = ['/exit', '/quit'],
    showHelp = true,
    assistantName = 'Assistant',
    historyFile = null
  } = options

  if (historyFile && fs.existsSync(historyFile)) {
    try {
      agent.setHistory(JSON.parse(fs.readFileSync(historyFile, 'utf8')))
      console.log(`\n📜 Cronologia caricata da ${historyFile}`)
    } catch (error) {
      console.error(`\n❌ Errore nel caricamento della cronologia: ${error.message}`)
      return
    }
  }else if (historyFile) {
    console.log(`\n📜 Cronologia non trovata, ne verrà creata una nuova in ${historyFile}`)
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `\n${prompt}`
  })

  // Special commands handler
  function handleSpecialCommands(input) {
    const command = input.toLowerCase().trim()

    if (exitCommands.includes(command)) {
      console.log('\n👋 Arrivederci!')
      rl.close()
      return true
    }

    switch (command) {
      case '/reset':
        agent.reset()
        console.log('\n🔄 Conversazione resettata!')
        return true

      case '/history':
        console.log('\n📚 Cronologia:')
        console.log(agent.getReadableHistory?.() || JSON.stringify(agent.getHistory(), null, 2))
        return true

      case '/tools':
        console.log('\n🛠 Tools disponibili:')
        agent.getTools().forEach(tool => {
          console.log(`  • ${tool.name}: ${tool.description}`)
        })
        return true

      case '/verbose on':
        if (agent.setVerbose) {
          agent.setVerbose(true)
          console.log('\n📢 Modalità verbose attivata')
        }
        return true

      case '/verbose off':
        if (agent.setVerbose) {
          agent.setVerbose(false)
          console.log('\n🔇 Modalità verbose disattivata')
        }
        return true

      case '/help':
        showHelpMessage()
        return true

      default:
        return false
    }
  }

  function showHelpMessage() {
    console.log('\n📖 Comandi disponibili:')
    console.log(`  • ${exitCommands.join(' ')}      - Esci dalla chat`)
    console.log('  • /reset           - Resetta la conversazione')
    console.log('  • /history         - Mostra cronologia')
    console.log('  • /tools           - Lista dei tools disponibili')
    console.log('  • /verbose on/off  - Attiva/disattiva modalità verbose')
    console.log('  • /help            - Mostra questo aiuto')
  }

  let isRunning = false;

  // Main input handler
  async function handleInput(input) {
    if (isRunning) {
      console.log('\n⏳ Attendi che la risposta precedente sia completata...');
      return;
    }
    if (handleSpecialCommands(input)) {
      return;
    }
    if (input.trim() === '') {
      return;
    }
    try {
      isRunning = true;
      const result = await agent.run(input);
      console.log(`\n🤖 ${assistantName}: ${result.content}`);
      if (historyFile) {
        saveHistory(agent, historyFile);
        console.log(`\n💾 Cronologia salvata in ${historyFile}`);
      }
    } catch (error) {
      console.error('\n❌ Errore:', error.message);
    } finally {
      isRunning = false;
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

  // Start the chat
  console.log(welcomeMessage)
  if (showHelp) {
    showHelpMessage()
  }
  rl.prompt()

  return {
    rl,
    close: () => rl.close(),
    handleInput
  }
}

/**
 * Save conversation history to file
 */
export function saveHistory(agent, filename) {
  if (!filename) {
    filename = `chat_history_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  }

  const history = agent.getHistory()
  fs.writeFileSync(filename, JSON.stringify(history, null, 2))
  return filename
}

/**
 * Load conversation history from file
 */
export function loadHistory(agent, filename) {
  if (!fs.existsSync(filename)) {
    throw new Error(`File not found: ${filename}`)
  }

  const historyData = fs.readFileSync(filename, 'utf8')
  const history = JSON.parse(historyData)

  agent.setHistory(history)
  return history
}
