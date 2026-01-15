import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HyRank.gg | The Ultimate Hytale Server List - Coming Soon",
  description:
    "Discover and rank the best Hytale servers. Join the waitlist for HyRank.gg - the premier destination for Hytale server discovery, rankings, and community.",
  keywords: [
    "Hytale",
    "Hytale servers",
    "server list",
    "Hytale server list",
    "HyRank",
    "gaming",
    "multiplayer",
  ],
  authors: [{ name: "HyRank.gg" }],
  openGraph: {
    title: "HyRank.gg | The Ultimate Hytale Server List",
    description:
      "Discover and rank the best Hytale servers. Join the waitlist now!",
    url: "https://hyrank.gg",
    siteName: "HyRank.gg",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HyRank.gg | The Ultimate Hytale Server List",
    description:
      "Discover and rank the best Hytale servers. Join the waitlist now!",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-void-950 text-white antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
