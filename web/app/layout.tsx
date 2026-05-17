import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sonar — The Feedback Layer for Sui",
  description: "Tamper-evident, encryption-ready feedback forms powered by Sui, Walrus, and Seal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script id="theme-loader" dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('sonar-theme');
              if (t === 'dark') {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
