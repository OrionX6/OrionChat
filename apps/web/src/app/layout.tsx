import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Playfair_Display, Poppins, Crimson_Text } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FontProvider } from "@/contexts/FontContext";
import { MessageLimitProvider } from "@/contexts/MessageLimitContext";
import { EnabledModelsProvider } from "@/contexts/EnabledModelsContext";
import { themeScript } from "@/lib/theme-script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600"],
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
    <html lang="en" className="dark theme-default">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${poppins.variable} ${crimsonText.variable} antialiased font-sans`}
      >
        <ThemeProvider defaultBaseTheme="dark" defaultColorTheme="default">
          <FontProvider>
            <AuthProvider>
              <MessageLimitProvider>
                <EnabledModelsProvider>
                  {children}
                </EnabledModelsProvider>
              </MessageLimitProvider>
            </AuthProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
