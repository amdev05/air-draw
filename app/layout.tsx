import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Virtual Air Draw",
  description: "Draw in the air with your finger — powered by MediaPipe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] overflow-hidden">{children}</body>
    </html>
  );
}
