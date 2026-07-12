import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Circuit Tracker",
  description: "U14 off-ice strength circuit tracker",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0b6bcb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-neutral-100 text-neutral-900 antialiased">
          {children}
          <script
            dangerouslySetInnerHTML={{
              __html: `if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");`,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
