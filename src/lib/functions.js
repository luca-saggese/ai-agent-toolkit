import { Tool } from '../Tool.js'
import { z } from 'zod'

/**
 * Tool per ottenere informazioni meteo usando schema Zod
 */
export const finalAnswerTool = new Tool({
  name: 'final_answer',
  description: 'Usa questo tool per fornire la risposta finale e completa all\'utente quando hai finito di raccogliere tutte le informazioni necessarie.',
  schema: z.object({
    answer: z.string().describe('La risposta finale da fornire all\'utente')
  }),
  handler: async ({ answer }) => {
    console.log('✅ Chiamato il tool final_answer.');
    return answer;
  }
})


// Array di tutti i tools disponibili
export const availableTools = [finalAnswerTool]
