import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TopGoals — Live Scores, Daily Betting Tips & Football News",
  description:
    "Live football scores, daily betting tips with tracked results, transfer news, and goals & highlights — built for speed on any connection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${inter.variable} ${jbmono.variable}`}
    >
      <body className="min-h-screen bg-ink font-body text-floodlight antialiased pb-16 md:pb-0">
        {children}
      </body>
    </html>
  );
}
