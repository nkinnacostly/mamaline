import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Poppins } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MamaLine | Pregnancy and baby care on any phone",
  description:
    "MamaLine is a free USSD and SMS health line for pregnant women and new mothers in Nigeria, in five languages, linked to their community health worker.",
};

export const viewport: Viewport = {
  themeColor: "#3f561f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${poppins.variable} antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
