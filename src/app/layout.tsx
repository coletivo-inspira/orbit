import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { LiquidSheen } from "@/components/ui/LiquidSheen";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Orbit — hub social, comunidade & saúde",
    template: "%s · Orbit",
  },
  description:
    "Orbit centraliza seu perfil e seus selos de apps, mostra quem está na sua órbita, abre um parque 2D para conversar e oferece conteúdo público sobre saúde e prevenção.",
  applicationName: "Orbit",
  appleWebApp: { capable: true, title: "Orbit", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b101d",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <LiquidSheen />
        {children}
      </body>
    </html>
  );
}
