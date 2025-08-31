import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/theme.css";
import QueryProvider from "@/providers/QueryProvider";
import ServiceWorkerProvider from "@/providers/ServiceWorkerProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Alp Sistem - Tekniksyen Takip Sistemi",
  description: "Tekniksyen ve envanter yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="alp-theme">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Alp Sistem" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-primary text-primary`}
      >
        <ServiceWorkerProvider>
          <QueryProvider>
            <div id="app-root">
              {children}
            </div>
          </QueryProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}