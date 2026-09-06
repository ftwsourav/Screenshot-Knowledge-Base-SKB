import Link from 'next/link';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-baseline justify-between">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            📷 Screenshot Knowledge Base
          </Link>
          <span className="text-sm text-slate-500">Local-first screenshot search</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 w-full">{children}</main>
    </div>
  );
}