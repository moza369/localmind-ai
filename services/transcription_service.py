import whisper

model = whisper.load_model("base")

def transcribe_audio(audio):
    result = model.transcribe(audio)
    return result["text"].strip()

