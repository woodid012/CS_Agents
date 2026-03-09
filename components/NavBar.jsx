'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const NAV_PILLARS = [
  {
    label: 'Investors',
    links: [
      { href: '/', label: 'Bidder List' },
      { href: '/analytics', label: 'Analytics' },
      { href: '/insights/submit', label: 'Submit Insight' },
      { href: '/insights', label: 'Recent Insights' },
{ href: '/insights/submit', label: 'Submit Insight' },
    ],
  },
  {
    label: 'Offtakers',
    links: [
      { href: '/offtakers', label: 'Offtaker List' },
      { href: '/offtaker-insights/submit', label: 'Submit Insight' },
      { href: '/offtaker-insights', label: 'Recent Insights' },
    ],
  },
  {
    label: 'Data - Prices',
    links: [
      { href: '/market-data/price-curves', label: 'Price Curves' },
      { href: '/market-data/forward-curves', label: 'Forward Curves' },
    ],
  },
  {
    label: 'Data - Capex',
    links: [
      { href: '/capex', label: 'Project Capex' },
      { href: '/market-data/capex-opex', label: 'Benchmarks' },
    ],
  },
];

function Dropdown({ label, links, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = links.some((l) =>
    l.href === '/' ? pathname === '/' : pathname === l.href || pathname.startsWith(l.href + '/')
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
          isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[200px] z-50 py-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TOP_LINKS = [
  { href: '/news', label: 'News' },
  { href: '/ideas', label: 'Ideas' },
  { href: '/ai-agents', label: 'AI Agents' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-0.5 items-center">
      {NAV_PILLARS.map((pillar) => (
        <Dropdown
          key={pillar.label}
          label={pillar.label}
          links={pillar.links}
          pathname={pathname}
        />
      ))}
      {TOP_LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}





