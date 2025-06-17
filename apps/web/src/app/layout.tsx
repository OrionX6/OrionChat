import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Inter, Roboto, Open_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FontProvider } from "@/contexts/FontContext";
import { MessageLimitProvider } from "@/contexts/MessageLimitContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrionChat",
  description: "AI Chat Application with Multiple Models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} ${inter.variable} ${roboto.variable} ${openSans.variable} antialiased`}
      >
        <ThemeProvider defaultBaseTheme="dark" defaultColorTheme="default">
          <FontProvider>
            <AuthProvider>
              <MessageLimitProvider>
                {children}
              </MessageLimitProvider>
            </AuthProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
