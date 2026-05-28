---
title: StyleSync Processor
emoji: 👔
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# StyleSync Processor

Internal image-processing service for StyleSync. Strips backgrounds and
generates CLIP embeddings for clothing items.

## Endpoints

- `GET /` — health check
- `POST /process` — multipart upload of an image file; requires `X-Processor-Secret` header

This Space is private and not intended for public use.