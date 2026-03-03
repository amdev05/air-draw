interface Props {
  mode: string;
  hasHand: boolean;
}

export const ModeBadge = ({ mode, hasHand }: Props) => {
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
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className={`px-5 py-2 rounded-full text-sm font-semibold tracking-wide backdrop-blur-md border transition-all duration-300 ${modeBadge}`}>{modeLabel}</div>
    </div>
  );
};
