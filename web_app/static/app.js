/**
 * MarkItDown.UI — Web Application Logic
 * Powered by Microsoft MarkItDown
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
        }, 2500);
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
        files.forEach(file => {
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
                showToast("💡 Hình ảnh cần bật AI Vision để có kết quả tốt nhất");
            } else if (hasAudio) {
                showToast("🎵 Audio cần cài speech_recognition library để transcribe");
            }
        }
    }

    function updateFileListUI() {
        fileList.innerHTML = "";
        const count = selectedFiles.length;
        fileCountBadge.textContent = `${count} File${count !== 1 ? "s" : ""}`;

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
            const warnTitle = needsLlm  ? " (⚠️ cần AI Vision)" :
                              needsLib  ? " (⚠️ cần speech lib)" : "";

            li.innerHTML = `
                <div class="file-item-name">
                    <i data-lucide="${icon}"></i>
                    <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                    <small class="file-item-meta">${warnTitle || formatBytes(file.size)}</small>
                </div>
                <button class="remove-file-btn" data-index="${idx}" title="Xóa">
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
            showToast("⚠️ Vui lòng chọn ít nhất 1 file!");
            dropzone.style.borderColor = "red";
            setTimeout(() => { dropzone.style.borderColor = ""; }, 1500);
            return;
        }

        // Build loading message
        const names = selectedFiles.map(f => f.name).join(", ");
        loadingMsg.textContent = `Đang xử lý: ${selectedFiles.length > 1 ? selectedFiles.length + " files" : names}...`;
        loadingOverlay.classList.remove("hidden");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("files", file));
        formData.append("output_format", selectedFormat);
        formData.append("enable_llm", enableLlmToggle.checked ? "true" : "false");
        if (apiKeyInput.value.trim()) {
            formData.append("api_key", apiKeyInput.value.trim());
        }

        try {
            const response = await fetch("/api/convert", {
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
                showToast(`✅ Hoàn tất ${ok} file!`);
            } else {
                showToast(`⚠️ ${ok} thành công, ${err} lỗi`);
            }
        } catch (error) {
            showToast(`❌ Lỗi: ${error.message}`);
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
                    <strong>⚠️ Không thể xử lý "${escapeHtml(current.filename)}"</strong><br>
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
        if (!current?.output) { showToast("Chưa có nội dung để copy"); return; }

        navigator.clipboard.writeText(current.output).then(() => {
            showToast("✅ Đã copy vào clipboard!");
        }).catch(() => {
            // Fallback
            const ta = document.createElement("textarea");
            ta.value = current.output;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            showToast("✅ Đã copy!");
        });
    });

    // ─── Download Button ──────────────────────────────────────────────────────
    downloadResultBtn.addEventListener("click", () => {
        const current = conversionResults[activeResultIndex];
        if (!current?.output) { showToast("Chưa có nội dung để tải"); return; }

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
        showToast(`⬇️ Đã tải: ${a.download}`);
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
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
});
