import type { Metadata } from "next";
import { Cal_Sans, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { MantleMark } from "@/components/mantle-mark";
import { Navigation } from "@/components/navigation";
import "./globals.css";

// next/font downloads these at build time and serves them from this instance,
// so browsing the registry makes no third-party font requests.
const display = Cal_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Mantle Registry", template: "%s · Mantle" },
  description:
    "Browse the agents and YAML configurations available on this Mantle registry.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <a className="skip-link" href="#workspace">
          Skip to content
        </a>
        <header className="app-header">
          <div className="header-inner">
            <Link href="/" className="wordmark" aria-label="Mantle agents">
              <MantleMark />
              <span>Mantle</span>
            </Link>
            <Navigation />
            <span className="instance-label">
              <span className="status-dot" /> Self-hosted registry
            </span>
          </div>
        </header>
        {children}
        <footer className="app-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <Link href="/" className="wordmark">
                <MantleMark />
                <span>Mantle</span>
              </Link>
              <p>
                A self-hosted registry for Mantle agents. It stores each
                agent’s YAML configuration and its revisions.
              </p>
            </div>
            <nav aria-label="Registry">
              <h2>Registry</h2>
              <Link href="/">Agents</Link>
              <Link href="/editor">YAML editor</Link>
            </nav>
            <nav aria-label="Command line">
              <h2>Command line</h2>
              <a href="https://github.com/farismohammad/mantle">
                Mantle CLI on GitHub
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
