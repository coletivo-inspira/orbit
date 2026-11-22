import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { LiquidSheen } from "@/components/ui/LiquidSheen";
import "./globals.css";

// Bricolage Grotesque (SIL OFL 1.1, see ./fonts/OFL.txt) — headings and wordmark per the brandbook.
const bricolage = localFont({
  src: "./fonts/BricolageGrotesque.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
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
  themeColor: "#1c2631",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <LiquidSheen />
        {children}
      </body>
    </html>
  );
}
