FROM python:3.11-slim

# HF Spaces runs containers as a non-root user
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Install torch CPU-only first to keep the image small
RUN pip install --user --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Then the rest
COPY --chown=user requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Pre-download the CLIP model so cold start is fast
RUN python -c "from transformers import CLIPProcessor, CLIPModel; \
  CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32'); \
  CLIPModel.from_pretrained('openai/clip-vit-base-patch32')"

# Copy the rest of the source code last
COPY --chown=user . .

# HF Spaces routes traffic to port 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]