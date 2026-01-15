# Declutter 🧹✨

**Table of Contents**

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Installation](#installation)
  - [macOS](#macos)
  - [Linux](#linux)
  - [Windows](#windows)
  - [Verify Installation](#verify-installation)
- [Quick Start](#quick-start)
  - [Declutter a Single Page](#declutter-a-single-page)
  - [Interactive Mode (Process Multiple URLs)](#interactive-mode-process-multiple-urls)
  - [Convert Existing Markdown](#convert-existing-markdown)
- [Choose Your Style 🎨](#choose-your-style-🎨)
- [Supported AI Providers](#supported-ai-providers)
- [Real-World Examples](#real-world-examples)
- [Configuration](#configuration)
- [When It Shines ⭐](#when-it-shines-⭐)
- [Why You'll Love It](#why-youll-love-it)
- [Get Started Now](#get-started-now)
- [Contributing](#contributing)
- [License](#license)

**Take back the web. One clean page at a time.**

A powerful CLI tool that strips away the chaos of the modern web and gives you pure, distraction-free content—archived locally, beautifully formatted, and ready to read.

---

## The Problem

Remember when reading online was actually... enjoyable?

The modern web has become an assault course:

- 🚨 **Popups** ambush you before you read a single word
- 📢 **Ads** scream for attention from every corner
- 🔒 **Paywalls** block you from content you came to see
- 🎯 **Tracking scripts** harvest your every move
- 📊 **Navigation clutter** devours your screen space

**You didn't come to fight through noise. You came to read.**

---

## The Solution

Declutter uses AI to intelligently extract the content you actually want—the article, the story, the information—and discards everything else. Then it saves a beautifully formatted version locally, giving you:

✅ **Zero distractions** - No ads, popups, or clutter  
✅ **Offline access** - Read anywhere, anytime  
✅ **Beautiful formatting** - Six professional styles to choose from  
✅ **Multiple formats** - Save as Markdown, HTML, or PDF  
✅ **Fast & flexible** - Works with Gemini, Claude, GPT, OpenRouter, or local Ollama models

| ![Demo 1](./images/cool-gif-one.gif) | ![Demo 2](./images/cool-gif-two.gif) |
| ------------------------------------ | ------------------------------------ |

---

## Installation

### macOS

The easiest way to install on Mac is via Homebrew:

```bash
brew tap subranag/declutter
brew install declutter
```

### Linux

Download the latest release for your architecture:

```bash
# For x86_64
curl -L https://github.com/subranag/declutter/releases/download/vlatest/declutter-linux-x64.tar.gz -o declutter-linux-x64.tar.gz
tar -xzf declutter-linux-x64.tar.gz
chmod +x declutter-linux-x64
sudo mv declutter-linux-x64 /usr/local/bin/declutter

# For ARM64
curl -L https://github.com/subranag/declutter/releases/download/vlatest/declutter-linux-arm64.tar.gz -o declutter-linux-arm64.tar.gz
tar -xzf declutter-linux-arm64.tar.gz
chmod +x declutter-linux-arm64
sudo mv declutter-linux-arm64 /usr/local/bin/declutter
```

### Windows

Download the latest Windows executable from the [releases page](https://github.com/subranag/declutter/releases):

1. Download `declutter-windows-x64.tar.gz` from the latest release
2. Extract the archive (using 7-Zip, WinRAR, or Windows native extraction)
3. Rename the extracted executable `declutter-windows-x64` to `declutter.exe`
4. Move it to a directory in your PATH, or add its location to your PATH environment variable

**Or use PowerShell:**

```powershell
# Download and extract
Invoke-WebRequest -Uri "https://github.com/subranag/declutter/releases/download/vlatest/declutter-windows-x64.tar.gz" -OutFile "declutter-windows-x64.tar.gz"
tar -xzf declutter-windows-x64.tar.gz

# Rename and move to a directory in your PATH (e.g., C:\Program Files\declutter\)
Rename-Item -Path "declutter-windows-x64" -NewName "declutter.exe"
Move-Item -Path "declutter.exe" -Destination "C:\Program Files\declutter\"
```

### Verify Installation

```bash
declutter --help
```

---

## Quick Start

### Declutter a Single Page

```bash
# Using default settings (Gemini + PDF output)
declutter exec https://example.com/article

# With your preferred provider
declutter exec https://news.site/story --provider anthropic

# Choose your style
declutter exec https://blog.com/post --style CLASSIC_BOOK --format pdf
```

### Interactive Mode (Process Multiple URLs)

```bash
# Launch REPL mode
declutter repl --provider openai --style MINIMALIST_MODERN

# Then paste URLs one at a time as you browse
```

### Convert Existing Markdown

```bash
# Turn your markdown files into styled PDFs or HTML
declutter convert ~/Documents/notes.md --format pdf --style REFINED_ELEGANCE
```

---

## Choose Your Style 🎨

Declutter offers six carefully crafted visual styles:

| Style                  | Perfect For                         |
| ---------------------- | ----------------------------------- |
| **MINIMALIST_SWISS**   | Clean, grid-based reading (default) |
| **BRUTALIST_CONCRETE** | Bold, statement typography          |
| **CLASSIC_BOOK**       | Traditional, book-like elegance     |
| **TECH_TERMINAL**      | Monospace, developer-friendly       |
| **MINIMALIST_MODERN**  | Contemporary and spacious           |
| **REFINED_ELEGANCE**   | Sophisticated and polished          |

---

## Supported AI Providers

Pick the model that works for you:

- **Gemini** - Fast and free (default: `gemini-2.5-flash`)
- **Anthropic** - High quality (default: `claude-haiku-4-5`)
- **OpenAI** - Reliable classic (default: `gpt-4o-mini`)
- **OpenRouter** - Access to many models (default: `google/gemini-2.0-flash-exp:free`)
- **Ollama** - Run locally, 100% private (default: `deepseek-r1:7b`)

Configure with environment variables or command flags. See the [full documentation](#) for API key setup.

---

## Real-World Examples

**Save a research article for offline reading:**

```bash
declutter exec https://research.edu/paper \
  --provider anthropic \
  --style CLASSIC_BOOK \
  --format pdf \
  --directory ~/Research
```

**Quickly grab news articles during your commute prep:**

```bash
declutter repl --provider gemini --format md --directory ~/ToRead
# Then paste URLs from your browser
```

**Convert your markdown notes into beautiful PDFs:**

```bash
declutter convert ~/Notes/meeting-notes.md \
  --format pdf \
  --style REFINED_ELEGANCE
```

**Archive documentation with monospace styling:**

```bash
declutter exec https://docs.framework.com/guide \
  --style TECH_TERMINAL \
  --max_tokens 20000 \
  --format html
```

---

## Configuration

**Set up your API keys (pick one or more):**

```bash
export GEMINI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
export OPENROUTER_API_KEY="your-key-here"
# Ollama requires no API key
```

**Set your preferred default model (optional):**

```bash
export DEFAULT_DECLUTTER_MODEL="gpt-4o"
```

---

## When It Shines ⭐

Declutter works brilliantly for:

- 📰 News articles and journalism
- 📝 Blog posts and essays
- 📚 Documentation and guides
- 🔬 Research papers and reports
- 💬 Long-form content of any kind

**Fair warning:** Heavily JavaScript-dependent sites, complex web apps, or aggressive anti-scraping measures may not work perfectly. For 95% of the web's content, though? Declutter delivers.

---

## Why You'll Love It

🎯 **Laser-focused on content** - Gets the signal, kills the noise  
⚡ **Blazingly fast** - Process pages in seconds  
🎨 **Gorgeous output** - Professional styling out of the box  
🔒 **Privacy-first** - Use local models if you want  
🛠️ **Flexible** - Works with your preferred AI provider  
📦 **Portable** - Take your archived content anywhere

---

## Get Started Now

```bash
# Try it on this README!
declutter exec https://github.com/yourusername/declutter
```

**The web doesn't have to be exhausting. Take it back.**

---

## Contributing

Issues, ideas, and pull requests welcome! Let's make the web readable again.

## License

GNU General Public License v3.0

---

_Made with ❤️ for people who just want to read_
