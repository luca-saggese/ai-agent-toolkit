import 'dotenv/config'
import OpenAI from 'openai'
import { EventEmitter } from 'events'
import { checkAndCompressHistory } from './lib/utils.js'

/**
 * Classe Agent compatibile con @openai/agents per gestire conversazioni con AI e tool calls
 * Supporta eventi per streaming di tutti i messaggi (user, assistant, tool, tool_calls)
 */
export class Agent extends EventEmitter {
  constructor(options = {}) {
    super() // Inizializza EventEmitter

    // Supporto per sia il formato nuovo che quello vecchio
    if (typeof options === 'string') {
      // Formato vecchio: Agent(apiKey, model, systemPrompt, tools)
      this.openai = new OpenAI({
        apiKey: arguments[0],
        baseURL: 'https://openrouter.ai/api/v1',
      })
      this.model = arguments[1]
      this.systemPrompt = arguments[2] || ''
      this.tools = arguments[3] || []
    } else {
      // Formato nuovo: Agent({ model, tools, instructions, apiKey, ... })
      this.openai = new OpenAI({
        apiKey: options.apiKey || process.env.OPENROUTER_API_KEY,
        baseURL: options.baseURL || 'https://openrouter.ai/api/v1',
      })
      this.model = options.model || 'qwen/qwen3-coder:free'
      this.systemPrompt = (options.instructions || options.systemPrompt || '') + `\n\nALWAYS CALL ONLY 1 tool at a time.\n`
      this.tools = options.tools || []
      this.session = options.session || null // Aggiunto per supportare sessioni
    }

    this.messages = options.messages || []

    // Mappa dei tools per accesso rapido
    this.toolMap = new Map()
    this.tools.forEach(tool => {
      this.toolMap.set(tool.name, tool)
    })

    // Inizializza con il system prompt se fornito
    if (this.systemPrompt) {
      this.messages.push({ role: 'system', content: this.systemPrompt })
    }

    // Configurazioni aggiuntive
    this.maxIterations = options.maxIterations || 10
    this.temperature = options.temperature || 0.7
    this.debug = options.debug !== undefined ? options.debug : true
    this.verbose = options.verbose !== undefined ? options.verbose : true // Default attivo per mostrare thoughts
  }

  /**
   * Emette un evento per il messaggio specificato
   */
  _emitMessage(message, eventType = 'message') {
    this.emit(eventType, message)
    this.emit('message', { ...message, eventType })
  }

  /**
   * Aggiunge un messaggio utente alla conversazione
   */
  addMessage(content, role = 'user') {
    const message = { role, content }
    this.messages.push(message)

    // Emetti evento per il messaggio utente
    this._emitMessage(message, 'user_message')
  }

  /**
   * Alias per compatibilità
   */
  addUserMessage(content) {
    this.addMessage(content, 'user')
  }

  /**
   * Ottiene le definizioni dei tools per OpenAI
   */
  getToolDefinitions() {
    return this.tools.map(tool => tool.getDefinition())
  }

