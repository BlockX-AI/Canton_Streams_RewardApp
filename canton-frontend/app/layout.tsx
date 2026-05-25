import type { Metadata } from "next"
import { Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"

import Providers from "@/components/providers"

const spaceGrotesk = Space_Grotesk({
  display: "swap",
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  display: "swap",
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "GrowStreams — Canton DevNet Money Streaming Protocol",
  description:
    "GrowStreams is a generalized token streaming protocol on Canton. Per-second CC payments for bounties, payroll, subscriptions, revenue share, grants, and more.",
  openGraph: {
    title: "GrowStreams — Canton DevNet Money Streaming Protocol",
    description:
      "Per-second token streaming on Canton DevNet. Bounties, payroll, subscriptions, revenue share — all powered by real-time streams.",
    url: "https://growstreams.app",
    siteName: "GrowStreams",
    images: [
      { url: "/logo.png", width: 1200, height: 630, alt: "GrowStreams Protocol" },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrowStreams — Canton DevNet Money Streaming Protocol",
    description:
      "Per-second token streaming on Canton DevNet. Bounties, payroll, subscriptions, revenue share — composable, token-agnostic, real-time.",
    images: ["/logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} dark`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body className="bg-provn-bg text-provn-text antialiased" suppressHydrationWarning={true}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
