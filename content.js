// Inject overlay styles once
const STYLE_ID = "email-corrector-styles";
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #ec-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: #1a1a1a;
      color: #fff;
      padding: 12px 18px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: opacity 0.2s;
      max-width: 320px;
    }
    #ec-toast.ec-error { background: #7f1d1d; }
    #ec-toast.ec-success { background: #14532d; }
    .ec-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: ec-spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes ec-spin { to { transform: rotate(360deg); } }
    #ec-diff-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #ec-diff-box {
      background: #fff;
      color: #111;
      border-radius: 14px;
      padding: 24px 28px;
      max-width: 600px;
      width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 40px rgba(0,0,0,0.35);
    }
    #ec-diff-box h3 {
      margin: 0 0 14px;
      font-size: 15px;
      font-weight: 600;
      color: #555;
      letter-spacing: 0.02em;
    }
    #ec-diff-content {
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
      margin-bottom: 20px;
    }
    .ec-diff-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .ec-btn {
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
    }
    .ec-btn-accept { background: #16a34a; color: #fff; }
    .ec-btn-accept:hover { background: #15803d; }
    .ec-btn-reject { background: #e5e7eb; color: #333; }
    .ec-btn-reject:hover { background: #d1d5db; }
  `;
  document.head.appendChild(style);
}

// ─── Toast helper ────────────────────────────────────────────────────────────
let toastEl = null;
function showToast(msg, type = "", spinner = false) {
  removeToast();
  toastEl = document.createElement("div");
  toastEl.id = "ec-toast";
  if (type) toastEl.classList.add(`ec-${type}`);
  if (spinner) {
    const s = document.createElement("div");
    s.className = "ec-spinner";
    toastEl.appendChild(s);
  }
  const t = document.createElement("span");
  t.textContent = msg;
  toastEl.appendChild(t);
  document.body.appendChild(toastEl);
  if (type === "success" || type === "error") {
    setTimeout(removeToast, 3500);
  }
}
function removeToast() {
  if (toastEl) { toastEl.remove(); toastEl = null; }
}

// ─── Diff preview modal ───────────────────────────────────────────────────────
function showDiff(original, corrected, applyFn) {
  const overlay = document.createElement("div");
  overlay.id = "ec-diff-overlay";

  const box = document.createElement("div");
  box.id = "ec-diff-box";

  const title = document.createElement("h3");
  title.textContent = "✦ Suggested correction";
  box.appendChild(title);

  const content = document.createElement("div");
  content.id = "ec-diff-content";
  content.textContent = corrected;
  box.appendChild(content);

  const actions = document.createElement("div");
  actions.className = "ec-diff-actions";

  const reject = document.createElement("button");
  reject.className = "ec-btn ec-btn-reject";
  reject.textContent = "Discard";
  reject.onclick = () => overlay.remove();

  const accept = document.createElement("button");
  accept.className = "ec-btn ec-btn-accept";
  accept.textContent = "Apply correction";
  accept.onclick = () => {
    applyFn(corrected);
    overlay.remove();
    showToast("Correction applied!", "success");
  };

  actions.appendChild(reject);
  actions.appendChild(accept);
  box.appendChild(actions);
  overlay.appendChild(box);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

// ─── Text extraction & injection ─────────────────────────────────────────────
function getActiveElement() {
  let el = document.activeElement;
  // Walk into shadow roots
  while (el && el.shadowRoot) {
    const inner = el.shadowRoot.activeElement;
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

function readText(el) {
  if (!el) return null;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    return el.value || null;
  }
  if (el.isContentEditable) {
    return el.innerText || null;
  }
  return null;
}

function writeText(el, text) {
  if (!el) return;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const nativeSet = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, "value"
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    )?.set;
    if (nativeSet) nativeSet.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (el.isContentEditable) {
    el.focus();
    document.execCommand("selectAll");
    document.execCommand("insertText", false, text);
  }
}

// ─── Main correction flow ─────────────────────────────────────────────────────
async function runCorrection() {
  const el = getActiveElement();
  const text = readText(el);

  if (!text || text.trim().length < 5) {
    showToast("Click inside an email field first, then try again.", "error");
    return;
  }

  showToast("Correcting with Claude…", "", true);

  const response = await chrome.runtime.sendMessage({
    action: "correctText",
    text: text.trim()
  });

  removeToast();

  if (response?.error) {
    showToast(response.error, "error");
    return;
  }

  if (response?.corrected) {
    showDiff(text, response.corrected, (corrected) => writeText(el, corrected));
  }
}

// ─── Listen for command from background ──────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "triggerCorrection") {
    runCorrection().catch(console.error);
  }
});
