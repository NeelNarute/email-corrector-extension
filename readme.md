# Email Corrector

A Chrome extension that corrects your emails using Claude AI. Press a keyboard shortcut while typing and get grammar, spelling, and clarity fixes instantly — with a preview before anything is changed.

## Features

- Works on any website (Gmail, Outlook, Yahoo Mail, etc.)
- Shows a preview of the correction before applying it
- Keeps your original tone and intent
- Shortcut customizable via Chrome settings

## Installation

1. Download and unzip this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `email-corrector-extension` folder
5. The extension icon will appear in your toolbar

## Setup

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Click the extension icon in your toolbar
3. Paste your API key (starts with `sk-ant-`) and click **Save key**

## Usage

1. Click inside any email text field
2. Type your email
3. Press `Ctrl+Shift+Space` (Windows/Linux) or `⌘+Shift+Space` (Mac)
4. Review the suggested correction in the preview modal
5. Click **Apply correction** to accept or **Discard** to keep your original

To change the shortcut, go to `chrome://extensions/shortcuts`.

## File Structure

```
email-corrector-extension/
├── manifest.json      # Extension config and permissions
├── background.js      # Service worker, handles Claude API calls
├── content.js         # Reads and writes text in email fields
├── popup.html         # Settings UI
├── popup.js           # Saves API key to Chrome storage
└── icons/             # Extension icons
```

## Privacy

- Your API key is stored locally in Chrome's sync storage — never sent anywhere except Anthropic's API
- Email text is only sent to Anthropic when you trigger the shortcut
- No data is logged or stored by this extension

## Requirements

- Google Chrome (or any Chromium-based browser)
- An [Anthropic API key](https://console.anthropic.com) (pay-as-you-go, ~$5 minimum top-up)

## License

MIT
