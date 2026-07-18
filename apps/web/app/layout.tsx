import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PortalChrome } from "@/components/PortalChrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PortalChrome />
        {children}
      </body>
    </html>
  );
}
