import { callAI } from '@lvx74/openrrouter-ai-agent';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function parseJSON(content, tryAgain = true, logger = console) {

    //logger.log('🔍 parseJSON - Contenuto ricevuto (primi 200 caratteri):', content.substring(0, 200));

    try {
        // Tenta di trovare il primo blocco JSON valido
        if (content.startsWith('\\boxed{')) {
            content = content.replace('\\boxed{', '')
            //rimouvi l'ultimo carttere
            content = content.slice(0, -1);
        }



        // Trova la posizione del primo '{' o '['
        const startMatch = content.match(/[\{\[]/);
        const start = startMatch ? startMatch.index : -1;

        // Trova la posizione dell'ultimo '}' o ']'
        const endMatch = [...content.matchAll(/[\}\]]/g)].pop();
        const end = endMatch ? endMatch.index : -1;

        //logger.log('🔍 parseJSON - Posizioni JSON:', { start, end, contentLength: content.length });

        if (start === -1 || end === -1) {
            console.error('❌ Nessun blocco JSON trovato nel contenuto');
            logger.log('📄 Contenuto completo:', content);
            throw new Error('Blocco JSON non trovato');
        }

        let jsonString = content.substring(start, end + 1);
        //logger.log('🔍 parseJSON - JSON estratto (primi 200 caratteri):', jsonString.substring(0, 200));

        // Escape virgolette interne per evitare crash
        jsonString = jsonString.replace(/:\s*"([^"]*?)"(?=\s*,|\s*})/g, (match, group) => {
            const escaped = group.replace(/"/g, '\\"');
            return `: "${escaped}"`;
        });

        try {
            const parsed = JSON.parse(jsonString);
            Object.keys(parsed).forEach((key) => {
                if (key.indexOf('.') > -1) {
                    const newKey = key.replace(/\./g, '_');
                    parsed[newKey] = parsed[key];
                    delete parsed[key];
                }
            });
            //logger.log('✅ parseJSON - JSON parsato con successo');
            return parsed;
        } catch (error) {
            if (!tryAgain) {
                console.error('⚠️ Errore nel parsing JSON (nessun retry):', error.message);
                logger.log('📄 JSON fallito:', jsonString);
                throw error; // Rilancia l'errore se non si vuole riprovare
            }
            logger.log('⚠️ Errore nel parsing JSON, tentativo di correzione:', error.message);
            logger.log('📄 JSON malformato:', jsonString);

            //cerco di correggerlo con ai
            const prompt = `Correggi il seguente JSON malformato. Assicurati che sia un JSON valido e restituisci SOLO il JSON corretto, senza alcuna introduzione o spiegazione.\n\nJSON da correggere:\n${jsonString}`;
            const corrected = await callAI(prompt, 0.2, process.env.MODEL_CORREZIONE_JSON || process.env.SMALL_MODEL || 'qwen/qwen3-4b:free', 2, false);
            return parseJSON(corrected, false); // Riprova senza ulteriori tentativi
        }
    } catch (e) {
        console.error('❌ Errore fatale nel parsing JSON:', e);
        logger.log('📄 Contenuto originale completo:', content);
        throw e;
    }
}

export async function checkAndCompressHistory(history) {
    if (!Array.isArray(history)) {
        throw new Error('La cronologia deve essere un array');
    }

    if (history.length > (process.env.MAX_HISTORY_LENGTH || 40)) {
        console.log(`🔄 Cronologia troppo lunga (${history.length} messaggi), compressione in corso...`);

        const systemMessage = history.find(m => m.role === 'system');
        const data = history.filter(m => m.role !== 'system').slice(-10);
        return [systemMessage, ...data];

        //const latest = history.slice(-4);
        //  const data = history.slice(0, -4).filter(m => m.role !== 'system').slice(-(process.env.MAX_HISTORY_LENGTH || 40));
        // const prompt = fs.readFileSync(join(__dirname, '../prompts/summarize_conversation_prompt.txt'), 'utf-8') + '\n' + JSON.stringify(data);
        // const compressed = await callAI(prompt, 0.2, process.env.COMPRESS_MODEL || 'google/gemma-3n-e2b-it:free');
        // try {
        //     const parsed = await parseJSON(compressed, true);
        //     if (!parsed || typeof parsed !== 'object') {
        //         throw new Error('La risposta compressa non è un oggetto JSON valido');
        //     }
        //     return [...parsed, ...latest];
        // } catch (error) {
        //     console.error('❌ Errore nel parsing della risposta compressa:', error);
        //     return history.slice(0, -4).filter(m => m.role !== 'system').slice(-(process.env.MAX_HISTORY_LENGTH || 40))
        // }
    }
    return history;
}