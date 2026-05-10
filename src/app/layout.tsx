import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://what-shall-we-see.vercel.app",
  ),
  title: "What Shall We See",
  description:
    "A collaborative media tracker for movies, series, books, manga, and manhwa.",
  icons: {
    icon: [
      {
        url: "/wsws-favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],
    shortcut: "/wsws-favicon-16x16.png",
    apple: "/wsws-favicon-16x16.png",
  },
  openGraph: {
    title: "What Shall We See",
    description:
      "A collaborative media tracker for movies, series, books, manga, and manhwa.",
    type: "website",
    images: [
      {
        url: "/branding/cd8674eb-d1aa-4bce-a71b-2a5e17c58eed.png",
        width: 1200,
        height: 630,
        alt: "What Shall We See preview image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "What Shall We See",
    description:
      "A collaborative media tracker for movies, series, books, manga, and manhwa.",
    images: ["/branding/cd8674eb-d1aa-4bce-a71b-2a5e17c58eed.png"],
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
      suppressHydrationWarning
      className={`${manrope.variable} ${ibmPlexMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
