import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import NetworkStatus from "@/components/NetworkStatus";
import { ToastProvider } from "@/components/Toast";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e0e11",
};

const SITE_URL = "https://pb-card-deck.vercel.app";
const TITLE = "PB Card Deck";
const DESCRIPTION =
  "Draw twist cards mid-match and shake up your pickleball game. 1,729 cards, 5 deck modes, a real side-out scorekeeper - free, mobile-first, works offline.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PB Card Deck - Pickleball twist cards + scorekeeper", template: "%s - PB Card Deck" },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: ["pickleball", "card game", "scorekeeper", "twist cards", "doubles", "drills", "PWA"],
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PB Card Deck",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} data-theme="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-dvh">
        <ToastProvider>
          <NetworkStatus />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
