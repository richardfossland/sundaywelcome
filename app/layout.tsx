import type { Metadata } from "next";
import { Playfair_Display, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Suite brand fonts.
const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});
const body = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SundayWelcome — ta imot nye i menigheten",
  description:
    "Den digitale velkomstlappen: nye som besøker menigheten legger igjen et hei via QR på storskjermen, og havner rett i oppfølgings-innboksen din — slik at ingen forsvinner ut igjen.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="no" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
