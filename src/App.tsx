import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StreamingKiosk } from './components/StreamingKiosk';
import { EmployeeList } from './components/EmployeeList';
import { DailyAttendanceLog } from './components/DailyAttendanceLog';
import { MonthlyReportView } from './components/MonthlyReportView';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';
import { Employee, AttendanceRecord, CompanySettings, User } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'kiosk' | 'employees' | 'daily' | 'monthly' | 'settings'>('kiosk');

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dailyRecords, setDailyRecords] = useState<AttendanceRecord[]>([]);

  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'PT Teknologi Nusantara Utama',
    companyAddress: 'Jl. Jendral Sudirman No. 88, Jakarta Selatan',
    workStartTime: '08:00',
    workEndTime: '17:00',
    lateToleranceMins: 15,
    enableSoundEffect: true,
    minMatchConfidence: 0.65,
  });

  // Restore & verify User Auth on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');

    if (savedUser && savedToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);

        // Verify token with backend /api/auth/me
        fetch(`/api/auth/me?userId=${savedToken}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.user) {
              setCurrentUser(data.user);
              localStorage.setItem('auth_user', JSON.stringify(data.user));
            }
          })
          .catch((err) => console.error('Auth verification error:', err));
      } catch (e) {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    } else {
      // Default auto-login to default admin for smooth initial experience
      fetch('/api/auth/me?userId=usr-admin-default')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            localStorage.setItem('auth_token', data.user.id);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore
    }
    setCurrentUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  // Fetch Employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  }, []);

  // Fetch Today's Attendance
  const fetchTodayRecords = useCallback(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/attendance?date=${todayStr}`);
      if (res.ok) {
        const data = await res.json();
        setTodayRecords(data);
      }
    } catch (err) {
      console.error('Failed to fetch today records:', err);
    }
  }, []);

  // Fetch Daily Attendance for Selected Date
  const fetchDailyRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setDailyRecords(data);
      }
    } catch (err) {
      console.error('Failed to fetch daily records:', err);
    }
  }, [selectedDate]);

  // Fetch Company Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchTodayRecords();
    fetchSettings();
  }, [fetchEmployees, fetchTodayRecords, fetchSettings]);

  useEffect(() => {
    fetchDailyRecords();
  }, [selectedDate, fetchDailyRecords]);

  const handleAttendanceSuccess = () => {
    fetchTodayRecords();
    fetchDailyRecords();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        companyName={settings.companyName}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {activeTab === 'kiosk' && (
          <StreamingKiosk
            employees={employees}
            todayRecords={todayRecords}
            onAttendanceSuccess={handleAttendanceSuccess}
            settings={settings}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeList employees={employees} onReload={fetchEmployees} />
        )}

        {activeTab === 'daily' && (
          <DailyAttendanceLog
            records={dailyRecords}
            employees={employees}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onReload={() => {
              fetchTodayRecords();
              fetchDailyRecords();
            }}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyReportView settings={settings} />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
          />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user) => setCurrentUser(user)}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-4 px-6 text-center">
        <p>
          © 2026 {settings.companyName} — Sistem Presensi Wajah Real-Time dengan Sync Backend SQLite & Otentikasi
        </p>
      </footer>
    </div>
  );
}

