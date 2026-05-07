import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — VideoAI Parser",
  description: "Upload your video and describe your edits in plain English.",
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
