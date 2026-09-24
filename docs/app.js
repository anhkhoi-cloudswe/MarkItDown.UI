/**
 * MarkItDown.UI — Web Application Logic
 * Powered by Microsoft MarkItDown
 * Includes Full EN / VI Internationalization & 50MB Upload Guard
 */

document.addEventListener("DOMContentLoaded", () => {
    // ─── DOM References ───────────────────────────────────────────────────────
    const dropzone          = document.getElementById("dropzone");
    const fileInput         = document.getElementById("fileInput");
    const fileListContainer = document.getElementById("fileListContainer");
    const fileList          = document.getElementById("fileList");
    const fileCountBadge    = document.getElementById("fileCountBadge");
    const clearFilesBtn     = document.getElementById("clearFilesBtn");

    const radioCards        = document.querySelectorAll(".radio-card");
    const enableLlmToggle   = document.getElementById("enableLlmToggle");
    const aiConfigBody      = document.getElementById("aiConfigBody");
    const apiKeyInput       = document.getElementById("apiKeyInput");

    const convertBtn        = document.getElementById("convertBtn");
    const loadingOverlay    = document.getElementById("loadingOverlay");
    const loadingMsg        = document.getElementById("loadingMsg");

    const emptyState        = document.getElementById("emptyState");
    const viewContent       = document.getElementById("viewContent");
    const resultsTabs       = document.getElementById("resultsTabs");

    const statFilename      = document.getElementById("statFilename");
    const statWordCount     = document.getElementById("statWordCount");
    const statCharCount     = document.getElementById("statCharCount");
    const statLineCount     = document.getElementById("statLineCount");

    const copyResultBtn     = document.getElementById("copyResultBtn");
    const downloadResultBtn = document.getElementById("downloadResultBtn");
    const tabBtns           = document.querySelectorAll(".tab-btn");
    const renderedViewPane  = document.getElementById("renderedViewPane");
    const rawViewPane       = document.getElementById("rawViewPane");
    const renderedMarkdown  = document.getElementById("renderedMarkdown");
    const rawCodeText       = document.getElementById("rawCodeText");
    const toast             = document.getElementById("toast");
    const toastMsg          = document.getElementById("toastMsg");

    // Language switcher buttons
    const langBtns          = document.querySelectorAll(".lang-btn");

    // Translatable DOM elements
    const card1Title        = document.getElementById("card1Title");
    const dropTitle         = document.getElementById("dropTitle");
    const dropSubtitle      = document.getElementById("dropSubtitle");
    const selectedFilesLabel= document.getElementById("selectedFilesLabel");
    const clearFilesBtnText = document.getElementById("clearFilesBtnText");
    const card2Title        = document.getElementById("card2Title");
    const aiVisionLabel     = document.getElementById("aiVisionLabel");
    const aiVisionDesc      = document.getElementById("aiVisionDesc");
    const ocrBadge          = document.getElementById("ocrBadge");
    const ocrDesc           = document.getElementById("ocrDesc");
    const convertBtnText    = document.getElementById("convertBtnText");
    const resultsTitle      = document.getElementById("resultsTitle");
    const copyResultText    = document.getElementById("copyResultText");
    const downloadResultText= document.getElementById("downloadResultText");
    const statWordsLabel    = document.getElementById("statWordsLabel");
    const statCharsLabel    = document.getElementById("statCharsLabel");
    const statLinesLabel    = document.getElementById("statLinesLabel");
    const emptyTitle        = document.getElementById("emptyTitle");
    const emptyDesc         = document.getElementById("emptyDesc");
    const docGroupLabel     = document.getElementById("docGroupLabel");
    const imgGroupLabel     = document.getElementById("imgGroupLabel");
    const audioGroupLabel   = document.getElementById("audioGroupLabel");
    const dataGroupLabel    = document.getElementById("dataGroupLabel");
    const loadingHeader     = document.getElementById("loadingHeader");
    const tabPreview        = document.getElementById("tabPreview");
    const tabSource         = document.getElementById("tabSource");
    const pillLimitBadge    = document.getElementById("pillLimitBadge");

    // ─── Constants & Limits ───────────────────────────────────────────────────
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

    // Automatically detect Backend API Base URL
    // When running locally: "" (same-origin)
    // When running on GitHub Pages or custom domain: point to Render Web Service URL
    const DEFAULT_REMOTE_BACKEND = "https://markitdown-ui-vmg0.onrender.com";
    const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const API_BASE_URL = IS_LOCAL ? "" : DEFAULT_REMOTE_BACKEND;

    // Pre-warm backend immediately on page load (wakes up Render before user clicks Convert)
    fetch(`${API_BASE_URL}/api/health`).catch(() => {});

    // ─── i18n Translations ────────────────────────────────────────────────────
    const TRANSLATIONS = {
        en: {
            pageTitle: "MarkItDown.UI — Universal Document Converter by Microsoft",
            card1Title: "1. SELECT FILES",
            filesCount: (n) => `${n} File${n !== 1 ? "s" : ""}`,
            dropTitle: "Tap or Drop files here",
            dropSubtitle: "or tap to browse • Max 50MB/file",
            pillLimit: "MAX 50MB",
            selectedFiles: "Selected files:",
            clearAll: "Clear all",
            card2Title: "2. OUTPUT FORMAT",
            aiVisionTitle: "AI Vision (GPT-4o)",
            aiVisionDesc: "For images & scanned documents",
            apiKeyPlaceholder: "OpenAI API Key (sk-...)",
            ocrReadyBadge: "OCR READY",
            ocrReadyDesc: "Automatic text recognition for scanned PDFs & images",
            convertBtn: "CONVERT NOW",
            resultsTitle: "CONVERSION RESULTS",
            copyBtn: "Copy",
            downloadBtn: "Download",
            noFileSelected: "No file selected",
            words: "words",
            chars: "chars",
            lines: "lines",
            tabPreview: "Preview",
            tabSource: "Source",
            readyTitle: "READY TO CONVERT",
            readyDesc: "Select your files, choose an output format, then click <strong>\"CONVERT NOW\"</strong>",
            docGroup: "📄 Documents",
            imgGroup: "🖼️ Images <em>(requires AI Vision)</em>",
            audioGroup: "🎵 Audio <em>(requires speech lib)</em>",
            dataGroup: "📊 Data & Code",
            processingTitle: "PROCESSING...",
            processingDesc: "Running Microsoft MarkItDown engine...",
            processingFile: (n, name) => `Processing: ${n > 1 ? n + " files" : name}...`,
            toastCopied: "✅ Copied to clipboard!",
            toastNoContentCopy: "No content to copy",
            toastNoContentDownload: "No content to download",
            toastDownloaded: (name) => `⬇️ Downloaded: ${name}`,
            toastSelectAtLeastOne: "⚠️ Please select at least 1 file!",
            toastFileTooLarge: (name, size) => `⚠️ File "${name}" (${size}) exceeds the 50MB limit!`,
            toastAiVisionHint: "💡 Enable AI Vision for best image extraction results",
            toastAudioHint: "🎵 Audio files require speech_recognition library to transcribe",
            toastCompletedOk: (n) => `✅ Completed ${n} file${n !== 1 ? "s" : ""}!`,
            toastCompletedMixed: (ok, err) => `⚠️ ${ok} succeeded, ${err} failed`,
            toastError: (err) => `❌ Error: ${err}`,
            warnNeedsLlm: " (⚠️ requires AI Vision)",
            warnNeedsLib: " (⚠️ requires speech lib)",
            removeBtnTitle: "Remove",
            failedToProcess: (name) => `⚠️ Failed to process "${name}"`,
        },
        vi: {
            pageTitle: "MarkItDown.UI — Công cụ chuyển đổi tài liệu đa năng của Microsoft",
            card1Title: "1. CHỌN TỆP",
            filesCount: (n) => `${n} Tệp`,
            dropTitle: "Chạm hoặc Thả tệp vào đây",
            dropSubtitle: "hoặc chạm để chọn • Tối đa 50MB/tệp",
            pillLimit: "TỐI ĐA 50MB",
            selectedFiles: "Tệp đã chọn:",
            clearAll: "Xóa hết",
            card2Title: "2. ĐỊNH DẠNG ĐẦU RA",
            aiVisionTitle: "AI Vision (GPT-4o)",
            aiVisionDesc: "Dành cho ảnh & tài liệu scan",
            apiKeyPlaceholder: "OpenAI API Key (sk-...)",
            ocrReadyBadge: "OCR SẴN SÀNG",
            ocrReadyDesc: "Tự động nhận diện chữ cho PDF scan & ảnh",
            convertBtn: "CHUYỂN ĐỔI NGAY",
            resultsTitle: "KẾT QUẢ CHUYỂN ĐỔI",
            copyBtn: "Sao chép",
            downloadBtn: "Tải về",
            noFileSelected: "Chưa có tệp nào",
            words: "từ",
            chars: "ký tự",
            lines: "dòng",
            tabPreview: "Xem trước",
            tabSource: "Mã nguồn",
            readyTitle: "SẴN SÀNG CHUYỂN ĐỔI",
            readyDesc: "Chọn tệp, chọn định dạng đầu ra, rồi nhấn <strong>\"CHUYỂN ĐỔI NGAY\"</strong>",
            docGroup: "📄 Tài liệu",
            imgGroup: "🖼️ Hình ảnh <em>(cần AI Vision)</em>",
            audioGroup: "🎵 Âm thanh <em>(cần speech lib)</em>",
            dataGroup: "📊 Dữ liệu & Mã nguồn",
            processingTitle: "ĐANG XỬ LÝ...",
            processingDesc: "Đang chạy engine Microsoft MarkItDown...",
            processingFile: (n, name) => `Đang xử lý: ${n > 1 ? n + " tệp" : name}...`,
            toastCopied: "✅ Đã sao chép vào clipboard!",
            toastNoContentCopy: "Chưa có nội dung để sao chép",
            toastNoContentDownload: "Chưa có nội dung để tải",
            toastDownloaded: (name) => `⬇️ Đã tải: ${name}`,
            toastSelectAtLeastOne: "⚠️ Vui lòng chọn ít nhất 1 tệp!",
            toastFileTooLarge: (name, size) => `⚠️ Tệp "${name}" (${size}) vượt quá giới hạn 50MB!`,
            toastAiVisionHint: "💡 Bật AI Vision để có kết quả đọc ảnh tốt nhất",
            toastAudioHint: "🎵 Tệp âm thanh cần cài speech_recognition để chuyển thành văn bản",
            toastCompletedOk: (n) => `✅ Hoàn tất ${n} tệp!`,
            toastCompletedMixed: (ok, err) => `⚠️ ${ok} thành công, ${err} lỗi`,
            toastError: (err) => `❌ Lỗi: ${err}`,
            warnNeedsLlm: " (⚠️ cần AI Vision)",
            warnNeedsLib: " (⚠️ cần speech lib)",
            removeBtnTitle: "Xóa",
            failedToProcess: (name) => `⚠️ Không thể xử lý "${name}"`,
        }
    };

    let currentLang = localStorage.getItem("markitdown_lang") || "en";

    function t(key, ...args) {
        const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
        const val  = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.en[key] || key);
        if (typeof val === "function") {
            return val(...args);
        }
        return val;
    }

    function applyLanguage(lang) {
        currentLang = lang;
        localStorage.setItem("markitdown_lang", lang);
        document.documentElement.lang = lang;
        document.title = t("pageTitle");

        // Update switcher buttons active state
        langBtns.forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
        });

        // Update UI text
        if (card1Title)         card1Title.innerHTML = `<i data-lucide="upload-cloud"></i> ${t("card1Title")}`;
        if (dropTitle)          dropTitle.textContent = t("dropTitle");
        if (dropSubtitle)       dropSubtitle.textContent = t("dropSubtitle");
        if (pillLimitBadge)     pillLimitBadge.textContent = t("pillLimit");
        if (selectedFilesLabel) selectedFilesLabel.textContent = t("selectedFiles");
        if (clearFilesBtnText)  clearFilesBtnText.textContent = t("clearAll");
        if (card2Title)         card2Title.innerHTML = `<i data-lucide="sliders"></i> ${t("card2Title")}`;
        if (aiVisionLabel)      aiVisionLabel.textContent = t("aiVisionTitle");
        if (aiVisionDesc)       aiVisionDesc.textContent = t("aiVisionDesc");
        if (apiKeyInput)        apiKeyInput.placeholder = t("apiKeyPlaceholder");
        if (ocrBadge)           ocrBadge.innerHTML = `<i data-lucide="check-circle-2"></i> ${t("ocrReadyBadge")}`;
        if (ocrDesc)            ocrDesc.textContent = t("ocrReadyDesc");
        if (convertBtnText)     convertBtnText.textContent = t("convertBtn");
        if (resultsTitle)       resultsTitle.innerHTML = `<i data-lucide="check-circle-2"></i> ${t("resultsTitle")}`;
        if (copyResultText)     copyResultText.textContent = t("copyBtn");
        if (downloadResultText) downloadResultText.textContent = t("downloadBtn");
        if (statWordsLabel)     statWordsLabel.textContent = t("words");
        if (statCharsLabel)     statCharsLabel.textContent = t("chars");
        if (statLinesLabel)     statLinesLabel.textContent = t("lines");
        if (tabPreview)         tabPreview.querySelector("span").textContent = t("tabPreview");
        if (tabSource)          tabSource.querySelector("span").textContent = t("tabSource");
        if (emptyTitle)         emptyTitle.textContent = t("readyTitle");
        if (emptyDesc)          emptyDesc.innerHTML = t("readyDesc");
        if (docGroupLabel)      docGroupLabel.textContent = t("docGroup");
        if (imgGroupLabel)      imgGroupLabel.innerHTML = t("imgGroup");
        if (audioGroupLabel)    audioGroupLabel.innerHTML = t("audioGroup");
        if (dataGroupLabel)     dataGroupLabel.textContent = t("dataGroup");
        if (loadingHeader)      loadingHeader.textContent = t("processingTitle");
        if (loadingMsg)         loadingMsg.textContent = t("processingDesc");

        if (statFilename && statFilename.textContent === "No file selected" || statFilename.textContent === "Chưa có tệp nào") {
            statFilename.textContent = t("noFileSelected");
        }

        updateFileListUI();

        if (window.lucide) lucide.createIcons();
    }

    // Attach click events to language buttons
    langBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const chosen = btn.getAttribute("data-lang");
            if (chosen && chosen !== currentLang) {
                applyLanguage(chosen);
            }
        });
    });

    // ─── State ────────────────────────────────────────────────────────────────
    let selectedFiles      = [];
    let conversionResults  = [];
    let activeResultIndex  = 0;
    let selectedFormat     = "markdown";

    // ─── File type icon map ───────────────────────────────────────────────────
    const FILE_ICONS = {
        pdf: "file-text", docx: "file-text", doc: "file-text",
        xlsx: "table-2", xls: "table-2",
        pptx: "presentation", ppt: "presentation",
        epub: "book-open",
        msg: "mail",
        ipynb: "code-2",
        png: "image", jpg: "image", jpeg: "image", webp: "image",
        mp3: "music", wav: "music", m4a: "music",
        json: "braces", csv: "table", xml: "code",
        html: "globe", htm: "globe",
        zip: "archive", txt: "align-left",
    };

    // Image/audio extensions that require LLM or extra tooling
    const MEDIA_EXTS = new Set(["png", "jpg", "jpeg", "webp"]);
    const AUDIO_EXTS = new Set(["mp3", "wav", "m4a"]);

    function getFileExt(name) {
        return (name.split(".").pop() || "").toLowerCase();
    }

    function getFileIcon(name) {
        return FILE_ICONS[getFileExt(name)] || "file";
    }

    // ─── Marked.js config ────────────────────────────────────────────────────
    if (window.marked) {
        marked.use({
            tokenizer: {
                // Disable 4-space code block detection to avoid PDF indentation issues
                code(src) { return false; }
            },
            gfm: true,
            breaks: true,
        });
    }

    // Clean excessive leading spaces from non-code lines (PDF artifacts)
    function cleanMarkdownText(md) {
        if (!md) return "";
        const lines = md.split("\n");
        let inCode = false;
        return lines.map(line => {
            const t = line.trim();
            if (t.startsWith("```") || t.startsWith("~~~")) { inCode = !inCode; return line; }
            if (!inCode && /^[ ]{4,}(?![*+\-]|\d+\.)/.test(line)) {
                return line.replace(/^[ ]{4,}/, "");
            }
            return line;
        }).join("\n");
    }

    // ─── Toast ───────────────────────────────────────────────────────────────
    let toastTimer;
    function showToast(msg, icon = "check-circle") {
        clearTimeout(toastTimer);
        toastMsg.textContent = msg;
        toast.classList.remove("hidden");
        requestAnimationFrame(() => toast.classList.add("show"));
        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.classList.add("hidden"), 250);
        }, 2800);
        if (window.lucide) lucide.createIcons();
    }

    // ─── File Selection & Drag/Drop ──────────────────────────────────────────
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files?.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files?.length > 0) handleFiles(Array.from(fileInput.files));
    });

    function handleFiles(files) {
        let added = 0;
        let oversized = 0;

        files.forEach(file => {
            // Guard: 50MB limit check
            if (file.size > MAX_FILE_SIZE) {
                showToast(t("toastFileTooLarge", file.name, formatBytes(file.size)));
                oversized++;
                return;
            }

            if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
                added++;
            }
        });

        updateFileListUI();

        if (added > 0) {
            const hasMedia = files.some(f => MEDIA_EXTS.has(getFileExt(f.name)));
            const hasAudio = files.some(f => AUDIO_EXTS.has(getFileExt(f.name)));
            if (hasMedia && !enableLlmToggle.checked) {
                showToast(t("toastAiVisionHint"));
            } else if (hasAudio) {
                showToast(t("toastAudioHint"));
            }
        }
    }

    function updateFileListUI() {
        fileList.innerHTML = "";
        const count = selectedFiles.length;
        fileCountBadge.textContent = t("filesCount", count);

        if (count === 0) {
            fileListContainer.classList.add("hidden");
            return;
        }

        fileListContainer.classList.remove("hidden");

        selectedFiles.forEach((file, idx) => {
            const ext  = getFileExt(file.name);
            const icon = getFileIcon(file.name);
            const li   = document.createElement("li");
            li.className = "file-item";

            // Warn if media without LLM
            const needsLlm  = MEDIA_EXTS.has(ext) && !enableLlmToggle.checked;
            const needsLib  = AUDIO_EXTS.has(ext);
            const warnTitle = needsLlm  ? t("warnNeedsLlm") :
                              needsLib  ? t("warnNeedsLib") : "";

            li.innerHTML = `
                <div class="file-item-name">
                    <i data-lucide="${icon}"></i>
                    <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                    <small class="file-item-meta">${warnTitle || formatBytes(file.size)}</small>
                </div>
                <button class="remove-file-btn" data-index="${idx}" title="${t("removeBtnTitle")}">
                    <i data-lucide="x"></i>
                </button>
            `;
            fileList.appendChild(li);
        });

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".remove-file-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute("data-index"));
                selectedFiles.splice(idx, 1);
                updateFileListUI();
            });
        });
    }

    clearFilesBtn.addEventListener("click", () => {
        selectedFiles = [];
        fileInput.value = "";
        updateFileListUI();
    });

    // ─── Format Selection ─────────────────────────────────────────────────────
    radioCards.forEach(card => {
        card.addEventListener("click", () => {
            radioCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            const radio = card.querySelector("input[type='radio']");
            if (radio) { radio.checked = true; selectedFormat = radio.value; }
        });
    });

    // AI toggle
    enableLlmToggle.addEventListener("change", () => {
        if (enableLlmToggle.checked) {
            aiConfigBody.classList.remove("hidden");
        } else {
            aiConfigBody.classList.add("hidden");
        }
        // Refresh file list warnings
        updateFileListUI();
    });

    // ─── Conversion ───────────────────────────────────────────────────────────
    convertBtn.addEventListener("click", async () => {
        if (selectedFiles.length === 0) {
            showToast(t("toastSelectAtLeastOne"));
            dropzone.style.borderColor = "red";
            setTimeout(() => { dropzone.style.borderColor = ""; }, 1500);
            return;
        }

        // Build loading message
        const names = selectedFiles.map(f => f.name).join(", ");
        loadingMsg.textContent = t("processingFile", selectedFiles.length, names);
        loadingOverlay.classList.remove("hidden");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("files", file));
        formData.append("output_format", selectedFormat);
        formData.append("enable_llm", enableLlmToggle.checked ? "true" : "false");
        if (apiKeyInput.value.trim()) {
            formData.append("api_key", apiKeyInput.value.trim());
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/convert`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error ${response.status}`);
            }

            const data = await response.json();
            conversionResults = data.results || [];
            activeResultIndex = 0;
            renderResultsUI();

            const ok  = conversionResults.filter(r => r.status === "success").length;
            const err = conversionResults.filter(r => r.status === "error").length;
            if (err === 0) {
                showToast(t("toastCompletedOk", ok));
            } else {
                showToast(t("toastCompletedMixed", ok, err));
            }
        } catch (error) {
            showToast(t("toastError", error.message));
            console.error("Conversion error:", error);
        } finally {
            loadingOverlay.classList.add("hidden");
        }
    });

    // ─── Results UI ───────────────────────────────────────────────────────────
    function renderResultsUI() {
        if (!conversionResults?.length) return;

        emptyState.classList.add("hidden");
        viewContent.classList.remove("hidden");
        resultsTabs.innerHTML = "";

        conversionResults.forEach((res, idx) => {
            const tab = document.createElement("button");
            tab.className = `file-tab ${idx === activeResultIndex ? "active" : ""}`;
            tab.textContent = res.filename;
            tab.title = res.filename;
            tab.addEventListener("click", () => {
                activeResultIndex = idx;
                renderActiveResult();
                resultsTabs.querySelectorAll(".file-tab").forEach((t, i) => {
                    t.classList.toggle("active", i === idx);
                });
            });
            resultsTabs.appendChild(tab);
        });

        renderActiveResult();
    }

    function renderActiveResult() {
        const current = conversionResults[activeResultIndex];
        if (!current) return;

        if (current.status === "error") {
            statFilename.textContent = current.filename;
            statWordCount.textContent = "0";
            statCharCount.textContent = "0";
            statLineCount.textContent = "0";

            renderedMarkdown.innerHTML = `
                <div style="background:#fff0f0; color:#c0392b; padding:1rem 1.2rem; border:2px solid #000;
                            border-radius:6px; font-size:0.88rem; box-shadow:3px 3px 0 #000;">
                    <strong>${t("failedToProcess", escapeHtml(current.filename))}</strong><br>
                    <code style="font-size:0.82rem; background:transparent; border:none; color:inherit;">
                        ${escapeHtml(current.error)}
                    </code>
                </div>`;
            rawCodeText.textContent = `ERROR: ${current.error}`;
            return;
        }

        // Stats
        statFilename.textContent = current.filename;
        statWordCount.textContent = (current.word_count || 0).toLocaleString();
        statCharCount.textContent = (current.char_count || 0).toLocaleString();
        statLineCount.textContent = (current.line_count || 0).toLocaleString();

        // Render preview
        if (current.output_format === "html") {
            renderedMarkdown.innerHTML = `<iframe 
                srcdoc="${escapeHtmlAttr(current.output)}" 
                style="width:100%;height:calc(100% - 4px);min-height:380px;border:none;"
                sandbox="allow-same-origin">
            </iframe>`;
        } else if (current.output_format === "json") {
            renderedMarkdown.innerHTML = `<pre style="background:#0f172a;color:#a3e635;padding:1rem;border-radius:6px;overflow-x:auto;font-family:'Space Mono',monospace;font-size:0.82rem;line-height:1.5;"><code>${escapeHtml(current.output)}</code></pre>`;
        } else {
            // Markdown or plain text — clean and render
            const cleaned = cleanMarkdownText(current.markdown || current.output || "");
            renderedMarkdown.innerHTML = window.marked ? marked.parse(cleaned) : `<pre>${escapeHtml(cleaned)}</pre>`;
        }

        // Raw source
        rawCodeText.textContent = current.output || "";

        // Syntax highlighting for raw pane
        if (window.hljs) {
            document.querySelectorAll("#rawViewPane pre code").forEach(block => {
                hljs.highlightElement(block);
            });
        }

        // Scroll rendered pane to top
        renderedViewPane.scrollTop = 0;
    }

    // ─── View Switcher ────────────────────────────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const view = btn.getAttribute("data-view");
            if (view === "rendered") {
                renderedViewPane.classList.add("active");
                rawViewPane.classList.remove("active");
            } else {
                renderedViewPane.classList.remove("active");
                rawViewPane.classList.add("active");
            }
        });
    });

    // ─── Copy Button ─────────────────────────────────────────────────────────
    copyResultBtn.addEventListener("click", () => {
        const current = conversionResults[activeResultIndex];
        if (!current?.output) { showToast(t("toastNoContentCopy")); return; }

        navigator.clipboard.writeText(current.output).then(() => {
            showToast(t("toastCopied"));
        }).catch(() => {
            // Fallback
            const ta = document.createElement("textarea");
            ta.value = current.output;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            showToast(t("toastCopied"));
        });
    });

    // ─── Download Button ──────────────────────────────────────────────────────
    downloadResultBtn.addEventListener("click", () => {
        const current = conversionResults[activeResultIndex];
        if (!current?.output) { showToast(t("toastNoContentDownload")); return; }

        const mimeMap = {
            ".md":   "text/markdown",
            ".html": "text/html",
            ".txt":  "text/plain",
            ".json": "application/json",
        };
        const ext      = current.ext || ".md";
        const mimeType = mimeMap[ext] || "text/plain";
        const blob     = new Blob([current.output], { type: `${mimeType};charset=utf-8` });
        const url      = URL.createObjectURL(blob);
        const a        = document.createElement("a");
        a.href = url;
        const base   = current.filename.substring(0, current.filename.lastIndexOf(".")) || current.filename;
        a.download   = `${base}_converted${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(t("toastDownloaded", a.download));
    });

    // ─── Keyboard shortcut: Ctrl+Enter to convert ─────────────────────────────
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            convertBtn.click();
        }
    });

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function formatBytes(bytes, decimals = 1) {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
    }

    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function escapeHtmlAttr(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // ─── Initial Language Application ─────────────────────────────────────────
    applyLanguage(currentLang);
});