  /**
   * Esegue una singola iterazione della conversazione
   */
  async step() {
    const toolDefinitions = this.getToolDefinitions()
    if (this.verbose) {
      console.log('Esecuzione step con', this.messages.length, 'messaggi e', toolDefinitions.length, 'tools')
      console.log('Ultimo messaggio:', this.getLastMessage())
      console.log('Tools:', toolDefinitions.map(t => t.name).join(', '))
    }
    this.messages = await checkAndCompressHistory(this.messages)

    const res = await this.openai.chat.completions.create({
      model: this.model,
      messages: this.messages,
      tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
      tool_choice: toolDefinitions.length > 0 ? 'auto' : undefined,
      temperature: this.temperature
    })
    if (res.error) {
      throw new Error(`OpenAI API Error: ${res.error || 'Unknown error'}`)
    }
    const msg = res.choices[0].message

    if (this.debug) {
      console.log('🤖 Risposta del modello:', JSON.stringify(res, null, 2))
    }

    if (!msg.tool_calls) {
      // Risposta finale
      this.messages.push(msg)

      // Emetti evento per la risposta assistant
      this._emitMessage(msg, 'assistant_message')

      // Log del pensiero finale dell'AI (solo se verbose)
      if (this.verbose) {
        console.log('💭 Thought (Pensiero finale):')
        console.log(`   "${msg.content}"`)
      }

      return {
        type: 'response',
        content: msg.content,
        role: 'assistant'
      }
    }

    // Log del reasoning dell'AI prima di chiamare i tools (solo se verbose)
    if (this.verbose) {
      if (msg.content) {
        console.log('🧠 AI Reasoning (Ragionamento):')
        console.log(`   "${msg.content}"`)
      }

      console.log('🛠 Tool calls da eseguire:')
      for (const call of msg.tool_calls) {
        console.log(`🔧 Lanciando tool: ${call.function.name}`)
        console.log(`   📋 Parametri: ${call.function.arguments}`)
      }
    }

    // Aggiungi il messaggio assistant con le tool_calls
    const assistantMessage = {
      role: 'assistant',
      content: null,
      tool_calls: msg.tool_calls
    }
    this.messages.push(assistantMessage)

    // Emetti evento per il messaggio assistant con tool_calls
    this._emitMessage(assistantMessage, 'assistant_tool_calls')

    // Esegui ogni tool call
    const toolResults = []
    for (const toolCall of msg.tool_calls) {
      const { name, arguments: argsStr } = toolCall.function

      try {
        console.log(`🔧 Esecuzione tool: ${name} con args:`, argsStr)
        const args = argsStr.trim() ? JSON.parse(argsStr.trim()) : {}  
        const tool = this.toolMap.get(name)

        if (!tool) {
          const errorMsg = `Tool '${name}' non trovato`
          console.log(`⚠️ Tool Error: ${errorMsg}`)

          const toolMessage = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name,
            content: errorMsg
          }
          this.messages.push(toolMessage)

          // Emetti evento per il messaggio tool
          this._emitMessage(toolMessage, 'tool_message')

          toolResults.push({ name, error: errorMsg })
          continue
        }

        console.log(`⚡ Eseguendo tool: ${name}(${JSON.stringify(args)})`)
        const startTime = Date.now()
        const result = await tool.execute(args, this.session)

        if (this.verbose) {
          console.log(`📋 Observation (Osservazione da ${name}):`)
          console.log(`   "${result}"`)
        }
        toolCall.done = true;
        toolCall.result = result;
        toolCall.execution_time = Date.now() - startTime;

        const toolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          tool_calls: msg.tool_calls,
          name,
          content: typeof result === 'string' ? result : JSON.stringify(result)

        }
        this.messages.push(toolMessage)

        // Emetti evento per il messaggio tool
        this._emitMessage(toolMessage, 'tool_message')

        toolResults.push({ name, result })

      } catch (error) {
        const errorMsg = `Errore nell'esecuzione di ${name}: ${error.message}`
        console.log(`❌ Tool Error: ${errorMsg}`)
        console.log(error)

        const toolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          name,
          content: errorMsg
        }
        this.messages.push(toolMessage)

        // Emetti evento per il messaggio tool di errore
        this._emitMessage(toolMessage, 'tool_message')

