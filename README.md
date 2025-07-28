# AI Agent Toolkit

Un toolkit completo per creare agenti AI con tool calling, compatibile con l'interfaccia `@openai/agents`. **Funziona principalmente con OpenRouter** per accesso a modelli multipli con una singola API key.

## 🚀 Caratteristiche

- **Compatibile con @openai/agents**: Segue l'interfaccia standard per agenti AI
- **OpenRouter Ready**: Ottimizzato per OpenRouter con supporto per modelli multipli
- **Tool System Avanzato**: Supporto per tools con validazione Zod
- **Chat Interattiva**: Interfacce ready-to-use per console
- **NPM Package**: Utilizzabile come dipendenza in altri progetti
- **Debug & Verbose Mode**: Modalità dettagliate per sviluppo
- **Gestione Errori**: Gestione robusta degli errori nei tool calls

## 📦 Installazione

### Come pacchetto npm
```bash
npm install ai-agent-toolkit
```

### Sviluppo locale
```bash
# Clona il repository
git clone <repo-url>
cd simpleAgent

# Installa le dipendenze
npm install

# Configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con la tua OpenRouter API key
```

## 🔧 Configurazione

### OpenRouter (Raccomandato)
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### OpenAI (Alternativa)
```env
OPENAI_API_KEY=your_openai_api_key_here
```

> **💡 Perché OpenRouter?**
> - Accesso a modelli multipli (GPT-4, Claude, Gemini, etc.) con una singola API key
> - Costi ridotti rispetto alle API dirette
> - Stesso formato API di OpenAI
> - Failover automatico tra modelli

## 🔧 Uso Base

### Importa le classi principali

```javascript
import { Agent, Tool } from 'ai-agent-toolkit'

// Crea un tool personalizzato
const myTool = new Tool({
  name: 'get_time',
  description: 'Ottiene l\'ora attuale',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'Timezone (opzionale)' }
    }
  },
  handler: async ({ timezone = 'UTC' }) => {
    return new Date().toLocaleString('it-IT', { timeZone: timezone })
  }
})

// Crea l'agent
const agent = new Agent({
  model: 'qwen/qwen3-coder:free', // Modello gratuito su OpenRouter
  apiKey: process.env.OPENROUTER_API_KEY,
  instructions: 'Sei un assistente utile.',
  tools: [myTool]
})

// Usa l'agent
const response = await agent.run('Che ore sono?')
console.log(response.content)
```

### Chat interattiva con utilities

```javascript
import { Agent, createChatInterface } from 'ai-agent-toolkit'

const agent = new Agent({
  model: 'anthropic/claude-3-haiku', // Claude via OpenRouter
  apiKey: process.env.OPENROUTER_API_KEY,
  instructions: 'Sei un assistente AI utile e amichevole.',
  verbose: true
})

// Avvia chat interattiva
createChatInterface(agent, {
  welcomeMessage: '🤖 Ciao! Come posso aiutarti?',
  prompt: 'Tu: '
})
```

## 🖥️ Modalità d'uso: CLI, API server e Web GUI

Puoi usare questo toolkit in tre modi principali:

### 1. Interfaccia CLI (console)

Esegui la chat interattiva direttamente da terminale:

```bash
node example/basic.js
```

- Chatta con l'agente AI e prova i tool direttamente da console
- Ideale per sviluppo, debug e test rapidi

### 2. API server compatibile OpenAI/OpenRouter

Avvia il server API compatibile OpenAI (con tool calling):

```bash
node example/server.js
```

- Espone endpoint `/v1/chat/completions` e `/v1/models` compatibili con OpenAI
- Puoi collegare qualsiasi client OpenAI, plugin, o frontend custom

### 3. Web GUI (OpenWebUI)

