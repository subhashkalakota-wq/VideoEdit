import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "VideoAI Parser — AI Video Editing Command Engine",
  description: "Convert natural language video editing instructions into precise video operations instantly. Upload your video, describe your edits, get results.",
  keywords: ["video editing", "AI", "FFmpeg", "command parser", "video effects"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-[#f5f7ff] text-slate-900 overflow-x-hidden">
        {/* Light aurora background */}
        <div className="aurora" aria-hidden="true">
          <div className="aurora-orb aurora-1" />
          <div className="aurora-orb aurora-2" />
          <div className="aurora-orb aurora-3" />
          <div className="aurora-orb aurora-4" />
        </div>
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "12px",
              fontSize: "0.875rem",
              boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
            },
            success: { iconTheme: { primary: "#7c3aed", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
