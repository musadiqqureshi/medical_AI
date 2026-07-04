import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical AI Assistant",
  description: "Your smart health assistant — symptom guidance, lab explanations, and care navigation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
