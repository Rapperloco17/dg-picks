import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { LocalDataProvider } from "@/services/local-data-provider";
import { AutoSync } from "@/components/auto-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DG Picks - Análisis Deportivo Profesional",
  description: "Sistema avanzado de análisis deportivo con predicciones basadas en datos, seguimiento de picks y estadísticas detalladas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocalDataProvider>
          <AppLayout>
            {children}
            <AutoSync />
          </AppLayout>
        </LocalDataProvider>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#f1f5f9',
            },
          }}
        />
      </body>
    </html>
  );
}
