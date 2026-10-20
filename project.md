
## Final project structure

```
ex5_chat_app/
├── app.py
├── services/
│   ├── ollama_service.py
│   └── transcription_service.py
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
├── tests/
│   ├── test_chat.py
│   └── test_audio.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

Keep your existing `app.py`, `templates/`, and `static/` files. Add the service and test files when implementing those features; don't create unnecessary empty files.

## Routes

| Method | Route                   | Purpose                                        |
| ------ | ----------------------- | ---------------------------------------------- |
| `GET`  | `/`                     | Render the Jinja2 chat interface               |
| `GET`  | `/api/health`           | Check backend status                           |
| `POST` | `/api/chat`             | Handle text prompts and optional image uploads |
| `POST` | `/api/audio/transcribe` | Transcribe uploaded or recorded audio          |

## Technology stack

- Backend: FastAPI
- Templates: Jinja2
- Frontend: HTML, CSS, JavaScript
- Image and text model: Ollama + `llava:7b`
- Audio transcription: local Whisper
- Chat persistence: not included yet

