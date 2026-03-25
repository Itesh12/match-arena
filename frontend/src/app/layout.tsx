import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/context/SocketContext";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Math Arena | Real-Time Multiplayer Battle",
  description: "Challenge your friends in the ultimate real-time mental math battleground. Premium, fast-paced, and addictive.",
  manifest: "/manifest.json"
};
import PWA from "@/components/PWA";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SocketProvider>
            <PWA />
            {children}
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
