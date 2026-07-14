import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoLab - Modern Monorepo Voting Platform",
  description: "Next-generation secure educational cryptography platform with RSA and Paillier Homomorphic Encryption.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold tracking-tight text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                CryptoLab Monorepo
              </span>
            </div>
            <nav className="flex space-x-6 text-sm font-medium">
              <a href="/" className="text-slate-600 hover:text-indigo-600 transition">Overview</a>
              <a href="/rsa" className="text-slate-600 hover:text-indigo-600 transition">RSA keygen</a>
              <a href="/elections" className="text-slate-600 hover:text-indigo-600 transition">Elections</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-center text-xs text-slate-500">
          <p>© 2026 CryptoLab Academic & Educational Monorepo Platform.</p>
        </footer>
      </body>
    </html>
  );
}
