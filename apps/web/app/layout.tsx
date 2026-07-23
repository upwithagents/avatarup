import type { Metadata } from "next";
import { Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import { AppNav, ThemeScript } from "@upwithagents/ui";
import { PortalChrome } from "@/components/PortalChrome";
import "./globals.css";

const archivo = Archivo({
  variable: "--app-font-display",
  subsets: ["latin"],
  weight: ["600"],
});

const inter = Inter({
  variable: "--app-font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--app-font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AvatarUp",
  description: "Browser avatar customizer — shape and color your living avatar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <PortalChrome>
          <AppNav links={[{ href: "/", label: "Dashboard" }]} />
          {children}
        </PortalChrome>
      </body>
    </html>
  );
}
