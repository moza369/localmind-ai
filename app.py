from fastapi import FastAPI, Request, File, UploadFile, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from services.transcription_service import transcribe_audio
import ollama
import os
import tempfile



# Pydantic is a Python library that validates data and checks that it has the correct types and structure. FastAPI uses it extensively to validate incoming API requests automatically.



app = FastAPI(title="Local multimodel assistante")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

Model = "llava:7b"

class ChatRequest(BaseModel):
    message: str

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.get("/api/health")
async def health():
    return {"status":"ok","app":"Local AI Assistant"}


@app.post("/api/chat")
async def chat(data: ChatRequest):

    messages = [
        {
            "role":"user",
            "content": data.message
        }
    ]
    response = ollama.chat(
        model=Model,
        messages=messages
    )
    return {"response":response["message"]["content"]}


# Form() and File() should use ... to indicate that both fields are required.

@app.post("/api/chat/image")
async def chat_image(message: str = Form(...), image: UploadFile = File(...)):

    image_bytes = await image.read()
    image_size  = len(image_bytes)

    messages = [
        {
            "role":"user",
            "content": message,
            "images": [image_bytes] # Ollama expects images to be a list of images, so wrap image_bytes in square brackets:
        }
    ]

    response = ollama.chat(
        model=Model,
        messages = messages
    )
    
    return {"response": response["message"]["content"]}

@app.post("/api/chat/audio")

async def chat_audio(message:str = Form(""), audio: UploadFile | None = File(None), image: UploadFile | None = File(None)):

    instruction = message

    audio_path = None
    image_bytes = None

    try:
        if (image):
            image_bytes = await image.read()
            image_size  = len(image_bytes)

        audio_bytes = None

        if (audio):
            audio_bytes = await audio.read()
            audio_file_name = os.path.splitext(audio.filename or "")[1] or ".tmp"

            with tempfile.NamedTemporaryFile(suffix=audio_file_name, delete=False) as audio_tempfile:
                audio_tempfile.write(audio_bytes)
                audio_tempfile.flush()
                audio_path = audio_tempfile.name
                
            transcription = transcribe_audio(audio_path)
            instruction = f"{message}\n{transcription}".strip()

        messages = [
            {
                "role": "user",
                "content": instruction,

            }
        ]

        if image_bytes is not None:
            messages[0]["images"] = [image_bytes]

        response = ollama.chat(
            model=Model,
            messages = messages
        )

    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


    return {"response":response["message"]["content"]}