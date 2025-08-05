import OpenAI from 'openai'

export async function callAI(prompt, temperature = 0.7, model = process.env.MODEL || 'qwen/qwen3-4b:free', systemPrompt = 'You are a helpful assistant.', retry = 10, stream = false) {
    const openai = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
    })
    let lastError;
    const [model1, model2 = model1] = model.split(',');
    for (let attempt = 1; attempt <= retry; attempt++) {
        try {
            const res = await openai.chat.completions.create({
                model: attempt === 1 ? model1 : model2,
                prompt: `${systemPrompt}\n\nUser: ${prompt}`,
                temperature: temperature
            })
            if (res.error) {
                throw new Error(`OpenAI API error: ${res.error.message}`);
            }
            const { usage } = res;
            console.log('Usage:', usage);
            const msg = res.choices[0].text.trim();
            if (!msg) {
                throw new Error('Risposta vuota dal modello');
            }
            return msg
        } catch (error) {
            lastError = error;
            if (error.response && error.response.data) {
                console.error('API error response:', error.response.data);
            }
            console.error(`Tentativo ${attempt} fallito:`, error.message);
            if (attempt < retry) {
                await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }
    }
    throw lastError;
}
