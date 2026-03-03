import { Metadata } from "next";
import DrawingBoard from "./_components/DrawingBoard";

export const metadata: Metadata = {
  title: "Virtual Air Draw",
  description: "Draw in the air with your finger — powered by MediaPipe",
};

export default function AirDraw() {
  return (
    <main>
      <DrawingBoard />
    </main>
  );
}
