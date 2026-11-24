import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif, League_Spartan } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});
const label = League_Spartan({ subsets: ["latin"], weight: ["600"], variable: "--font-league-spartan" });
const sans = DM_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "STRATLEARN · My learning",
  description: "Quick, friendly training for your team, from The Strategic Learning Co.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#400265",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${label.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 chip">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
