import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Algo Trainer",
  description: "AI-powered algorithm tutoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-gruvbox-bg text-gruvbox-fg antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
