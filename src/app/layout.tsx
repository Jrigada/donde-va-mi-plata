import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: "¿Dónde va mi plata? | Analizador de extractos bancarios",
  description:
    "Subí tu extracto bancario de Galicia y descubrí a dónde va tu plata. Análisis 100% privado en tu navegador. Gratis.",
  keywords: [
    "extracto bancario",
    "banco galicia",
    "finanzas personales",
    "argentina",
    "análisis gastos",
    "suscripciones",
    "impuestos",
  ],
  authors: [{ name: "Juan Rigada" }],
  openGraph: {
    title: "¿Dónde va mi plata?",
    description: "Descubrí en qué gastás analizando tu extracto de Galicia. 100% privado, gratis, en segundos.",
    type: "website",
    locale: "es_AR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "¿Dónde va mi plata? - Analizador de extractos bancarios",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "¿Dónde va mi plata?",
    description: "Descubrí en qué gastás analizando tu extracto de Galicia. 100% privado y gratis.",
    creator: "@jrigada",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${outfit.variable} ${ibmPlexMono.variable} antialiased grain-overlay`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
