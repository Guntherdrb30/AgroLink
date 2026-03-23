import type { Metadata, Viewport } from "next";
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
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "AgroLynk",
    template: "%s | AgroLynk",
  },
  description:
    "SaaS multitenant para gestion de fincas, control ganadero, marketplace verificado y operacion agropecuaria.",
  applicationName: "AgroLynk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgroLynk",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "AgroLynk",
    description:
      "Marketplace y SaaS agropecuario con operacion privada por tenant.",
    siteName: "AgroLynk",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
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
        <PwaProvider />
        {children}
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}
