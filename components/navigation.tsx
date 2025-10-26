'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const mainNavItems = [
    { href: '/watch', label: 'Watch' },
    { href: '/scroll', label: 'Scroll' },
  ];

  const secondaryNavItems = [
    { href: '/sources', label: 'Sources' },
    { href: '/filters', label: 'Filters' },
    { href: '/saved', label: 'Saved' },
    { href: '/history', label: 'History' },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const isDarkMode = pathname === '/watch';

  return (
    <nav className={`border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className={`text-lg font-mono ${isDarkMode ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                <span className="font-normal text-blue-500">feed</span>
                <span className="text-gray-400">.</span>
                <span className="font-semibold">enda.cat</span>
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
              {/* Main navigation - Watch/Scroll */}
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold ${
                    pathname === item.href
                      ? `border-blue-500 ${isDarkMode ? 'text-white' : 'text-gray-900 dark:text-white'}`
                      : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'}`
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Divider */}
              <div className={`border-l my-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200 dark:border-gray-700'}`}></div>

              {/* Secondary navigation */}
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? `border-blue-500 ${isDarkMode ? 'text-white' : 'text-gray-900 dark:text-white'}`
                      : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'}`
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleSignOut}
              className={`text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
