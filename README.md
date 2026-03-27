# RSVP Reader

A split-view speed reader with RSVP (Rapid Serial Visual Presentation) for EPUBs, PDFs, and plain text files.

## Features

- **Split view**: RSVP word display on top, standard reader below, synced in real time
- **ORP highlighting**: Optimal Recognition Point shown in red for faster word recognition
- **Smart pausing**: Longer delays at punctuation marks
- **Three themes**: Light, Dark, Sepia
- **Font customization**: Four font families, adjustable size
- **Table of contents**: Slide-out chapter navigation
- **Progress persistence**: Saves your reading position in localStorage
- **Keyboard controls**: Space (play/pause), arrows (navigate/speed)
- **Metadata stripping**: Filters out page numbers, running headers, and repeated titles from the RSVP stream

## Quick Start (Local)

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to https://vercel.com and sign in with GitHub
3. Click "New Project" and import your repository
4. Click "Deploy" (no settings to change, Vite is auto-detected)
5. Your app will be live at https://your-project-name.vercel.app

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause RSVP |
| Left Arrow | Previous word (when paused) |
| Right Arrow | Next word (when paused) |
| Up Arrow | Increase speed (+25 WPM) |
| Down Arrow | Decrease speed (-25 WPM) |

## File Support

- `.epub` (DRM-free)
- `.pdf`
- `.txt` / `.text` / `.md`

## Tech Stack

- React 18
- Vite 5
- epub.js (EPUB parsing)
- pdf.js (PDF parsing)
- localStorage (persistence, Firebase upgrade planned)
