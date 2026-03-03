"use client";

import { useRef, useEffect, useState } from "react";

type DrawMode = "draw" | "erase" | "undo" | "redo" | "idle";
type Point = { x: number; y: number };

// Minimal MediaPipe types (avoid 'any')
interface HandLandmark {
  x: number;
  y: number;
  z: number;
}
interface HandLandmarkerResult {
  landmarks: HandLandmark[][];
}
interface HandLandmarkerInstance {
  detectForVideo(video: HTMLVideoElement, timestamp: number): HandLandmarkerResult;
}

const COLORS = ["#FF0000", "#FF4500", "#FF8C00", "#FFD700", "#7FFF00", "#00FF80", "#00FFFF", "#007FFF", "#8B00FF", "#FF00FF", "#FFFFFF", "#1a1a1a"];
const BRUSH_SIZES = [4, 8, 16, 30];
const ERASER_R = 80; // Diperbesar untuk area telapak tangan
const MAX_HIST = 20;
const DWELL_MS = 700;
const HOLD_MS = 1200; // Diperlambat agar tidak terlalu cepat
const MAX_LOST_FRAMES = 3; // Lebih responsif
const MAX_SMOOTH_POINTS = 5; // Untuk smoothing

// MediaPipe hand landmark connections
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // index
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // middle
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // ring
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // pinky
  [5, 9],
  [9, 13],
  [13, 17], // palm
];
const FINGERTIPS = new Set([4, 8, 12, 16, 20]);

