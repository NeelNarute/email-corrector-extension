const input = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const status = document.getElementById("status");
const toggleVis = document.getElementById("toggleVis");

// Load saved key on open
chrome.storage.sync.get("apiKey", ({ apiKey }) => {
  if (apiKey) input.value = apiKey;
});

toggleVis.addEventListener("click", () => {
  input.type = input.type === "password" ? "text" : "password";
});

saveBtn.addEventListener("click", async () => {
  const key = input.value.trim();
  if (!key) {
    showStatus("Please enter an API key.", true);
    return;
  }
  if (!key.startsWith("sk-ant-")) {
    showStatus("Key should start with sk-ant-…", true);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  await chrome.storage.sync.set({ apiKey: key });

  saveBtn.disabled = false;
  saveBtn.textContent = "Save key";
  showStatus("Saved! You're ready to go.");
});

function showStatus(msg, isError = false) {
  status.textContent = msg;
  status.className = "status" + (isError ? " err" : "");
  setTimeout(() => { status.textContent = ""; }, 3000);
}
