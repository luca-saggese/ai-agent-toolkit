import express from 'express';
const app = express();
const port = 11434;
import cors from 'cors'
// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization']
}))
app.use(express.json());

app.post('/v1/chat/completions', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const writeChunk = (chunk) => {
        console.log("Sending chunk:");
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    };

    // Sleep helper
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    (async () => {
        // 1. role: assistant
        writeChunk({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "qwen/qwen3-coder:free",
            choices: [
                {
                    index: 0,
                    delta: {
                        role: "assistant",
                        "content": "Lancio il tool calculate\n"
                    }
                }
            ]
        });
        await sleep(2000);

        // 2. tool_calls + finish_reason: tool_calls
        writeChunk({
            "id": "chatcmpl-1",
            "object": "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000) +1,
            "model": "qwen/qwen3-coder:free",
            "choices": [
                {
                    "index": 0,
                    "delta":
                    {
                        "tool_calls":
                            [
                                {
                                    "index": 0,
                                    "id": "call_e9110a757e784bdb91eae5de",
                                    "type": "function",
                                    "function": {
                                        "name": "calculate",
                                        "arguments": "{\"expression\": \"43242423 * 4324234\"}"
                                    }
                                    
                                }
                            ],
                        "results":
                            [
                                {
                                    "tool_call_id": "call_e9110a757e784bdb91eae5de",
                                    "content": "risposta ricevuta 10"
                                }
                            ]
                    }
                    
                }
            ]
        })
        await sleep(2000);

         writeChunk({
            "id": "chatcmpl-1",
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "qwen/qwen3-coder:free",
            choices: [{
                index: 0,
                delta: {},
                finish_reason: "tool_calls"
            }]
        });

        writeChunk({
            "id": "chatcmpl-1",
            "object": "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000) +1,
            "model": "qwen/qwen3-coder:free",
            "choices": [
                {
                    "index": 0,

                    delta: {
                        role: "tool",
                        "content": "risposta ricevuta 10\n"
                    }
                }
            ]
        })
        await sleep(2000);

        // 3. [DONE]
        console.log("Sending DONE chunk");
        res.write('data: [DONE]\n\n');
        res.end();
    })();
});

app.listen(port, () => {
    console.log(`Mock LLM server listening on http://localhost:${port}`);
});
