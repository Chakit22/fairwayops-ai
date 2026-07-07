import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairwayOps AI",
  description: "AI receptionist demo dashboard for golf club operations"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
