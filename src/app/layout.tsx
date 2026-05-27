import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { PlayerProvider } from "@/components/PlayerProvider";

export const metadata: Metadata = {
  title: "AURA MUSIC - Neural Sync System",
  description: "AI 驱动的赛博朋克音乐控制台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full flex flex-col">
        <PlayerProvider>
          <AppShell>
            {children}
          </AppShell>
        </PlayerProvider>
      </body>
    </html>
  );
}
