'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const CRM_LINKS = [
  { href: '/', label: 'Master Bidder List' },
  { href: '/offtakers', label: 'Offtaker Engagement List' },
];

const TOP_LINKS = [
  { href: '/development-tracker', label: 'Development Tracker' },
  { href: '/ai-agents', label: 'AI Agents' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [crmOpen, setCrmOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isCrmActive = CRM_LINKS.some((l) => l.href === pathname);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCrmOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="flex gap-1 items-center">
      {/* CRM Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setCrmOpen((prev) => !prev)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
            isCrmActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          CRM
          <svg
            className={`w-3.5 h-3.5 transition-transform ${crmOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {crmOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[220px] z-50 py-1">
            {CRM_LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setCrmOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Other top-level links */}
      {TOP_LINKS.map((l) => {
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
