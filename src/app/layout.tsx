import type { Metadata } from "next"
import { Archivo, IBM_Plex_Mono } from "next/font/google"
import { SessionProvider } from "@/components/SessionProvider"
import "../../styles/inky.css"
import "./globals.css"

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--sans",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--mono",
})

export const metadata: Metadata = {
  title: "Inkycut - idea to finished video, on one canvas",
  description: "The infinite canvas for video. From a single idea to a finished, edited cut.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${ibmPlexMono.variable}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
