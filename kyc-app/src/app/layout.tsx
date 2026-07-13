import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const suisseIntl = localFont({
  variable: "--font-suisse",
  src: [
    { path: "./fonts/SuisseIntl-Regular.woff2", weight: "400", style: "normal" },
    // No licensed Bold/SemiBold file — map Medium across 500-700 so the browser
    // uses real glyphs for semibold/bold instead of synthesizing a fake bold.
    { path: "./fonts/SuisseIntl-Medium.woff2", weight: "500 700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Verify your identity — Saturn",
  description:
    "Connect your wallet and complete identity verification with Saturn.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${suisseIntl.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
