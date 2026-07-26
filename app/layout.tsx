import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPair — Resolution Intelligence",
  description: "A deterministic, evidence-grounded dispute resolution operating system for American Express.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
