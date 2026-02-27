import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

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
    <html lang="ja">
      {/* 背景色や幅の制限をすべて取り除きました */}
      <body className={`${mPlusRounded.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}