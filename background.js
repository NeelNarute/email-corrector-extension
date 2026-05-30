chrome.commands.onCommand.addListener((command) => {
  if (command === "correct-email") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      // Try sending to existing content script first
      try {
        await chrome.tabs.sendMessage(tab.id, { action: "triggerCorrection" });
      } catch {
        // Content script not loaded yet — inject it, then retry
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
          // Small delay to let the script initialize
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, { action: "triggerCorrection" });
            } catch (e) {
              console.error("Email Corrector: could not reach content script after injection.", e);
            }
          }, 150);
        } catch (injectErr) {
          console.error("Email Corrector: script injection failed.", injectErr);
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "correctText") {
    handleCorrection(message.text).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // keep channel open for async response
  }
});

async function handleCorrection(text) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");

  if (!apiKey) {
    throw new Error("No API key set. Click the extension icon to add your Anthropic API key.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an email proofreader. Correct the grammar, spelling, punctuation, and clarity of the following email text. Keep the original tone and intent. Return ONLY the corrected text with no explanation, no preamble, and no commentary.\n\n${text}`
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const corrected = data.content?.find((b) => b.type === "text")?.text;

  if (!corrected) throw new Error("No response from Claude.");

  return { corrected };
}
