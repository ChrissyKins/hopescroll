import type { Metadata } from "next";
import { validateEnv } from "@/lib/config";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

// Validate environment variables on startup
// Only in production/development, not during build time
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    // In production, we want to fail fast
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

export const metadata: Metadata = {
  title: "feed.enda.cat - Your Curated Content Feed",
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
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
