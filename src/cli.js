/**
 * Utility functions for AI Agent Toolkit
 */

import readline from 'readline'
import fs from 'fs'
import chalk from 'chalk'

function parseMarkdownConsole(md) {
  // Bold: **text** or __text__
  md = md.replace(/\*\*(.*?)\*\*/g, (_, m) => chalk.bold(m));
  md = md.replace(/__(.*?)__/g, (_, m) => chalk.bold(m));
  // Italic: *text* or _text_
  md = md.replace(/\*(.*?)\*/g, (_, m) => chalk.italic(m));
  md = md.replace(/_(.*?)_/g, (_, m) => chalk.italic(m));
  // Inline code: `code`
  md = md.replace(/`([^`]+)`/g, (_, m) => chalk.yellow(m));
  // Headings: #, ##, ###
  md = md.replace(/^### (.*)$/gm, (_, m) => chalk.cyan.bold(m));
  md = md.replace(/^## (.*)$/gm, (_, m) => chalk.green.bold(m));
  md = md.replace(/^# (.*)$/gm, (_, m) => chalk.blue.bold(m));
  // Lists: - or *
  md = md.replace(/^[-*] (.*)$/gm, (_, m) => chalk.white('• ' + m));
  // Links: [text](url)
  md = md.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => chalk.underline.blue(text) + chalk.gray(' (' + url + ')'));
  return md;
}

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
  agent.on('assistant_message', (message) =>  console.log(`\n🤖 ${assistantName}: ${parseMarkdownConsole(message.content)}`));

  if (historyFile && fs.existsSync(historyFile)) {
    try {
      agent.setHistory(JSON.parse(fs.readFileSync(historyFile, 'utf8')))
      console.log(`\n📜 Cronologia caricata da ${historyFile}`)
    } catch (error) {
      console.error(`\n❌ Errore nel caricamento della cronologia: ${error.message}`)
      return
    }
  } else if (historyFile) {
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
  let tryCount = 0;
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
      //console.log(`\n🤖 ${assistantName}: ${result.content}`);
      tryCount = 0
      rl.prompt()
      if (historyFile) {
        saveHistory(agent, historyFile);
        // console.log(`\n💾 Cronologia salvata in ${historyFile}`);
      }
    } catch (error) {
      isRunning = false
      console.error('\n❌ Errore:', error.message, 'retry count:', tryCount);
      if (tryCount++ < 10) handleInput('riprova');
    } finally {
      isRunning = false;
    }
  }

  // Event listeners
  rl.on('line', async (input) => {
    await handleInput(input)

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
