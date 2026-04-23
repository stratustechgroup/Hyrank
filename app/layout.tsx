import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { defaultMetadata } from "@/lib/seo/metadata";
import { generateWebsiteSchema, generateOrganizationSchema, generateHytaleVideoGameSchema, jsonLdScript } from "@/lib/seo/schemas";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = generateWebsiteSchema();
  const orgSchema = generateOrganizationSchema();
  const videoGameSchema = generateHytaleVideoGameSchema();

  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(videoGameSchema as unknown as Record<string, unknown>) }}
        />
      </head>
      <body>
        <AuthProvider>
          <AnimatedBackground />
          <Navigation />
          <main className="pt-16">
            {children}
          </main>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