Collega il server a una web UI moderna come [OpenWebUI](https://github.com/open-webui/open-webui):

- Interfaccia grafica user-friendly
- Supporta tool calling, history, modelli multipli
- **Guida dettagliata**: [openwebui.md](./openwebui.md)

> Consulta il file [`openwebui.md`](./openwebui.md) per istruzioni dettagliate su come collegare OpenWebUI al server e sfruttare tutte le funzionalità avanzate.

## 🎯 Modelli Supportati

Tramite **OpenRouter**, puoi usare tutti questi modelli:

### Gratuiti
- `qwen/qwen3-coder:free` - Ottimo per coding
- `microsoft/phi-3-mini-128k-instruct:free` - Veloce e leggero
- `mistralai/mistral-7b-instruct:free` - Bilanciato

### A Pagamento (Costi Ridotti)
- `anthropic/claude-3-haiku` - Veloce ed economico
- `openai/gpt-4o-mini` - GPT-4 economico
- `google/gemini-pro` - Google Gemini
- `anthropic/claude-3-sonnet` - Claude bilanciato
- `openai/gpt-4` - GPT-4 completo

### Enterprise
- `anthropic/claude-3-opus` - Claude più potente
- `openai/gpt-4-turbo` - GPT-4 avanzato

## 🛠 Tools Disponibili

### get_weather
Restituisce informazioni meteo per una città specifica.

**Parametri:**
- `city` (string): Nome della città
- `unit` (string, opzionale): Unità di temperatura ('celsius' o 'fahrenheit')

**Esempio:**
```
Che tempo fa a Roma?
```

### echo
Ripete il testo fornito dall'utente.

**Parametri:**
- `text` (string): Testo da ripetere
- `repeat_count` (number, opzionale): Numero di ripetizioni

**Esempio:**
```
Ripeti "Ciao mondo" 3 volte
```

### calculate
Esegue calcoli matematici semplici.

**Parametri:**
- `operation` (string): Operazione ('add', 'subtract', 'multiply', 'divide')
- `a` (number): Primo numero
- `b` (number): Secondo numero

**Esempio:**
```
Calcola 15 + 25
```

## 🎮 Comandi della Chat

- `exit` / `quit` - Esci dalla chat
- `reset` - Resetta la conversazione
- `history` - Mostra cronologia messaggi
- `tools` - Lista dei tools disponibili
- `debug on/off` - Attiva/disattiva modalità debug
- `help` - Mostra l'aiuto

## 🏗 Architettura

### Struttura del Progetto

```
simpleAgent/
├── agent.js          # Chat interattiva principale
├── AgentClass.js     # Classe Agent compatibile @openai/agents
├── Tool.js           # Classe base per tools
├── functions.js      # Definizione dei tools disponibili
├── package.json      # Configurazione npm
└── README.md         # Documentazione
```

### Classe Agent

La classe `Agent` è compatibile con l'interfaccia `@openai/agents` e supporta:

```javascript
// Inizializzazione con options object
const agent = new Agent({
  model: 'anthropic/claude-3-haiku', // Qualsiasi modello OpenRouter
  apiKey: process.env.OPENROUTER_API_KEY,
  instructions: 'Sei un assistente AI...',
  tools: availableTools,
  temperature: 0.7,
  maxIterations: 10,
  debug: false
})

// Metodi principali
await agent.run(message)           // Esegue una conversazione completa
await agent.step()                 // Esegue un singolo step
agent.reset()                      // Resetta la conversazione
agent.getHistory()                 // Ottiene la cronologia
agent.addTool(tool)               // Aggiunge un tool
agent.setDebug(true)              // Attiva debug
```

### Classe Tool

La classe `Tool` supporta sia schema Zod che JSON Schema tradizionali:

```javascript
// Con schema Zod
const weatherTool = new Tool({
  name: 'get_weather',
  description: 'Restituisce il meteo per una città',
  schema: z.object({
    city: z.string().describe('Nome della città'),
    unit: z.enum(['celsius', 'fahrenheit']).optional()
  }),
  handler: async ({ city, unit }) => {
    // Implementazione del tool
  }
})

// Con JSON Schema
const echoTool = new Tool({
  name: 'echo',
  description: 'Ripete un testo',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Testo da ripetere' }
    },
    required: ['text']
  },
  handler: async ({ text }) => {
    return `Echo: ${text}`
  }
})
```

## 🔄 Aggiungere Nuovi Tools

1. **Crea il tool:**

```javascript
export const myTool = new Tool({
  name: 'my_tool',
  description: 'Descrizione del mio tool',
  schema: z.object({
    param1: z.string().describe('Descrizione parametro'),
    param2: z.number().optional()
  }),
  handler: async ({ param1, param2 }) => {
    // La tua logica qui
    return 'Risultato del tool'
  }
})

// Aggiungi all'array dei tools disponibili
export const availableTools = [weatherTool, echoTool, calculateTool, myTool]
```

2. **Il tool sarà automaticamente disponibile nella chat!**

## 🔗 Setup OpenRouter

1. **Registrati su [OpenRouter.ai](https://openrouter.ai)**
2. **Ottieni la tua API key** dal dashboard
3. **Aggiungi crediti** (anche solo $5 durano mesi)
4. **Usa qualsiasi modello** con la stessa API key

### Vantaggi di OpenRouter:
- ✅ **Una sola API key** per tutti i modelli
- ✅ **Costi ridotti** fino al 50% rispetto alle API dirette  
- ✅ **Modelli gratuiti** disponibili per testing
- ✅ **Failover automatico** se un modello non è disponibile
- ✅ **Stesso formato** delle API OpenAI
- ✅ **Rate limiting** migliore

## 🐛 Debug

Attiva la modalità debug per vedere i dettagli delle chiamate API:

```bash
# Nella chat, digita:
debug on
```

Questo mostrerà:
- Risposte complete del modello
- Tool calls con parametri
- Risultati dei tools
- Numero di iterazioni

## 📚 Dipendenze

- `openai` - Client OpenAI (compatibile con OpenRouter)
- `dotenv` - Gestione variabili d'ambiente
- `zod` - Validazione schema e type safety
- `@openai/agents` - Interfaccia standard per agenti AI

## 🌐 API Supportate

### OpenRouter (Raccomandato)
- **URL**: `https://openrouter.ai/api/v1`
- **Modelli**: 50+ modelli disponibili
- **Costi**: Ridotti fino al 50%
- **Setup**: Una sola API key

### OpenAI (Supporto diretto)
- **URL**: `https://api.openai.com/v1`
- **Modelli**: GPT-3.5, GPT-4 serie
- **Costi**: Listino OpenAI standard

### Altri Provider
Il toolkit è compatibile con qualsiasi API che segue il formato OpenAI.

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch per la tua feature
3. Commit delle modifiche
4. Push al branch
5. Apri una Pull Request

## 📄 Licenza

ISC License - vedi file LICENSE per dettagli.
