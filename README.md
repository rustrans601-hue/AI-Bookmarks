
# AI Bookmark Manager

A smart, modern bookmark manager that uses AI (Google Gemini, OpenRouter, or local Ollama) to automatically categorize your links, featuring a modern UI and drag-and-drop organization.

![App Screenshot 2](assets/screenshot_b.png)

> *Tip: Create an `assets` folder in your project root and save your screenshots as `screenshot.png` and `screenshot_b.png` inside it.*

## Features

- 🧠 **AI-Powered Categorization**: Automatically organizes links into categories using LLMs.
- 🏷️ **Smart Tagging**: Add and manage tags for better filtering.
- 🔌 **Multiple AI Providers**: Support for OpenRouter, Google Gemini, and local Ollama.
- 🖱️ **Drag & Drop**: Intuitive grid and board layouts.
- 📥 **Universal Import**: Import bookmarks from JSON, CSV, Excel, and PDF.
- 📱 **Responsive Design**: Works great on desktop and mobile.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rustrans601-hue/ai-bookmark-manager.git
   cd ai-bookmark-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Run as Desktop App (Electron)**
   ```bash
   npm run electron:dev
   ```

## Configuration

Click the **Settings (⚙️)** icon in the top right corner to configure your AI provider:

- **OpenRouter**: Access to free models like Gemini Pro or paid models like GPT-4.
- **Google Gemini**: Use your Google API Key directly.
- **Ollama**: Connect to a local instance (default: `http://localhost:11434`).

## Building

To build the application for production (Desktop):

```bash
npm run electron:build
```

## License

MIT
