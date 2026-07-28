import React, { useState, useEffect } from 'react';
import { Camera, Users, Calendar, FileSpreadsheet, Settings, Clock, LogIn, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: 'kiosk' | 'employees' | 'daily' | 'monthly' | 'settings';
  setActiveTab: (tab: 'kiosk' | 'employees' | 'daily' | 'monthly' | 'settings') => void;
  companyName: string;
  currentUser: User | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  companyName,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
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
          <div className="hidden xl:flex items-center space-x-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-300">
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

          {/* User Profile / Auth Actions */}
          <div className="flex items-center space-x-2 border-l border-slate-800 pl-3 ml-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1 flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="font-semibold text-slate-100 leading-tight max-w-[120px] truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-emerald-400 capitalize flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      {currentUser.role}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Keluar dari Akun"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all"
                >
                  <span>Daftar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

