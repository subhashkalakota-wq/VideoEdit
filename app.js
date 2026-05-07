/**
 * VideoAI Parser — UI Application Logic
 */

// ─── Elements ────────────────────────────────────────────────────────────────
const commandInput = document.getElementById("commandInput");
const parseBtn = document.getElementById("parseBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const outputBody = document.getElementById("outputBody");
const outputFooter = document.getElementById("outputFooter");
const actionSummary = document.getElementById("actionSummary");
const summaryCards = document.getElementById("summaryCards");
const charCount = document.getElementById("charCount");
const actionCount = document.getElementById("actionCount");
const avgConfidence = document.getElementById("avgConfidence");
const confidenceBar = document.getElementById("confidenceBar");
const toast = document.getElementById("toast");

let lastResult = null;

// ─── Syntax Highlighting ─────────────────────────────────────────────────────
function syntaxHighlight(json) {
  const str = typeof json === "string" ? json : JSON.stringify(json, null, 2);
  return str
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "json-number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "json-key";
          } else {
            cls = "json-string";
          }
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

// ─── Render Output ────────────────────────────────────────────────────────────
function renderOutput(result) {
  lastResult = result;
  const jsonStr = JSON.stringify(result, null, 2);

  outputBody.innerHTML = `<div class="json-output">${syntaxHighlight(jsonStr)}</div>`;
  copyBtn.style.display = "flex";
  downloadBtn.style.display = "flex";

  if (result.actions && result.actions.length > 0) {
    outputFooter.style.display = "block";
    actionCount.textContent = `${result.actions.length} action${result.actions.length !== 1 ? "s" : ""}`;

    const avg = result.actions.reduce((s, a) => s + (a.confidence || 0), 0) / result.actions.length;
    avgConfidence.textContent = `Avg confidence: ${Math.round(avg * 100)}%`;
    confidenceBar.style.width = `${Math.round(avg * 100)}%`;

    renderSummaryCards(result.actions);
  } else {
    outputFooter.style.display = "none";
    actionSummary.style.display = "none";
  }
}

function renderSummaryCards(actions) {
  actionSummary.style.display = "block";
  summaryCards.innerHTML = "";

  const actionColors = {
    trim_video: "#8b5cf6",
    cut_segment: "#ef4444",
    split_video: "#f59e0b",
    add_text: "#10b981",
    add_subtitles: "#06b6d4",
    add_music: "#ec4899",
    remove_audio: "#f97316",
    change_speed: "#3b82f6",
    reverse_video: "#6366f1",
    zoom: "#84cc16",
    pan: "#14b8a6",
    blur: "#a855f7",
    highlight: "#eab308",
    add_transition: "#f43f5e",
    add_effect: "#8b5cf6",
    color_correction: "#22c55e",
    apply_filter: "#0ea5e9",
    stabilize_video: "#10b981",
    remove_noise: "#64748b",
    detect_scenes: "#f59e0b",
    auto_highlights: "#ec4899",
    crop: "#6366f1",
    resize: "#3b82f6",
    overlay_image: "#14b8a6",
    add_watermark: "#a78bfa",
  };

  actions.forEach((action, idx) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.style.animationDelay = `${idx * 0.05}s`;

    const color = actionColors[action.action] || "#8b5cf6";
    const pct = Math.round((action.confidence || 0) * 100);

    card.innerHTML = `
      <div class="sc-action">${action.action}</div>
      <div class="sc-confidence">
        <span>${pct}%</span>
        <div class="sc-bar">
          <div class="sc-fill" style="width:${pct}%; background:${color}; transition: width 0.6s ease ${0.2 + idx * 0.05}s;"></div>
        </div>
      </div>
    `;
    summaryCards.appendChild(card);
  });
}

// ─── Simulate Parse Delay ─────────────────────────────────────────────────────
function simulateParse(text) {
  const btnText = parseBtn.querySelector(".parse-btn-text");
  const btnLoad = parseBtn.querySelector(".parse-btn-loading");

  btnText.style.display = "none";
  btnLoad.style.display = "inline-flex";
  parseBtn.disabled = true;

  // Fake loading animation for realism
  const delay = 400 + Math.random() * 400;

  setTimeout(() => {
    const result = parseCommand(text);
    renderOutput(result);
    btnText.style.display = "inline-flex";
    btnLoad.style.display = "none";
    parseBtn.disabled = false;
  }, delay);
}

// ─── Events ───────────────────────────────────────────────────────────────────
commandInput.addEventListener("input", () => {
  charCount.textContent = commandInput.value.length;
});

parseBtn.addEventListener("click", () => {
  const text = commandInput.value.trim();
  if (!text) {
    showToast("⚠️ Please enter a video editing instruction.");
    commandInput.focus();
    return;
  }
  simulateParse(text);
});

commandInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    parseBtn.click();
  }
});

clearBtn.addEventListener("click", () => {
  commandInput.value = "";
  charCount.textContent = "0";
  commandInput.focus();
  outputBody.innerHTML = `
    <div class="output-placeholder">
      <div class="placeholder-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <p>Your structured JSON will appear here</p>
      <span>Type an instruction and click Parse</span>
    </div>`;
  copyBtn.style.display = "none";
  downloadBtn.style.display = "none";
  outputFooter.style.display = "none";
  actionSummary.style.display = "none";
  lastResult = null;
});

copyBtn.addEventListener("click", () => {
  if (!lastResult) return;
  const jsonStr = JSON.stringify(lastResult, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast("✅ JSON copied to clipboard!");
  }).catch(() => {
    showToast("❌ Could not copy. Try manually.");
  });
});

downloadBtn.addEventListener("click", () => {
  if (!lastResult) return;
  const jsonStr = JSON.stringify(lastResult, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `video_edit_actions_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("⬇️ JSON downloaded!");
});

// Example chips
document.querySelectorAll(".example-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt;
    commandInput.value = prompt;
    charCount.textContent = prompt.length;
    commandInput.focus();
    commandInput.scrollIntoView({ behavior: "smooth", block: "center" });
    simulateParse(prompt);
  });
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// ─── Smooth scroll for nav links ──────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// ─── Scroll Animations ────────────────────────────────────────────────────────
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".step-card, .ref-card, .action-chip").forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(16px)";
  el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
  observer.observe(el);
});
