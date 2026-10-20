
const messageInput = document.getElementById("message-input");
const imageInput = document.getElementById("image-input");
const audioInput = document.getElementById("audio-input");
const preview = document.getElementById("attachment-preview");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");

let selectedImage = null;
let selectedAudio = null;
let mediaRecorder = null;
let recordedChunks = [];
let previewImageUrl = null;

document.getElementById("image-button").addEventListener("click", () => {
    imageInput.click();
});

document.getElementById("audio-button").addEventListener("click", () => {
    audioInput.click();
});

function renderPreview() {
    if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
        previewImageUrl = null;
    }

    preview.replaceChildren();
    preview.classList.add("attachment-list");
    preview.hidden = !selectedImage && !selectedAudio;

    function createAttachment(file, type) {
        const card = document.createElement("div");
        card.className = "attachment-card";

        if (type === "image") {
            const thumbnail = document.createElement("img");
            previewImageUrl = URL.createObjectURL(file);
            thumbnail.src = previewImageUrl;
            thumbnail.alt = file.name;
            card.appendChild(thumbnail);
        } else {
            const icon = document.createElement("span");
            icon.className = "attachment-icon";
            icon.textContent = "♫";
            card.appendChild(icon);
        }

        const name = document.createElement("span");
        name.className = "attachment-name";
        name.textContent = file.name;
        name.title = file.name;
        card.appendChild(name);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "attachment-remove";
        remove.textContent = "×";
        remove.title = "Remove attachment";
        remove.setAttribute("aria-label", `Remove ${file.name}`);

        remove.addEventListener("click", () => {
            if (type === "image") {
                selectedImage = null;
                imageInput.value = "";
            } else {
                selectedAudio = null;
                audioInput.value = "";
            }

            renderPreview();
        });

        card.appendChild(remove);
        preview.appendChild(card);
    }

    if (selectedImage) {
        createAttachment(selectedImage, "image");
    }

    if (selectedAudio) {
        createAttachment(selectedAudio, "audio");
    }
}

imageInput.addEventListener("change", () => {
    selectedImage = imageInput.files[0] || null;
    renderPreview();
});

audioInput.addEventListener("change", () => {
    selectedAudio = audioInput.files[0] || null;
    renderPreview();
});

document.getElementById("record-button").addEventListener("click", async (event) => {
    const button = event.currentTarget;

    if (mediaRecorder?.state === "recording") {
        mediaRecorder.stop();
        button.innerHTML = '🎙 <span>Record</span>';
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        });

        mediaRecorder.addEventListener("stop", () => {
            selectedAudio = new File(
                recordedChunks,
                "recording.webm",
                { type: mediaRecorder.mimeType || "audio/webm" }
            );

            stream.getTracks().forEach((track) => track.stop());
            renderPreview();
        });

        mediaRecorder.start();
        button.innerHTML = '■ <span>Stop recording</span>';
    } catch (error) {
        console.error("Microphone error:", error);
        alert("Microphone access failed. Check your browser permissions.");
    }
});

function createMessageAttachment(file, type) {
    const chip = document.createElement("div");
    chip.className = "message-attachment";

    const icon = document.createElement("span");
    icon.textContent = type === "image" ? "▧" : "♫";

    const name = document.createElement("span");
    name.textContent = file.name;
    name.title = file.name;

    chip.append(icon, name);
    return chip;
}

function addMessage(text, role, imageFile = null, audioFile = null) {
    const message = document.createElement("div");
    message.className = `message ${role}`;

    if (text) {
        const textElement = document.createElement("div");
        textElement.className = "message-text";
        textElement.textContent = text;
        message.appendChild(textElement);
    }

    if (imageFile || audioFile) {
        const attachments = document.createElement("div");
        attachments.className = "message-attachments";

        if (imageFile) {
            attachments.appendChild(
                createMessageAttachment(imageFile, "image")
            );
        }

        if (audioFile) {
            attachments.appendChild(
                createMessageAttachment(audioFile, "audio")
            );
        }

        message.appendChild(attachments);
    }

    messages.appendChild(message);
    return message;
}

function addThinkingMessage() {
    const message = document.createElement("div");
    message.className = "message assistant thinking-message";

    const label = document.createElement("span");
    label.textContent = "Thinking";

    const dots = document.createElement("span");
    dots.className = "thinking-dots";

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        dot.className = "thinking-dot";
        dots.appendChild(dot);
    }

    message.append(label, dots);
    messages.appendChild(message);

    return message;
}

document.getElementById("send-button").addEventListener("click", async () => {
    const text = messageInput.value.trim();

    if (!text && !selectedImage && !selectedAudio) {
        return;
    }

    welcome.hidden = true;

    const imageToSend = selectedImage;
    const audioToSend = selectedAudio;

    addMessage(text, "user", imageToSend, audioToSend);
    const thinkingMessage = addThinkingMessage();

    messageInput.value = "";
    imageInput.value = "";
    audioInput.value = "";
    selectedImage = null;
    selectedAudio = null;
    renderPreview();

    let response;

    try {
        if (audioToSend) {
            const form = new FormData();

            form.append("audio", audioToSend);
            form.append("message", text);

            if (imageToSend) {
                form.append("image", imageToSend);
            }

            response = await fetch("/api/chat/audio", {
                method: "POST",
                body: form
            });
        } else if (imageToSend) {
            const form = new FormData();

            form.append("image", imageToSend);
            form.append("message", text);

            response = await fetch("/api/chat/image", {
                method: "POST",
                body: form
            });
        } else if (text) {
            response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: text })
            });
        } else {
            thinkingMessage.remove();
            return;
        }

        if (!response.ok) {
            const details = await response.text();
            console.error("API error:", details);
            throw new Error(`HTTP ${response.status}: ${details}`);
        }

        const data = await response.json();

        thinkingMessage.remove();
        addMessage(data.response, "assistant");
    } catch (error) {
        console.error("Chat error:", error);

        thinkingMessage.remove();
        addMessage(`Error: ${error.message}`, "assistant");
    }
});

document.getElementById("clear-chat").addEventListener("click", clearChat);
document.getElementById("new-chat").addEventListener("click", clearChat);

function clearChat() {
    messages.replaceChildren();
    messageInput.value = "";
    selectedImage = null;
    selectedAudio = null;
    imageInput.value = "";
    audioInput.value = "";
    renderPreview();
    welcome.hidden = false;
}
