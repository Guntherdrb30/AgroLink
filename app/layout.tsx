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
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "AgroLynk",
    template: "%s | AgroLynk",
  },
  description:
    "Plataforma multiempresa para gestion de fincas, control ganadero, mercado verificado y operacion agropecuaria.",
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
      "Mercado y plataforma agropecuaria con operacion privada por empresa.",
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
        <ClerkProvider>
          <PwaProvider />
          {children}
          <FloatingWhatsAppButton />
        </ClerkProvider>
      </body>
    </html>
  );
}
