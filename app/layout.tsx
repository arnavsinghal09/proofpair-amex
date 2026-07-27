import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPair — Resolution Control",
  description: "An evidence-grounded dispute operations and resolution-control workspace for American Express.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
