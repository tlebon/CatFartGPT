# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DasCatFartGPT is a whimsical OpenAI chat interface featuring animated cats that react to token usage with custom fart sounds and animations. This is a pure client-side web application with no build process.

## Architecture

### Core Files
- **index.html** - Main HTML structure with chat interface and animation/sound upload sections
- **script.js** - Single JavaScript class `CatFartGPT` containing all application logic
- **styles.css** - Complete styling using CSS Grid and Flexbox layouts

### Application Structure

The application is built around a single `CatFartGPT` class that handles:

1. **OpenAI API Integration** (script.js:103-134)
   - Direct fetch calls to OpenAI's chat completions endpoint
   - Uses gpt-3.5-turbo model with user-provided API key stored in localStorage
   - Message history management for context

2. **Token Usage Tracking** (script.js:157-185)
   - Tracks cumulative token usage across chat sessions
   - Calculates estimated costs based on token count
   - Three usage tiers: Low (0-100), Medium (101-500), High (500+)

3. **Animation System** (script.js:187-341)
   - Generates SVG-based cat animations dynamically based on usage level
   - Supports custom user-uploaded image frames (3 frames per usage level)
   - Fallback to programmatically generated SVG animations

4. **Sound System** (script.js:343-388)
   - Supports custom user-uploaded WAV files for each usage level
   - Fallback to Web Audio API generated fart sounds using sawtooth waves
   - Different frequency/duration profiles for each usage tier

5. **File Management** (script.js:390-539)
   - Handles user uploads for both sounds and animation frames
   - Uses URL.createObjectURL for file handling
   - Memory management with URL.revokeObjectURL

## Development Commands

This is a static web application with no build process. Development workflow:

```bash
# Serve locally (any method)
python -m http.server 8000
# or
npx serve .
# or open index.html directly in browser

# For development, simply edit files and refresh browser
```

## Key Features

- **Responsive Design**: CSS Grid layout that adapts to mobile/desktop
- **Custom Asset Support**: Users can upload custom sounds (.wav) and animation frames (images)
- **Token Cost Estimation**: Real-time cost calculation based on OpenAI pricing
- **Client-side Storage**: API keys stored in localStorage, uploaded files in memory
- **Progressive Enhancement**: Works without custom assets using generated content

## File Organization

```
├── index.html          # Main UI structure
├── script.js          # Complete application logic
├── styles.css         # All styling and responsive design
└── *.wav              # Default fart sound files (3 usage levels)
```

The codebase uses vanilla JavaScript ES6+ features including classes, async/await, and modern Web APIs (File API, Web Audio API, Canvas/SVG manipulation).