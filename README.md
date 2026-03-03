# ✋ AirCanvas

Draw in the air using just your finger — powered by [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) and Next.js.

## Gestures

| Gesture             | Action |
| ------------------- | ------ |
| ☝️ 1 finger (index) | Draw   |
| 🤚 Open palm        | Erase  |
| ✌️ 2 fingers        | Pause  |
| 👍 Thumb (hold)     | Undo   |
| 🤙 Pinky (hold)     | Redo   |

> Point your index finger at the toolbar and hold over a button to select it (dwell click).

## Tech Stack

- **Next.js 15** + TypeScript
- **MediaPipe Tasks Vision** — hand landmark detection (runs in browser, no backend)
- **TailwindCSS**
- HTML Canvas API

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and allow camera access.
