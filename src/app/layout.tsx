import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const suisseIntl = localFont({
  variable: "--font-suisse",
  src: [
    { path: "./fonts/SuisseIntl-Regular.woff2", weight: "400", style: "normal" },
    // No licensed Bold/SemiBold file — map Medium across 500-700 so the
    // browser uses its real glyphs for font-semibold/font-bold instead of
    // synthesizing a fake bold from Regular (looks noticeably off, especially
    // at the large sizes used in the logo and hero heading).
    { path: "./fonts/SuisseIntl-Medium.woff2", weight: "500 700", style: "normal" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yield opportunities — Saturn",
  description:
    "Compare yield opportunities across USDat, sUSDat, srUSDat, and jrUSDat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${suisseIntl.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
