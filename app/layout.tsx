import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CANDO Hex - Decentralized Messaging Protocol",
  description: "Decentralized messaging with 3-Approval Rule - Messages spread through hexagonal rings only when 3 out of 6 neighbors approve",
  keywords: ["decentralized", "messaging", "p2p", "blockchain", "web3", "3-approval", "hexagonal", "open source"],
  authors: [{ name: "CANDO Hex Team" }],
  openGraph: {
    title: "CANDO Hex - Decentralized Messaging Protocol",
    description: "Decentralized messaging with 3-Approval Rule",
    type: "website",
    locale: "en_US",
    siteName: "CANDO Hex",
  },
  twitter: {
    card: "summary_large_image",
    title: "CANDO Hex - Decentralized Messaging Protocol",
    description: "Decentralized messaging with 3-Approval Rule",
  },
  icons: {
    icon: "/KANDOlogo.png",
    apple: "/KANDOlogo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${instrumentSans.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-[#0d1117]">{children}</body>
    </html>
  );
}