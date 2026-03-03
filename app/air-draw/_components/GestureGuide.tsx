export const GestureGuide = () => {
  return (
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
  );
};
