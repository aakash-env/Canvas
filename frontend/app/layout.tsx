import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Mini Design Canvas | Fast, Modern Web Graphics Editor",
  description: "A production-grade design canvas editor built with Next.js, React Konva, and MongoDB. Create, edit, transform shapes, manage layers, and export retina PNGs.",
  keywords: ["design canvas", "vector editor", "react konva", "nextjs", "graphics editor", "canvas app"],
  authors: [{ name: "Mini Design Canvas Team" }],
  openGraph: {
    title: "Mini Design Canvas",
    description: "Production-grade design canvas editor with real-time editing, layers, and cloud persistence.",
    type: "website",
    locale: "en_US",
    siteName: "Mini Design Canvas",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased font-sans`}
    >
      <body className="h-full flex flex-col overflow-hidden font-sans" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
