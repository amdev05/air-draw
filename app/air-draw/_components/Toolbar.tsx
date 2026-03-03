"use client";

interface Props {
  COLORS: string[];
  color: string;
  pickColor: (c: string) => void;
  BRUSH_SIZES: number[];
  size: number;
  pickSize: (s: number) => void;
  dwellBtn: string | null;
  doUndo: () => void;
  doRedo: () => void;
  doClear: () => void;
}

export const Toolbar = ({ COLORS, pickColor, color, dwellBtn, BRUSH_SIZES, pickSize, size, doUndo, doRedo, doClear }: Props) => {
  return (
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
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${size === s ? "bg-white/20" : "hover:bg-white/10"} ${dwellBtn === `s:${s}` ? "ring-1 ring-white" : ""}`}
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
  );
};
