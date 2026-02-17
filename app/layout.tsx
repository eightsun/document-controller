import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Controller | Admin Dashboard",
  description: "Professional document management and control system",
  icons: {
    icon: "/favicon.ico",
  },
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
