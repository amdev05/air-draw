"use client";

import { useEffect, useState } from "react";

export const FullscreenButton = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fungsi untuk toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  useEffect(() => {
    // Listen untuk perubahan fullscreen (misal user tekan ESC)
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <button
      onClick={toggleFullscreen}
      className="absolute bottom-6 right-6 z-40 w-12 h-12 flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl hover:bg-white/10 transition-all group"
      title={isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen"}
    >
      {isFullscreen ? (
        // Icon exit fullscreen
        <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
          />
        </svg>
      ) : (
        // Icon fullscreen
        <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5.25 5.25M20 8V4m0 0h-4m4 0l-5.25 5.25M4 16v4m0 0h4m-4 0l5.25-5.25M20 16v4m0 0h-4m4 0l-5.25-5.25" />
        </svg>
      )}
    </button>
  );
};
