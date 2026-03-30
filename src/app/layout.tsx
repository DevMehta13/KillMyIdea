import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Kill My Idea — AI Startup Idea Validator',
    template: '%s | Kill My Idea',
  },
  description:
    'AI-powered startup idea evaluation. Get a brutally honest verdict with evidence, scoring, and next steps.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://killmyidea.com',
  ),
  openGraph: {
    type: 'website',
    siteName: 'Kill My Idea',
    title: 'Kill My Idea — AI Startup Idea Validator',
    description:
      'Get a brutally honest verdict on your startup idea. Real data, real scoring, real next steps.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kill My Idea — AI Startup Idea Validator',
    description: 'Get a brutally honest verdict on your startup idea.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-sm">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-sm">
          Skip to content
        </a>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