export default function DrawingBoard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Drawing refs (stable across renders, used in anim loop)
  const colorRef = useRef(COLORS[0]);
  const sizeRef = useRef(8);
  const histRef = useRef<ImageData[]>([]);
  const redoHistRef = useRef<ImageData[]>([]);
  const prevPtRef = useRef<Point | null>(null);
  const prevModeRef = useRef<DrawMode>("idle");
  const hlRef = useRef<HandLandmarkerInstance | null>(null);
  const rafRef = useRef(0);
  const runRef = useRef(false);

  // Gesture hold (undo/redo)
  const holdGestRef = useRef<string | null>(null);
  const holdStartRef = useRef(0);
  const holdFiredRef = useRef(false);

  // Gesture untuk ganti warna dan ukuran (cooldown untuk mencegah trigger berulang)
  const colorGestureRef = useRef<string | null>(null);
  const colorGestureCooldownRef = useRef(false);
  const sizeGestureRef = useRef<string | null>(null);
  const sizeGestureCooldownRef = useRef(false);

  // Grace period: don't break stroke on brief detection loss (up to N frames)
  const lostDrawFramesRef = useRef(0);

  // Smoothing untuk garis yang lebih halus
  const smoothPointsRef = useRef<Point[]>([]);

  // Toolbar dwell
  const dwellActRef = useRef<string | null>(null);
  const dwellStartRef = useRef(0);
  const dwellCoolRef = useRef(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<DrawMode>("idle");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(8);
  const [hasHand, setHasHand] = useState(false);
  const [dwellBtn, setDwellBtn] = useState<string | null>(null);

  // --- Action helpers (only use refs → safe inside animation loop) ---

  // Smooth point untuk garis yang lebih halus
  const getSmoothedPoint = (newPt: Point): Point => {
    smoothPointsRef.current.push(newPt);
    if (smoothPointsRef.current.length > MAX_SMOOTH_POINTS) {
      smoothPointsRef.current.shift();
    }

    if (smoothPointsRef.current.length === 1) return newPt;

    // Average smoothing
    const avgX = smoothPointsRef.current.reduce((sum, p) => sum + p.x, 0) / smoothPointsRef.current.length;
    const avgY = smoothPointsRef.current.reduce((sum, p) => sum + p.y, 0) / smoothPointsRef.current.length;

    return { x: avgX, y: avgY };
  };

  const resetSmoothing = () => {
    smoothPointsRef.current = [];
  };

  const doUndo = () => {
    const c = drawRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    if (!histRef.current.length) return;
    redoHistRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (redoHistRef.current.length > MAX_HIST) redoHistRef.current.shift();
    ctx.putImageData(histRef.current.pop()!, 0, 0);
  };

  const doRedo = () => {
    const c = drawRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    if (!redoHistRef.current.length) return;
    histRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (histRef.current.length > MAX_HIST) histRef.current.shift();
    ctx.putImageData(redoHistRef.current.pop()!, 0, 0);
  };

  const doClear = () => {
    const c = drawRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    histRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (histRef.current.length > MAX_HIST) histRef.current.shift();
    ctx.clearRect(0, 0, c.width, c.height);
    redoHistRef.current = [];
  };

  const pickColor = (c: string) => {
    colorRef.current = c;
    setColor(c);
  };
  const pickSize = (s: number) => {
    sizeRef.current = s;
    setSize(s);
  };

  // Fungsi untuk ganti warna ke kanan
  const nextColor = () => {
    const currentIdx = COLORS.indexOf(colorRef.current);
    const nextIdx = (currentIdx + 1) % COLORS.length;
    pickColor(COLORS[nextIdx]);
  };

  // Fungsi untuk ganti warna ke kiri
  const prevColor = () => {
    const currentIdx = COLORS.indexOf(colorRef.current);
    const prevIdx = (currentIdx - 1 + COLORS.length) % COLORS.length;
    pickColor(COLORS[prevIdx]);
  };

  // Fungsi untuk ganti ukuran brush (cycle)
  const nextSize = () => {
    const currentIdx = BRUSH_SIZES.indexOf(sizeRef.current);
    const nextIdx = (currentIdx + 1) % BRUSH_SIZES.length;
    pickSize(BRUSH_SIZES[nextIdx]);
  };

  const triggerBtn = (act: string) => {
    if (act === "undo") doUndo();
    else if (act === "redo") doRedo();
    else if (act === "clear") doClear();
    else if (act.startsWith("c:")) pickColor(act.slice(2));
    else if (act.startsWith("s:")) pickSize(Number(act.slice(2)));
  };

  useEffect(() => {
    let cancelled = false;
    let mediaStream: MediaStream | null = null; // track stream for cleanup

    const resize = () => {
      [drawRef, overlayRef].forEach((r) => {
        if (r.current) {
          r.current.width = innerWidth;
          r.current.height = innerHeight;
        }
      });
    };
    resize();
    addEventListener("resize", resize);

    (async () => {
      try {
        const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm");
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (cancelled) return;
        hlRef.current = hl;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        mediaStream = stream;
        if (cancelled) return;
        videoRef.current!.srcObject = stream;
        await videoRef.current!.play();
        if (cancelled) return;

        setLoading(false);
        runRef.current = true;
        let lastT = -1;

        const tick = () => {
          if (!runRef.current) return;
          const vid = videoRef.current!;
          const dc = drawRef.current!;
          const oc = overlayRef.current!;
          if (!dc || !oc) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          const dctx = dc.getContext("2d")!;
          const octx = oc.getContext("2d")!;
          octx.clearRect(0, 0, oc.width, oc.height);
          const W = oc.width,
            H = oc.height;
          const TOOLBAR_TOP = H * 0.84;

          let res: HandLandmarkerResult | null = null;
          if (vid.readyState >= 2 && vid.currentTime !== lastT) {
            lastT = vid.currentTime;
            try {
              res = hlRef.current?.detectForVideo(vid, performance.now()) ?? null;
            } catch {
              /* skip */
            }
          }

          if (res?.landmarks?.length) {
            setHasHand(true);
            const lm = res.landmarks[0];

            // --- Draw hand skeleton on overlay ---
            // Bone connections
            octx.strokeStyle = "rgba(255,255,255,0.22)";
            octx.lineWidth = 1.5;
            for (const [a, b] of HAND_CONNECTIONS) {
              octx.beginPath();
              octx.moveTo((1 - lm[a].x) * W, lm[a].y * H);
              octx.lineTo((1 - lm[b].x) * W, lm[b].y * H);
              octx.stroke();
            }
            // Landmark dots
            for (let i = 0; i < 21; i++) {
              const lx = (1 - lm[i].x) * W;
              const ly = lm[i].y * H;
              const isTip = FINGERTIPS.has(i);
              octx.beginPath();
              octx.arc(lx, ly, isTip ? 5 : 2.5, 0, Math.PI * 2);
              octx.fillStyle = isTip ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)";
              octx.fill();
            }

            // Deteksi gesture yang lebih akurat
            // Index finger: tip (8) harus di atas PIP (6) dan DIP (7)
            const iUp = lm[8].y < lm[6].y && lm[8].y < lm[7].y;
            const iDown = lm[8].y > lm[6].y; // Telunjuk dilipat

            const mUp = lm[12].y < lm[10].y;
            const rUp = lm[16].y < lm[14].y;
            const pUp = lm[20].y < lm[18].y;
            // Thumb: tip (4) above IP joint (3) — more reliable than lm[2]
            const tUp = lm[4].y < lm[3].y && lm[4].x > lm[3].x; // up & pointing sideways

            // Hitung jumlah jari yang terbuka
            const fingersUp = [iUp, mUp, rUp, pUp].filter(Boolean).length;

            let g: DrawMode = "idle";

            // Gesture untuk ganti warna dan ukuran (prioritas tertinggi)
            // 2 jari: ganti warna ke kanan
            if (iUp && mUp && !rUp && !pUp && !tUp) {
              if (colorGestureRef.current !== "next" && !colorGestureCooldownRef.current) {
                colorGestureRef.current = "next";
                colorGestureCooldownRef.current = true;
                nextColor();
                setTimeout(() => {
                  colorGestureCooldownRef.current = false;
                  colorGestureRef.current = null;
                }, 800);
              }
              g = "idle";
            }
            // 3 jari: ganti warna ke kiri
            else if (iUp && mUp && rUp && !pUp && !tUp) {
              if (colorGestureRef.current !== "prev" && !colorGestureCooldownRef.current) {
                colorGestureRef.current = "prev";
                colorGestureCooldownRef.current = true;
                prevColor();
                setTimeout(() => {
                  colorGestureCooldownRef.current = false;
                  colorGestureRef.current = null;
                }, 800);
              }
              g = "idle";
            }
            // 4 jari: ganti ukuran brush
            else if (iUp && mUp && rUp && pUp && !tUp) {
              if (sizeGestureRef.current !== "cycle" && !sizeGestureCooldownRef.current) {
                sizeGestureRef.current = "cycle";
                sizeGestureCooldownRef.current = true;
                nextSize();
                setTimeout(() => {
                  sizeGestureCooldownRef.current = false;
                  sizeGestureRef.current = null;
                }, 800);
              }
              g = "idle";
            }
            // Erase: semua jari terbuka (telapak tangan terbuka)
            else if (iUp && mUp && rUp && pUp && tUp) {
              g = "erase";
            }
            // Draw: HANYA telunjuk terbuka, jari lain tertutup
            else if (iUp && !iDown && !mUp && !rUp && !pUp) {
              g = "draw";
            }
            // Undo: hanya thumb terbuka
            else if (tUp && !iUp && !mUp && !rUp && !pUp) {
              g = "undo";
            }
            // Redo: hanya pinky terbuka
            else if (pUp && !iUp && !mUp && !rUp && !tUp) {
              g = "redo";
            }

            setMode(g);

            const tipX = (1 - lm[8].x) * W;
            const tipY = lm[8].y * H;
            const palmX = (1 - (lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 4) * W;
            const palmY = ((lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 4) * H;

            // Visual feedback untuk gesture ganti warna/ukuran
            if (colorGestureCooldownRef.current || sizeGestureCooldownRef.current) {
              const feedbackText =
                colorGestureRef.current === "next" ? "Warna →" : colorGestureRef.current === "prev" ? "← Warna" : sizeGestureRef.current === "cycle" ? `Ukuran: ${sizeRef.current}px` : "";

              if (feedbackText) {
                octx.save();
                octx.font = "bold 24px sans-serif";
                octx.textAlign = "center";
                octx.textBaseline = "middle";

                // Background
                const metrics = octx.measureText(feedbackText);
                const textWidth = metrics.width + 40;
                const textHeight = 50;
                octx.fillStyle = "rgba(0,0,0,0.8)";
                octx.fillRect(W / 2 - textWidth / 2, H / 2 - textHeight / 2, textWidth, textHeight);

                // Border
                octx.strokeStyle = colorRef.current;
                octx.lineWidth = 3;
                octx.strokeRect(W / 2 - textWidth / 2, H / 2 - textHeight / 2, textWidth, textHeight);

                // Text
                octx.fillStyle = colorRef.current;
                octx.fillText(feedbackText, W / 2, H / 2);
                octx.restore();
              }
            }

            // Hold gesture (undo/redo)
            if (g === "undo" || g === "redo") {
              if (holdGestRef.current !== g) {
                holdGestRef.current = g;
                holdStartRef.current = performance.now();
                holdFiredRef.current = false;
              } else if (!holdFiredRef.current) {
                const elapsed = performance.now() - holdStartRef.current;
                const prog = Math.min(elapsed / HOLD_MS, 1);
                const hx = g === "undo" ? (1 - lm[4].x) * W : (1 - lm[20].x) * W;
                const hy = g === "undo" ? lm[4].y * H : lm[20].y * H;
                octx.beginPath();
                octx.arc(hx, hy, 22, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
                octx.strokeStyle = g === "undo" ? "#FBBF24" : "#38BDF8";
                octx.lineWidth = 4;
                octx.lineCap = "round";
                octx.stroke();
                if (prog >= 1) {
                  holdFiredRef.current = true;
                  if (g === "undo") doUndo();
                  else doRedo();
                }
              }
              prevPtRef.current = null;
            } else {
              holdGestRef.current = null;
            }

            const inToolbar = tipY > TOOLBAR_TOP;

            if (g === "draw" && !inToolbar) {
              lostDrawFramesRef.current = 0; // reset grace counter
              if (prevModeRef.current !== "draw") {
                histRef.current.push(dctx.getImageData(0, 0, W, H));
                if (histRef.current.length > MAX_HIST) histRef.current.shift();
                redoHistRef.current = [];
                resetSmoothing(); // Reset smoothing saat mulai stroke baru
              }

              // Smooth point untuk garis lebih halus
              const smoothedPt = getSmoothedPoint({ x: tipX, y: tipY });

              if (prevPtRef.current) {
                // Interpolasi titik untuk garis yang lebih smooth
                const dist = Math.hypot(smoothedPt.x - prevPtRef.current.x, smoothedPt.y - prevPtRef.current.y);
                const steps = Math.max(Math.floor(dist / 2), 1);

                dctx.beginPath();
                dctx.moveTo(prevPtRef.current.x, prevPtRef.current.y);

                // Interpolasi untuk garis yang lebih halus
                for (let i = 1; i <= steps; i++) {
                  const t = i / steps;
                  const x = prevPtRef.current.x + (smoothedPt.x - prevPtRef.current.x) * t;
                  const y = prevPtRef.current.y + (smoothedPt.y - prevPtRef.current.y) * t;
                  dctx.lineTo(x, y);
                }

                dctx.strokeStyle = colorRef.current;
                dctx.lineWidth = sizeRef.current;
                dctx.lineCap = "round";
                dctx.lineJoin = "round";
                dctx.stroke();
              }
              prevPtRef.current = smoothedPt;
              octx.beginPath();
              octx.arc(smoothedPt.x, smoothedPt.y, sizeRef.current / 2 + 8, 0, Math.PI * 2);
              octx.fillStyle = colorRef.current + "40";
              octx.fill();
              octx.strokeStyle = colorRef.current;
              octx.lineWidth = 3;
              octx.stroke();
            } else if (g === "erase") {
              lostDrawFramesRef.current = MAX_LOST_FRAMES; // erase → break stroke immediately
              prevPtRef.current = null;
              resetSmoothing(); // Reset smoothing saat erase
              dctx.save();
              dctx.globalCompositeOperation = "destination-out";
              dctx.beginPath();
              dctx.arc(palmX, palmY, ERASER_R, 0, Math.PI * 2);
              dctx.fillStyle = "rgba(0,0,0,1)";
              dctx.fill();
              dctx.restore();
              octx.beginPath();
              octx.arc(palmX, palmY, ERASER_R, 0, Math.PI * 2);
              octx.strokeStyle = "rgba(255,80,80,0.9)";
              octx.lineWidth = 3;
              octx.stroke();
              octx.fillStyle = "rgba(255,80,80,0.12)";
              octx.fill();
            } else if (g !== "undo" && g !== "redo") {
              // idle/pause: only break stroke after grace period
              lostDrawFramesRef.current++;
              if (lostDrawFramesRef.current >= MAX_LOST_FRAMES) {
                prevPtRef.current = null;
                resetSmoothing(); // Reset smoothing saat idle
              }
              octx.beginPath();
              octx.arc(tipX, tipY, 8, 0, Math.PI * 2);
              octx.fillStyle = "rgba(255,255,255,0.3)";
              octx.fill();
            }

            // Toolbar dwell-click
            if (g === "draw" && inToolbar) {
              prevPtRef.current = null;
              resetSmoothing(); // Reset smoothing saat di toolbar
              const el = document.elementFromPoint(tipX, tipY);
              const btnEl = el?.closest("[data-act]") as HTMLElement | null;
              const act = btnEl?.dataset.act ?? null;
              if (act) {
                if (act !== dwellActRef.current) {
                  dwellActRef.current = act;
                  dwellStartRef.current = performance.now();
                  dwellCoolRef.current = false;
                  setDwellBtn(act);
                } else if (!dwellCoolRef.current) {
                  const prog = Math.min((performance.now() - dwellStartRef.current) / DWELL_MS, 1);
                  const rect = btnEl!.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2,
                    cy = rect.top + rect.height / 2;
                  const r = Math.max(rect.width, rect.height) / 2 + 5;
                  octx.beginPath();
                  octx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
                  octx.strokeStyle = "white";
                  octx.lineWidth = 3;
                  octx.lineCap = "round";
                  octx.stroke();
                  if (prog >= 1) {
                    dwellCoolRef.current = true;
                    triggerBtn(act);
                    setDwellBtn(null);
                    setTimeout(() => {
                      dwellActRef.current = null;
                      dwellCoolRef.current = false;
                    }, 500);
                  }
                }
              } else if (dwellActRef.current) {
                dwellActRef.current = null;
                setDwellBtn(null);
              }
              octx.beginPath();
              octx.arc(tipX, tipY, 10, 0, Math.PI * 2);
              octx.fillStyle = "rgba(255,255,255,0.7)";
              octx.fill();
            } else if (dwellActRef.current) {
              dwellActRef.current = null;
              setDwellBtn(null);
            }

            prevModeRef.current = g;
          } else {
            // No hand detected — grace period before breaking stroke
            lostDrawFramesRef.current++;
            if (lostDrawFramesRef.current >= MAX_LOST_FRAMES) {
              setHasHand(false);
              setMode("idle");
              prevPtRef.current = null;
              prevModeRef.current = "idle";
              holdGestRef.current = null;
              if (dwellActRef.current) {
                dwellActRef.current = null;
                setDwellBtn(null);
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e.message || "Initialization failed");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      runRef.current = false;
      cancelAnimationFrame(rafRef.current);
      removeEventListener("resize", resize);
      // Use tracked stream variable (avoids stale videoRef.current warning)
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const modeBadge = {
    draw: "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.25)]",
    erase: "bg-red-500/20 border-red-500/60 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.25)]",
    undo: "bg-amber-500/20 border-amber-500/60 text-amber-300",
    redo: "bg-sky-500/20 border-sky-500/60 text-sky-300",
    idle: hasHand ? "bg-white/10 border-white/20 text-white/60" : "bg-white/5 border-white/10 text-white/30",
  }[mode];

  const modeLabel = {
    draw: "✍️  Menggambar",
    erase: "🧹  Menghapus",
    undo: "↩️  Undo…",
    redo: "↪️  Redo…",
    idle: hasHand ? "✋  Angkat 1 jari untuk menggambar" : "👋  Tunjukkan tangan Anda",
  }[mode];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Mirrored video feed */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-50" style={{ transform: "scaleX(-1)" }} muted playsInline autoPlay />
      {/* Drawing canvas — pointer-events-none so toolbar clicks pass through */}
      <canvas ref={drawRef} className="absolute inset-0 pointer-events-none" />
      {/* Landmark overlay */}
      <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />

      {/* Loading */}
      {loading && !err && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-3xl">🖐️</span>
          </div>
          <h1 className="mt-8 text-2xl font-bold text-white">Virtual Air Draw</h1>
          <p className="mt-2 text-white/40 text-sm">Initializing AI & Camera…</p>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
          <span className="text-5xl mb-4">⚠️</span>
          <p className="text-xl text-red-400 font-semibold">Initialization Error</p>
          <p className="mt-2 text-white/40 text-sm max-w-xs text-center">{err}</p>
        </div>
      )}

      {!loading && !err && (
        <>
          {/* Mode badge */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <div className={`px-5 py-2 rounded-full text-sm font-semibold tracking-wide backdrop-blur-md border transition-all duration-300 ${modeBadge}`}>{modeLabel}</div>
          </div>

          {/* Gesture guide */}
          <div className="absolute top-5 left-5 z-40 space-y-1.5 text-xs text-white/30 pointer-events-none select-none">
            <p className="font-semibold text-white/50 mb-1">Gesture Menggambar:</p>
            <p>☝️ Telunjuk terbuka → Menggambar</p>
            <p>✊ Telunjuk dilipat → Pause</p>
            <p>🤚 Telapak terbuka → Hapus</p>

            <p className="font-semibold text-white/50 mt-3 mb-1">Gesture Kontrol:</p>
            <p>✌️ 2 jari → Warna berikutnya</p>
            <p>🤟 3 jari → Warna sebelumnya</p>
            <p>🖖 4 jari → Ubah ukuran brush</p>
            <p>👍 Jempol (tahan) → Undo</p>
            <p>🤙 Kelingking (tahan) → Redo</p>
          </div>

          {/* Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl">
            {/* Color palette */}
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  data-act={`c:${c}`}
                  onClick={() => pickColor(c)}
                  title={c}
                  className="rounded-full border-2 transition-transform duration-150 hover:scale-110"
                  style={{
                    width: 26,
                    height: 26,
                    backgroundColor: c,
                    borderColor: color === c ? "white" : "rgba(255,255,255,0.15)",
                    transform: color === c || dwellBtn === `c:${c}` ? "scale(1.25)" : undefined,
                    boxShadow: color === c ? `0 0 8px ${c}` : undefined,
                  }}
                />
              ))}
            </div>

            <div className="w-px h-8 bg-white/15 mx-1" />

            {/* Brush sizes */}
            <div className="flex items-center gap-1.5">
              {BRUSH_SIZES.map((s) => (
                <button
                  key={s}
                  data-act={`s:${s}`}
                  onClick={() => pickSize(s)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                    size === s ? "bg-white/20" : "hover:bg-white/10"
                  } ${dwellBtn === `s:${s}` ? "ring-1 ring-white" : ""}`}
                >
                  <span className="rounded-full block" style={{ width: Math.min(s * 0.85, 22), height: Math.min(s * 0.85, 22), backgroundColor: color }} />
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-white/15 mx-1" />

            <button
              data-act="undo"
              onClick={doUndo}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dwellBtn === "undo" ? "bg-amber-500/20 text-amber-300" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              ↩ Undo
            </button>

            <button
              data-act="redo"
              onClick={doRedo}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dwellBtn === "redo" ? "bg-sky-500/20 text-sky-300" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              ↪ Redo
            </button>

            <button
              data-act="clear"
              onClick={doClear}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dwellBtn === "clear" ? "bg-red-500/20 text-red-300" : "text-red-400/70 hover:text-red-300 hover:bg-red-500/15"}`}
            >
              🗑 Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
