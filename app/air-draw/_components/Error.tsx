interface Props {
  err: string | null;
}

export default function Error({ err }: Props) {
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
    <span className="text-5xl mb-4">⚠️</span>
    <p className="text-xl text-red-400 font-semibold">Initialization Error</p>
    <p className="mt-2 text-white/40 text-sm max-w-xs text-center">{err}</p>
  </div>;
}
