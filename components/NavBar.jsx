'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Master Bidder List' },
  { href: '/offtakers', label: 'Offtaker Engagement List' },
  { href: '/development-tracker', label: 'Development Tracker' },
  { href: '/ai-agents', label: 'AI Agents' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
