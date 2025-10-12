import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forest Cabin - Your Curated Content Feed",
  description: "Intentional digital consumption without algorithmic chaos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
