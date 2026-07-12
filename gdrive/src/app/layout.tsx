import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Drive KKN GIAT 16 DESA TANJUNGSARI",
  description: "Pusat Data KKN",
  icons: {
    icon: "https://cdn.discordapp.com/attachments/1195930707059548290/1525783780172894308/logo_kkn-removebg-preview.png?ex=6a54a460&is=6a5352e0&hm=a3ce55361aac5ad9c375d8848de0b20af5de720f7d5859b9dbbd73de39d3ac13&"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
