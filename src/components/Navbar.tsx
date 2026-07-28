import React, { useState, useEffect } from 'react';
import { Camera, Users, Calendar, FileSpreadsheet, Settings, Database, Clock } from 'lucide-react';

interface NavbarProps {
  activeTab: 'kiosk' | 'employees' | 'daily' | 'monthly' | 'settings';
  setActiveTab: (tab: 'kiosk' | 'employees' | 'daily' | 'monthly' | 'settings') => void;
  companyName: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, companyName }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      setTimeStr(now.toLocaleDateString('id-ID', options));
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'kiosk', label: 'Streaming Presensi', icon: Camera },
    { id: 'employees', label: 'Data Karyawan', icon: Users },
    { id: 'daily', label: 'Riwayat Presensi', icon: Calendar },
    { id: 'monthly', label: 'Laporan Bulanan', icon: FileSpreadsheet },
    { id: 'settings', label: 'Pengaturan & SQLite', icon: Settings },
  ] as const;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md text-slate-950 font-black text-xl">
              <Camera className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-none">
                {companyName || 'Presensi Wajah Real-Time'}
              </h1>
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                SQLite Local Sync Active
              </p>
            </div>
          </div>

          {/* Clock Widget */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{timeStr}</span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
