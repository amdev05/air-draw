export const Loading = () => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-3xl">🖐️</span>
      </div>
      <h1 className="mt-8 text-2xl font-bold text-white">Virtual Air Draw</h1>
      <p className="mt-2 text-white/40 text-sm">Initializing AI & Camera…</p>
    </div>
  );
};
