import os
import re
import shutil
import tempfile
import io
import json
import asyncio
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import markdown as md_lib

# ── MarkItDown import ────────────────────────────────────────────────────────
try:
    from markitdown import MarkItDown
    markitdown_available = True
    import_error_msg = None
except Exception as e:
    markitdown_available = False
    import_error_msg = str(e)

# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MarkItDown.UI",
    description="Universal Document to Markdown Converter — Powered by Microsoft MarkItDown",
    version="2.0.0",
)

BASE_DIR   = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ── File Classification ───────────────────────────────────────────────────────
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".mp4"}

SUPPORTED_FORMATS = [
    "PDF (.pdf)",
    "Word (.docx, .doc)",
    "Excel (.xlsx, .xls)",
    "PowerPoint (.pptx)",
    "EPUB (.epub)",
    "Outlook Email (.msg)",
    "Jupyter Notebook (.ipynb)",
    "HTML (.html, .htm)",
    "Images (.png, .jpg, .jpeg, .webp) — requires exiftool or AI Vision",
    "Audio (.mp3, .wav, .m4a) — requires speech_recognition",
    "ZIP archives (.zip)",
    "JSON (.json)",
    "CSV (.csv)",
    "XML / RSS (.xml)",
    "Text & Markdown (.txt, .md)",
]


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>MarkItDown.UI Loading...</h1>")


@app.get("/healthz")
@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "markitdown_available": markitdown_available,
        "import_error": import_error_msg,
        "supported_formats": SUPPORTED_FORMATS,
    }


@app.post("/api/convert")
async def convert_files(
    files: List[UploadFile] = File(...),
    output_format: str = Form("markdown"),   # markdown | html | text | json
    enable_llm: str = Form("false"),
    api_key: Optional[str] = Form(None),
):
    if not markitdown_available:
        raise HTTPException(
            status_code=500,
            detail=f"Thư viện MarkItDown chưa sẵn sàng: {import_error_msg}",
        )

    if not files:
        raise HTTPException(status_code=400, detail="Vui lòng tải lên ít nhất 1 file.")

    use_llm = enable_llm.lower() in ("true", "1", "yes")

    # Instantiate MarkItDown with enable_plugins=True to support markitdown-ocr & community plugins
    if use_llm and api_key and api_key.strip():
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key.strip())
            md_converter = MarkItDown(enable_plugins=True, llm_client=client, llm_model="gpt-4o")
        except Exception:
            md_converter = MarkItDown(enable_plugins=True)
    else:
        md_converter = MarkItDown(enable_plugins=True)

    results = []

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp_dir:
        tmp = Path(tmp_dir)

        for upload in files:
            safe_name = upload.filename or "uploaded_file"
            dest = tmp / safe_name

            # ── Stream upload directly to disk in 1MB chunks (memory-efficient) ──
            with open(dest, "wb") as f_out:
                while chunk := await upload.read(1024 * 1024):
                    f_out.write(chunk)

            ext = dest.suffix.lower()

            try:
                # ── Offload CPU-heavy conversion to threadpool (non-blocking) ──
                converted = await asyncio.to_thread(md_converter.convert, str(dest))
                raw_md = converted.text_content if hasattr(converted, "text_content") else str(converted)

                # ── Scanned PDF detection & OCR fallback ───────────────────
                if ext == ".pdf":
                    # If document has no text or only dummy page headers
                    text_only = re.sub(r"#+\s*Page\s*\d+", "", raw_md).strip()
                    if not text_only or len(text_only) < 20:
                        ocr_result = await _try_pdf_ocr(dest, safe_name)
                        if ocr_result:
                            raw_md = ocr_result

                # ── Image handling ─────────────────────────────────────────
                elif ext in IMAGE_EXTS and not raw_md.strip():
                    if use_llm:
                        raw_md = (
                            f"### {safe_name}\n\n"
                            "> **Không thể mô tả ảnh.** Kiểm tra lại API key OpenAI và "
                            "đảm bảo model GPT-4o có quyền truy cập."
                        )
                    else:
                        raw_md = await _try_image_ocr(dest, safe_name)

                # ── Audio handling ─────────────────────────────────────────
                elif ext in AUDIO_EXTS and not raw_md.strip():
                    raw_md = (
                        f"### {safe_name}\n\n"
                        "> [!NOTE]\n"
                        "> **Audio cần thư viện nhận diện giọng nói để transcribe.**\n>\n"
                        "> Cài `speech_recognition` và `pydub` để bật tính năng này:\n>\n"
                        "> ```\n"
                        "> pip install SpeechRecognition pydub\n"
                        "> ```"
                    )

                # ── Empty fallback ────────────────────────────────────────
                elif not raw_md.strip():
                    raw_md = (
                        f"### {safe_name}\n\n"
                        "> Tài liệu không chứa văn bản có thể trích xuất. "
                        "Vui lòng kiểm tra lại file."
                    )

                # ── Format output ─────────────────────────────────────────
                title, lines = _extract_title(raw_md, safe_name)
                formatted, ext_out = _format_output(raw_md, output_format, title)

                results.append({
                    "filename":      safe_name,
                    "status":        "success",
                    "title":         title,
                    "markdown":      raw_md,
                    "output":        formatted,
                    "output_format": output_format,
                    "ext":           ext_out,
                    "char_count":    len(raw_md),
                    "word_count":    len(raw_md.split()),
                    "line_count":    len(lines),
                })

            except Exception as exc:
                results.append({
                    "filename": safe_name,
                    "status":   "error",
                    "error":    str(exc),
                })

    return JSONResponse(content={"results": results})


