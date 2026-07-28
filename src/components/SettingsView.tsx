import React, { useState, useEffect } from 'react';
import { Settings, Database, Download, Save, CheckCircle2, ShieldCheck, Server, UserCheck, Shield, Users } from 'lucide-react';
import { CompanySettings, User } from '../types';

interface SettingsViewProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: Partial<CompanySettings>) => void;
}

interface DBStatus {
  dbFileExists: boolean;
  filePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  lastModified: string;
  totalEmployees: number;
  totalAttendanceLogs: number;
  sqliteVersion: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setRegisteredUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setFormData(settings);
    fetchDbStatus();
    fetchUsers();
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onUpdateSettings(formData);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadSQLiteDB = () => {
    window.location.href = '/api/db/export';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-emerald-400" />
          Pengaturan Sistem & Database SQLite
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Konfigurasi jam kerja instansi/perusahaan dan manajemen file database SQLite lokal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Shift & Company Form */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Parameter Jam Kerja & Profil Instansi
          </h3>

          {saveSuccess && (
            <div className="mb-4 bg-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs font-semibold border border-emerald-500/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Pengaturan berhasil diperbarui dan tersimpan di SQLite!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nama Perusahaan / Instansi</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                required
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Jam Masuk Shift (HH:MM)</label>
                <input
                  type="text"
                  required
                  value={formData.workStartTime}
                  onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Jam Pulang Shift (HH:MM)</label>
                <input
                  type="text"
                  required
                  value={formData.workEndTime}
                  onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Toleransi Keterlambatan (Menit)</label>
                <input
                  type="number"
                  required
                  value={formData.lateToleranceMins}
                  onChange={(e) => setFormData({ ...formData, lateToleranceMins: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Batas Minimal Matriks Wajah</label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={formData.minMatchConfidence}
                  onChange={(e) => setFormData({ ...formData, minMatchConfidence: parseFloat(e.target.value) || 0.65 })}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableSoundEffect}
                  onChange={(e) => setFormData({ ...formData, enableSoundEffect: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Aktifkan Efek Suara Chime Saat Presensi Pemindaian Berhasil</span>
              </label>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: SQLite Database Management */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Status SQLite Database
            </h3>

            {dbStatus ? (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Engine Status:
                  </span>
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    SQLite Active
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lokasi File DB:</span>
                    <span className="font-mono text-slate-200 text-[11px] truncate max-w-[150px]">data/attendance.db</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ukuran Berkas:</span>
                    <span className="font-mono text-emerald-400 font-bold">{dbStatus.fileSizeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Karyawan:</span>
                    <span className="font-bold text-white">{dbStatus.totalEmployees} Orang</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Log Presensi:</span>
                    <span className="font-bold text-white">{dbStatus.totalAttendanceLogs} Record</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-400">
                  <p className="font-semibold text-slate-200 mb-1">Sinkronisasi Keamanan:</p>
                  <p>
                    Database disimpan secara terenkripsi dalam format binary SQLite. Anda dapat mengunduh salinan cadangan kapan saja.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Memuat status database...</p>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-4">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                Pengguna Terdaftar SQLite
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {registeredUsers.length} Akun
              </span>
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {registeredUsers.map((usr) => (
                <div
                  key={usr.id}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-200 truncate">{usr.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{usr.email}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-md capitalize">
                    {usr.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleDownloadSQLiteDB}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Unduh File SQLite (attendance.db)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
