import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { FloatingWhatsAppButton } from "@/components/shared/floating-whatsapp-button";
import { PwaProvider } from "@/components/shared/pwa-provider";

import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://agro-link-gray.vercel.app"),
  title: {
    default: "GanadIA",
    template: "%s | GanadIA",
  },
  description: "Tu finca, gestión inteligente. Plataforma de gestión agropecuaria.",
  applicationName: "GanadIA",
  icons: { icon: "/logo/ganadia-icon.svg", shortcut: "/logo/ganadia-icon.svg", apple: "/icons/apple-touch-icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GanadIA",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "GanadIA",
    description:
      "Mercado y plataforma agropecuaria con operacion privada por empresa.",
    siteName: "GanadIA",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#9B6D1C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} bg-background text-foreground antialiased`}
      >
        <ClerkProvider>
          <PwaProvider />
          {children}
          <FloatingWhatsAppButton />
        </ClerkProvider>
      </body>
    </html>
  );
}