# ── Helpers ──────────────────────────────────────────────────────────────────
async def _ocr_pil_image(img, lang: str = "en") -> str:
    """Run OCR using Windows OCR (WinOCR on Windows) or Tesseract OCR (on Linux/Docker)."""
    # 1. Try winocr (native Windows)
    try:
        import winocr
        ocr_raw = await winocr.to_coroutine(winocr.recognize_pil(img, lang=lang))
        res = winocr.picklify(ocr_raw)
        txt = res.get("text", "").strip()
        if txt:
            return txt
    except Exception:
        pass

    # 2. Try pytesseract (native Linux / Docker)
    try:
        import pytesseract
        txt = await asyncio.to_thread(pytesseract.image_to_string, img, lang="eng+vie")
        if txt.strip():
            return txt.strip()
    except Exception:
        pass

    return ""


async def _try_pdf_ocr(dest: Path, safe_name: str) -> str:
    """Attempt OCR on scanned PDF using Windows OCR (winocr) or Tesseract (Linux)."""
    try:
        import io
        import pymupdf
        from PIL import Image

        pages_text = []
        with pymupdf.open(str(dest)) as doc:
            for idx, page in enumerate(doc):
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                txt = await _ocr_pil_image(img, lang="en")
                if txt:
                    pages_text.append(f"## Trang {idx + 1}\n\n{txt}")
                else:
                    pages_text.append(f"## Trang {idx + 1}\n\n*(Trang này không phát hiện ký tự văn bản)*")

        if pages_text and any("*(Trang này không phát hiện" not in p for p in pages_text):
            return (
                f"# {safe_name}\n\n"
                f"> [!NOTE]\n"
                f"> *Tài liệu scan — Nội dung được tự động trích xuất bằng OCR Engine ({len(pages_text)} trang)*\n\n"
                + "\n\n---\n\n".join(pages_text)
            )
    except Exception as e:
        print(f"[PDF OCR Error] {e}")

    return (
        f"### {safe_name}\n\n"
        "> [!NOTE]\n"
        "> **PDF này là tài liệu scan (hình ảnh), không chứa văn bản nhúng.**\n>\n"
        "> Để đọc nội dung với độ chính xác cao nhất, bật **AI Vision (GPT-4o)** "
        "với OpenAI API Key."
    )


