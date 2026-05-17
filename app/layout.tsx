// app/layout.tsx
// ROOT LAYOUT — wraps every single page in the app
// Think of it like the picture frame around all your pages

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hookify — just the hook",
  description: "15 seconds. the hook. skip everything else.",
  icons: {
    icon: "/Elephant_Beats.jpeg", // Use elephant as browser tab icon
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0e1a] antialiased">
        {children}
      </body>
    </html>
  );
}