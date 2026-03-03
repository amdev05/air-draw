# ✋ AirCanvas

Draw in the air using just your finger — powered by [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) and Next.js.

## Gestures

### Gesture Menggambar

| Gesture             | Action                   |
| ------------------- | ------------------------ |
| ☝️ Telunjuk terbuka | Menggambar               |
| ✊ Telunjuk dilipat | Pause                    |
| 🤚 Telapak terbuka  | Hapus (area lebih besar) |

### Gesture Kontrol (Tanpa Klik!)

| Gesture                    | Action                    |
| -------------------------- | ------------------------- |
| ✌️ 2 jari                  | Ganti warna ke kanan      |
| 🤟 3 jari                  | Ganti warna ke kiri       |
| 🖖 4 jari                  | Ubah ukuran brush (cycle) |
| 👍 Jempol (tahan 1.2s)     | Undo                      |
| 🤙 Kelingking (tahan 1.2s) | Redo                      |

> Toolbar masih bisa digunakan dengan dwell click (arahkan telunjuk dan tahan).

## Fitur Optimasi

- ✨ **Garis lebih halus** — Smoothing dan interpolasi titik untuk menghindari garis terputus-putus
- 🎯 **Tracking lebih akurat** — Deteksi gesture yang lebih presisi (telunjuk harus benar-benar terbuka untuk menggambar)
- ⏱️ **Undo/Redo lebih lambat** — Waktu hold diperpanjang menjadi 1.2 detik agar tidak terlalu cepat
- 🧹 **Area hapus lebih besar** — Radius eraser diperbesar menjadi 80px (sebesar telapak tangan)
- 🎨 **Kontrol gesture tanpa klik** — Ganti warna dan ukuran brush dengan gesture tangan (2/3/4 jari)

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
