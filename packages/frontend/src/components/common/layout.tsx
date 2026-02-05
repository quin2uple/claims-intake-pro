import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { appRoutes } from '@/constants';
import { cn } from '@/lib/utils';
import { Bell, HelpCircle, Logo } from './icons';

export const Layout: React.FC = () => {
  const navItems = [
    { name: 'Dashboard', path: appRoutes.dashboard },
    { name: 'Analytics', path: appRoutes.analytics },
    { name: 'Team', path: appRoutes.team },
    { name: 'Settings', path: appRoutes.settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Logo />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Claims Intake Pro</h1>
            </div>

            <div className="flex-1 flex items-center justify-end gap-3">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'text-blue-700 font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative bg-slate-100">
                  <Bell />
                </button>
                <button className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg bg-slate-100">
                  <HelpCircle />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-semibold cursor-pointer hover:shadow-lg transition-shadow ml-3">
                  P
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-11">
        <Outlet />
      </main>
    </div>
  );
};