        toolResults.push({ name, error: errorMsg })
      }
    }

    return {
      type: 'tool_calls',
      tool_calls: msg.tool_calls,
      results: toolResults
    }
  }

  /**
   * Versione streamable di run() che emette eventi per ogni messaggio
   * Usa questa versione quando vuoi ricevere eventi in tempo reale
   */
  async runStream(userMessage) {
    if (this.verbose) {
      console.log('🚀 Iniziando elaborazione in streaming...')
      console.log(`📝 User Input: "${userMessage}"`)
      console.log('─'.repeat(60))
    }

    // Emetti evento di inizio
    this.emit('start', { userMessage })

    this.addUserMessage(userMessage)

    let iterations = 0
    while (iterations < this.maxIterations) {
      iterations++
      if (this.verbose) {
        console.log(`\n🔄 Iterazione ${iterations}:`)
      }

      // Emetti evento di iterazione
      this.emit('iteration', { iteration: iterations })

      const result = await this.step()

      if (result.type === 'response') {
        if (this.verbose) {
          console.log('─'.repeat(60))
          console.log(`✅ Elaborazione completata in ${iterations} iterazione${iterations > 1 ? 'i' : ''}`)
        }

        // Emetti evento di completamento
        this.emit('complete', {
          content: result.content,
          role: result.role,
          iterations,
          messages: this.getHistory()
        })

        return {
          content: result.content,
          role: result.role,
          iterations,
          messages: this.getHistory()
        }
      }

      // Se ci sono stati tool calls, continua il loop
      if (result.type === 'tool_calls' && this.verbose) {
        console.log('↻ Continuando con la prossima iterazione...')
      }
    }

    const error = new Error(`Raggiunto il limite massimo di iterazioni (${this.maxIterations})`)
    this.emit('error', error)
    throw error
  }

  /**
   * Processa un messaggio utente completo con tutti i tool calls necessari
   */
  async run(userMessage) {
    if (this.verbose) {
      console.log('🚀 Iniziando elaborazione...')
      console.log(`📝 User Input: "${userMessage}"`)
      console.log('─'.repeat(60))
    }

    this.addUserMessage(userMessage)

    let iterations = 0
    while (iterations < this.maxIterations) {
      iterations++
      if (this.verbose) {
        console.log(`\n🔄 Iterazione ${iterations}:`)
      }

      const result = await this.step()

      if (result.type === 'response') {
        if (this.verbose) {
          console.log('─'.repeat(60))
          console.log(`✅ Elaborazione completata in ${iterations} iterazione${iterations > 1 ? 'i' : ''}`)
        }

        return {
          content: result.content,
          role: result.role,
          iterations,
          messages: this.getHistory()
        }
      }

      // Se ci sono stati tool calls, continua il loop
      if (result.type === 'tool_calls' && this.verbose) {
        console.log('↻ Continuando con la prossima iterazione...')
      }
    }

    throw new Error(`Raggiunto il limite massimo di iterazioni (${this.maxIterations})`)
  }

  /**
   * Alias per compatibilità con il codice esistente
   */
  async processMessage(userMessage) {
    const result = await this.run(userMessage)
    return result.content
  }

  /**
   * Resetta la conversazione mantenendo solo il system prompt
   */
  reset() {
    this.messages = []
    if (this.systemPrompt) {
      this.messages.push({ role: 'system', content: this.systemPrompt })
    }
  }

  /**
   * Ottiene la cronologia dei messaggi
   */
  getHistory() {
    return [...this.messages]
  }

  /**
   * Imposta la cronologia dei messaggi
   */
  setHistory(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('La cronologia deve essere un array di messaggi')
    }

    // Validazione dei messaggi
    for (const msg of messages) {
      if (!msg.role || !['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
        throw new Error(`Ruolo del messaggio non valido: ${msg.role}`)
      }
      if (msg.content === undefined && msg.role !== 'assistant') {
        throw new Error('Il messaggio deve avere un contenuto')
      }
    }

    this.messages = [...messages]

    // Ricostruisci la mappa dei tools se ci sono tool calls nella cronologia
    this.toolMap.clear()
    this.tools.forEach(tool => {
      this.toolMap.set(tool.name, tool)
    })
  }

  /**
   * Aggiunge messaggi alla cronologia esistente
   */
  appendToHistory(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('I messaggi devono essere un array')
    }

    for (const msg of messages) {
      if (!msg.role || !['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
        throw new Error(`Ruolo del messaggio non valido: ${msg.role}`)
      }
    }

    this.messages.push(...messages)
  }

  /**
   * Ottiene una versione leggibile della cronologia
   */
  getReadableHistory() {
    return this.messages
      .filter(msg => msg.role !== 'tool') // Filtra i messaggi dei tools per leggibilità
      .map(msg => {
        const role = msg.role === 'user' ? '👤 Utente' :
          msg.role === 'assistant' ? '🤖 Assistant' :
            msg.role === 'system' ? '⚙️ System' : msg.role
        return `${role}: ${msg.content || '[Tool calls]'}`
      })
      .join('\n\n')
  }

  /**
   * Ottiene statistiche sulla cronologia
   */
  getHistoryStats() {
    const stats = {
      total: this.messages.length,
      user: 0,
      assistant: 0,
      system: 0,
      tool: 0,
      toolCalls: 0
    }

    this.messages.forEach(msg => {
      stats[msg.role] = (stats[msg.role] || 0) + 1
      if (msg.tool_calls) {
        stats.toolCalls += msg.tool_calls.length
      }
    })

    return stats
  }

  /**
   * Ottiene l'ultimo messaggio
   */
  getLastMessage() {
    return this.messages[this.messages.length - 1] || null
  }

  /**
   * Aggiunge un tool alla lista
   */
  addTool(tool) {
    this.tools.push(tool)
    this.toolMap.set(tool.name, tool)
  }

  /**
   * Rimuove un tool dalla lista
   */
  removeTool(toolName) {
    this.tools = this.tools.filter(tool => tool.name !== toolName)
    this.toolMap.delete(toolName)
  }

  /**
   * Ottiene la lista dei tools disponibili
   */
  getTools() {
    return [...this.tools]
  }

  /**
   * Imposta la modalità debug
   */
  setDebug(debug) {
    this.debug = debug
  }

  /**
   * Imposta la modalità verbose (mostra thoughts e observations)
   */
  setVerbose(verbose) {
    this.verbose = verbose
  }

  /**
   * Ottiene lo stato della modalità verbose
   */
  isVerbose() {
    return this.verbose
  }
}