async def _try_image_ocr(dest: Path, safe_name: str) -> str:
    """Attempt OCR on image file using Windows OCR or Tesseract."""
    try:
        from PIL import Image

        img = Image.open(str(dest))
        txt = await _ocr_pil_image(img, lang="en")
        if txt:
            return (
                f"# {safe_name}\n\n"
                f"> [!NOTE]\n"
                f"> *Văn bản trích xuất tự động qua OCR Engine:*\n\n"
                f"{txt}\n\n"
                f"> [!TIP]\n"
                f"> Để phân tích bố cục hình ảnh và mô tả ngữ cảnh chi tiết hơn, bật **AI Vision (GPT-4o)**."
            )
    except Exception as e:
        print(f"[Image OCR Error] {e}")

    return (
        f"### {safe_name}\n\n"
        "> [!NOTE]\n"
        "> **Hình ảnh cần AI Vision để trích xuất nội dung.**\n>\n"
        "> Bật **AI Vision (GPT-4o)** ở cột trái và nhập OpenAI API Key, "
        "sau đó thử chuyển đổi lại.\n>\n"
        "> Nếu chỉ muốn đọc metadata ảnh (EXIF), hãy cài [ExifTool](https://exiftool.org/) "
        "và thêm vào PATH hệ thống."
    )


def _extract_title(raw_md: str, fallback: str):
    lines = raw_md.strip().split("\n")
    title = fallback
    for line in lines:
        if line.startswith("# "):
            title = line[2:].strip()
            break
    return title, lines


def _format_output(raw_md: str, output_format: str, title: str):
    if output_format == "html":
        html_body = md_lib.markdown(
            raw_md,
            extensions=["tables", "fenced_code", "toc", "nl2br", "sane_lists"],
        )
        formatted = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
body{{font-family:'Segoe UI',system-ui,sans-serif;line-height:1.7;max-width:900px;margin:0 auto;padding:2.5rem 1.5rem;color:#111;background:#fff;}}
h1,h2,h3{{font-weight:800;border-bottom:3px solid #000;padding-bottom:.4rem;margin-top:1.8rem;}}
table{{border-collapse:collapse;width:100%;margin:1.5rem 0;border:3px solid #000;box-shadow:4px 4px 0 #000;}}
th,td{{border:2px solid #000;padding:10px 14px;text-align:left;}}
th{{background:#ffe600;font-weight:800;}}
tr:nth-child(even){{background:#f8fafc;}}
code{{background:#ffde59;border:1px solid #000;padding:2px 6px;border-radius:4px;font-family:monospace;font-weight:bold;}}
pre{{background:#0f172a;color:#38bdf8;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:1.2rem;border-radius:6px;overflow-x:auto;}}
pre code{{background:transparent;color:inherit;border:none;}}
blockquote{{border-left:6px solid #ff2e93;background:#fff0f5;padding:1rem 1.2rem;font-weight:600;margin:1.5rem 0;}}
a{{color:#ff2e93;font-weight:700;}}
</style>
</head>
<body>
{html_body}
</body>
</html>"""
        return formatted, ".html"

    elif output_format == "text":
        plain = re.sub(r"#+\s+", "", raw_md)
        plain = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", plain)
        plain = re.sub(r"`([^`]+)`", r"\1", plain)
        plain = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", plain)
        plain = re.sub(r"^[-*+]\s+", "", plain, flags=re.MULTILINE)
        plain = re.sub(r"^\d+\.\s+", "", plain, flags=re.MULTILINE)
        plain = re.sub(r"\n{3,}", "\n\n", plain)
        return plain.strip(), ".txt"

    elif output_format == "json":
        lines = raw_md.strip().split("\n")
        formatted = json.dumps(
            {
                "filename":        None,
                "title":           title,
                "character_count": len(raw_md),
                "word_count":      len(raw_md.split()),
                "line_count":      len(lines),
                "markdown_content": raw_md,
            },
            indent=2,
            ensure_ascii=False,
        )
        return formatted, ".json"

    # Default: Markdown
    return raw_md, ".md"


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.getenv("PORT", 8080))
    print(f"[MarkItDown.UI] Running at http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
