import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { Suspense } from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

// Clinical UI typography: Geist for text, Geist Mono for clinical figures
// (doses, cycles, dates, adherence %). These variables are consumed by
// globals.css (@theme maps --font-sans -> --font-geist-sans, --font-mono -> --font-geist-mono).
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

// Display face for page titles, banners and the wordmark only — gives the UI a
// distinct voice (body copy stays in Geist).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: "OnControl - Apoyo integral para pacientes oncológicos",
  description:
    "OnControl facilita la gestión del tratamiento oncológico, mejorando la comunicación entre médicos y pacientes para una atención más efectiva y personalizada en Perú.",
  keywords: "oncología, cáncer, tratamiento, citas, médico, paciente, recordatorio, calendario, chat médico, Perú",
  authors: [{ name: "OnControl Team" }],
  openGraph: {
    title: "OnControl - Apoyo integral para pacientes oncológicos",
    description: "Plataforma integral para la gestión de tratamientos oncológicos en Perú",
    type: "website",
    locale: "es_PE",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
