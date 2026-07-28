import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, FileText, CheckCircle2, AlertTriangle, Users, Calendar, Sparkles } from 'lucide-react';
import { MonthlySummaryItem, CompanySettings } from '../types';
import { exportMonthlyToExcel, exportMonthlyToPDF, getMonthLabel } from '../lib/exportUtils';

interface MonthlyReportViewProps {
  settings: CompanySettings;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({ settings }) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [summaryData, setSummaryData] = useState<MonthlySummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const fetchMonthlySummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch (e) {
      console.error('Failed to load monthly summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySummary();
  }, [selectedMonth]);

  const handleExportExcel = () => {
    setExporting('excel');
    try {
      exportMonthlyToExcel(summaryData, selectedMonth, settings);
    } catch (err) {
      console.error('Export Excel failed:', err);
    } finally {
      setTimeout(() => setExporting(null), 800);
    }
  };

  const handleExportPDF = () => {
    setExporting('pdf');
    try {
      exportMonthlyToPDF(summaryData, selectedMonth, settings);
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setTimeout(() => setExporting(null), 800);
    }
  };

  // Metrics
  const totalEmployees = summaryData.length;
  const avgAttendanceRate = Math.round(
    summaryData.reduce((acc, curr) => acc + curr.attendancePercentage, 0) / (totalEmployees || 1)
  );
  const totalLateCases = summaryData.reduce((acc, curr) => acc + curr.totalTerlambat, 0);
  const totalLeaves = summaryData.reduce((acc, curr) => acc + curr.totalIzin + curr.totalSakit, 0);

  const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
            Laporan Bulanan & Ekspor Rekapitulasi
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unduh berkas resmi laporan kehadiran bulanan karyawan dalam format Excel (.xlsx) atau PDF.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-xs font-mono px-2 py-1 focus:outline-none"
            />
          </div>

          <button
            onClick={handleExportExcel}
            disabled={summaryData.length === 0 || exporting !== null}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting === 'excel' ? 'Mengunduh...' : 'Unduh Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={summaryData.length === 0 || exporting !== null}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{exporting === 'pdf' ? 'Mengunduh...' : 'Unduh PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Total Karyawan Aktif</span>
            <h3 className="text-2xl font-black text-white mt-0.5">{totalEmployees} orang</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Rata-Rata Kehadiran</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-0.5">{avgAttendanceRate}%</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Total Terlambat</span>
            <h3 className="text-2xl font-black text-amber-400 mt-0.5">{totalLateCases} kali</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Total Izin / Sakit</span>
            <h3 className="text-2xl font-black text-purple-400 mt-0.5">{totalLeaves} hari</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monthly Matrix Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">
            Matriks Presensi Harian — Periode: <span className="text-emerald-400">{getMonthLabel(selectedMonth)}</span>
          </h3>

          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> H: Hadir</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> T: Terlambat</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500"></span> I: Izin</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500"></span> S: Sakit</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> A: Alpha</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="px-3 py-3 sticky left-0 bg-slate-950 z-10">Karyawan</th>
                <th className="px-3 py-3">Departemen</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="px-1.5 py-3 text-center min-w-[28px]">
                    {d}
                  </th>
                ))}
                <th className="px-3 py-3 text-center">H</th>
                <th className="px-3 py-3 text-center">T</th>
                <th className="px-3 py-3 text-center">I/S</th>
                <th className="px-3 py-3 text-center">A</th>
                <th className="px-3 py-3 text-center font-bold text-emerald-400">% Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={daysInMonth + 7} className="text-center py-12 text-slate-500">
                    Memuat ringkasan laporan SQLite...
                  </td>
                </tr>
              ) : summaryData.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 7} className="text-center py-12 text-slate-500">
                    Tidak ada data karyawan untuk dilaporkan pada bulan ini.
                  </td>
                </tr>
              ) : (
                summaryData.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-white sticky left-0 bg-slate-900 z-10 whitespace-nowrap">
                      {emp.name} <span className="text-[10px] text-slate-400 font-mono">({emp.nip})</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{emp.department}</td>

                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                      const code = emp.dailyStatus[d] || '-';
                      return (
                        <td key={d} className="px-1 py-2.5 text-center">
                          <span
                            className={`inline-block w-5 h-5 rounded text-[10px] font-bold leading-5 ${
                              code === 'H'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : code === 'T'
                                ? 'bg-amber-500/20 text-amber-400'
                                : code === 'I'
                                ? 'bg-blue-500/20 text-blue-400'
                                : code === 'S'
                                ? 'bg-purple-500/20 text-purple-400'
                                : code === 'A'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'text-slate-600'
                            }`}
                          >
                            {code}
                          </span>
                        </td>
                      );
                    })}

                    <td className="px-3 py-2.5 text-center font-bold text-emerald-400">{emp.totalHadir}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-amber-400">{emp.totalTerlambat}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-400">{emp.totalIzin + emp.totalSakit}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-rose-400">{emp.totalAlpha}</td>
                    <td className="px-3 py-2.5 text-center font-extrabold text-emerald-400 font-mono">
                      {emp.attendancePercentage}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
