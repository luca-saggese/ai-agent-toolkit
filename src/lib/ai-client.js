import OpenAI from 'openai'

export async function callAI(prompt, temperature = 0.7, model = process.env.MODEL ||'qwen/qwen3-4b:free', systemPrompt = 'You are a helpful assistant.', retry = 10, stream = false) {
    const openai = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
    })
    try {
        const res = await openai.chat.completions.create({
            model,
            prompt: `${systemPrompt}\n\nUser: ${prompt}`,
            temperature: temperature
        })
        if(res.error) {
            throw new Error(`OpenAI API error: ${res.error.message}`);
        }
        //console.log('AI response:', res);
        const {usage} = res;
        console.log('Usage:', usage);
        const msg = res.choices[0].text.trim();
        return msg
    } catch (error) {
        // Mostra il body della risposta se disponibile (es. 400)
        if (error.response && error.response.data) {
            console.error('API error response:', error.response.data);
        }
        console.error(error);
        throw error;
    }
}
