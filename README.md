# AI Agent Toolkit

Un toolkit completo per creare agenti AI con tool calling, compatibile con l'interfaccia `@openai/agents`.

## 🚀 Caratteristiche

- **Compatibile con @openai/agents**: Segue l'interfaccia standard per agenti AI
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
# Modifica .env con le tue API keys
```

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
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
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

const agent = new Agent({ /* configurazione */ })

// Avvia chat interattiva
createChatInterface(agent, {
  welcomeMessage: '🤖 Ciao! Come posso aiutarti?',
  prompt: 'Tu: '
})
```

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
  model: 'qwen/qwen3-coder:free',
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

1. **Crea il tool in `functions.js`:**

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

- `openai` - Client OpenAI per API calls
- `dotenv` - Gestione variabili d'ambiente
- `zod` - Validazione schema e type safety
- `@openai/agents` - Interfaccia standard per agenti AI

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch per la tua feature
3. Commit delle modifiche
4. Push al branch
5. Apri una Pull Request

## 📄 Licenza

ISC License - vedi file LICENSE per dettagli.
