FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    EXIFTOOL_PATH=/usr/bin/exiftool \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    ORT_DISABLE_TELEMETRY=1

# Install system dependencies: Tesseract OCR (Eng/Vie), Exiftool, FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libimage-exiftool-perl \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-osd \
    tesseract-ocr-vie \
    && rm -rf /var/lib/apt/lists/*

# HuggingFace Spaces requirement: non-root user with UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy application files with ownership
COPY --chown=user:user . $HOME/app

# Install Python packages
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    $HOME/app/packages/markitdown[all] \
    $HOME/app/packages/markitdown-ocr \
    fastapi \
    uvicorn \
    python-multipart \
    pymupdf \
    markdown \
    pillow \
    pytesseract \
    openai

EXPOSE 8080

CMD ["sh", "-c", "uvicorn web_app.server:app --host 0.0.0.0 --port ${PORT:-8080}"]
