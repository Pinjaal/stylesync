"""
StyleSync image processor.

POST /process — takes an image, removes background, generates a CLIP embedding.
Returns the cleaned image (base64 PNG) plus the embedding (list of 512 floats).
"""

import io
import os
import base64

import torch
from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from PIL import Image
from rembg import remove
from transformers import CLIPProcessor, CLIPModel

# --- config ---
PROCESSOR_SECRET = os.environ.get("PROCESSOR_SECRET")
CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"
MAX_IMAGE_DIM = 1024  # downsize before processing to keep things fast

# --- load models once at startup (slow on first run — downloads weights) ---
print(f"Loading {CLIP_MODEL_NAME}...")
device = "cpu"
clip_model = CLIPModel.from_pretrained(CLIP_MODEL_NAME).to(device)
clip_processor = CLIPProcessor.from_pretrained(CLIP_MODEL_NAME)
clip_model.eval()
print("Models loaded.")

app = FastAPI(title="StyleSync Processor")


def _check_auth(secret: str | None):
    if not PROCESSOR_SECRET:
        raise HTTPException(status_code=500, detail="PROCESSOR_SECRET not configured on server")
    if secret != PROCESSOR_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Processor-Secret header")


def _downsize(img: Image.Image, max_dim: int) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= max_dim:
        return img
    scale = max_dim / longest
    return img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


@app.get("/")
def health():
    return {"status": "ok", "model": CLIP_MODEL_NAME}


@app.post("/process")
async def process(
    file: UploadFile = File(...),
    x_processor_secret: str | None = Header(default=None),
):
    _check_auth(x_processor_secret)

    # Read and decode the upload
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode uploaded image")

    image = _downsize(image, MAX_IMAGE_DIM)

    # Remove background — returns an RGBA PIL image
    cleaned = remove(image)

    # CLIP embedding (CLIP needs RGB)
    rgb_for_clip = cleaned.convert("RGB")
    inputs = clip_processor(images=rgb_for_clip, return_tensors="pt").to(device)
    with torch.no_grad():
        features = clip_model.get_image_features(**inputs)
    # Some transformers versions return a wrapped object instead of a plain tensor
    # Some transformers versions return a wrapped object instead of a plain tensor
    if hasattr(features, 'image_embeds'):
        features = features.image_embeds
    elif hasattr(features, 'pooler_output'):
        features = features.pooler_output
    # L2-normalize for cosine similarity (matches pgvector's vector_cosine_ops)
    features = features / features.norm(dim=-1, keepdim=True)
    embedding = features[0].cpu().tolist()

    # Encode cleaned image as base64 PNG
    buf = io.BytesIO()
    cleaned.save(buf, format="PNG")
    cleaned_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    return {
        "cleaned_image_b64": cleaned_b64,
        "embedding": embedding,
    }

@app.post("/embed_text")
async def embed_text(
    payload: dict,
    x_processor_secret: str | None = Header(default=None),
):
    """Embed a text query for similarity search."""
    _check_auth(x_processor_secret)
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")

    inputs = clip_processor(text=[text], return_tensors="pt", padding=True, truncation=True).to(device)
    with torch.no_grad():
        features = clip_model.get_text_features(**inputs)

    # Same shape-handling pattern as /process for older transformers versions
    if hasattr(features, 'text_embeds'):
        features = features.text_embeds
    elif hasattr(features, 'pooler_output'):
        features = features.pooler_output

    features = features / features.norm(dim=-1, keepdim=True)
    return {"embedding": features[0].cpu().tolist()}