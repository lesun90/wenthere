import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beenthere",
  description: "Your travel story, on a globe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
