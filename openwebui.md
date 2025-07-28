# OpenWebUI + OpenRouter Agent Server: Guida rapida

Questa guida ti aiuta a collegare OpenWebUI al tuo server compatibile OpenAI/OpenRouter (ad esempio `example/server.js` di questo progetto) per sfruttare tool calling e modelli custom.

## 1. Avvia il server compatibile OpenAI

Assicurati che il tuo server (ad esempio `example/server.js`) sia in esecuzione sulla porta 11434:

```sh
node example/server.js
```

## 2. Avvia OpenWebUI collegato al tuo server

Esegui OpenWebUI in modalità Docker, collegandolo al server tramite la variabile `OPENAI_API_BASE_URL` (che in realtà punta al tuo endpoint OpenAI compatibile):

```sh
docker run -d \
  -p 3000:8080 \
  --network=host \
  -v open-webui:/app/backend/data \
  -e OPENAI_API_BASE_URL=http://127.0.0.1:11434/v1 \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

> **Nota:** OpenWebUI si aspetta un endpoint compatibile OpenAI/OLLAMA. Il server di questo progetto implementa `/v1/chat/completions` e `/v1/models` secondo lo standard OpenAI.

## 3. Accedi a OpenWebUI

Apri il browser su [http://localhost:3000](http://localhost:3000)

- Scegli il modello tra quelli disponibili (es. "qwen/qwen3-coder:free")
- Puoi usare tool calling e funzioni custom definite nel server

## 4. Debug e suggerimenti

- Se vedi errori di parsing o lo spinner non si ferma, assicurati che il server invii i chunk secondo lo standard OpenAI (vedi esempio in `test_server.js`)
- Puoi modificare/aggiungere tools in `src/Tool.js` o direttamente nella lista `defaultTools` in `example/server.js`
- Per testare solo la connessione, puoi usare anche il mock server `test_server.js`

## 5. Esempio di endpoint supportati

- `POST /v1/chat/completions`  (streaming e tool calling)
- `GET /v1/models`  (lista modelli)
- `GET /v1/tools`   (opzionale, lista tools custom)

---

Per problemi o domande, consulta il README o apri una issue.
