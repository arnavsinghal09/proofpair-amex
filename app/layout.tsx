import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPair — Dispute Review",
  description: "A two-sided, evidence-grounded dispute review workspace for American Express.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
