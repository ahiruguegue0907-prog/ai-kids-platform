import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const dynamic = 'force-dynamic';

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  variable: "--font-m-plus-rounded",
});

export const metadata: Metadata = {
  title: "AI Kids Platform",
  description: "きっずむけ AIポータルサイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body className={`${mPlusRounded.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
