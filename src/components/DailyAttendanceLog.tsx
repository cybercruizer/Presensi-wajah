import React, { useState } from 'react';
import { Calendar, Search, Filter, PlusCircle, CheckCircle2, AlertCircle, Clock, FileText, Image as ImageIcon, X } from 'lucide-react';
import { AttendanceRecord, Employee } from '../types';

interface DailyAttendanceLogProps {
  records: AttendanceRecord[];
  employees: Employee[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onReload: () => void;
}

export const DailyAttendanceLog: React.FC<DailyAttendanceLogProps> = ({
  records,
  employees,
  selectedDate,
  setSelectedDate,
  onReload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEmpId, setManualEmpId] = useState('');
  const [manualStatus, setManualStatus] = useState<'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpha'>('Izin');
  const [manualTimeIn, setManualTimeIn] = useState('08:00:00');
  const [manualTimeOut, setManualTimeOut] = useState('17:00:00');
  const [manualNotes, setManualNotes] = useState('');

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.employeeNip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpId) return;

    try {
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: manualEmpId,
          date: selectedDate,
          timeIn: manualTimeIn,
          timeOut: manualTimeOut,
          status: manualStatus,
          notes: manualNotes,
        }),
      });

      if (res.ok) {
        setShowManualModal(false);
        onReload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Title & Date Picker Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-400" />
            Riwayat & Log Presensi Harian
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar presensi real-time karyawan tersimpan di SQLite berdasarkan tanggal pencatatan.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-mono shadow"
          />

          <button
            onClick={() => {
              setManualEmpId(employees[0]?.id || '');
              setShowManualModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Presensi Manual / Izin</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Nama Karyawan, NIP..."
            className="w-full bg-slate-950 text-slate-100 text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
            <option value="Alpha">Alpha</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Foto Proof</th>
                <th className="px-4 py-3.5">NIP</th>
                <th className="px-4 py-3.5">Nama Karyawan</th>
                <th className="px-4 py-3.5">Departemen</th>
                <th className="px-4 py-3.5">Jam Masuk</th>
                <th className="px-4 py-3.5">Jam Pulang</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Akurasi Wajah</th>
                <th className="px-4 py-3.5">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    Tidak ada log presensi untuk tanggal {selectedDate}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      {rec.photoProof ? (
                        <button
                          onClick={() => setPreviewPhoto(rec.photoProof)}
                          className="relative group rounded-xl overflow-hidden border border-slate-700 inline-block"
                        >
                          <img src={rec.photoProof} alt="Proof" className="w-9 h-9 object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ImageIcon className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{rec.employeeNip}</td>
                    <td className="px-4 py-3 font-bold text-white">{rec.employeeName}</td>
                    <td className="px-4 py-3 text-slate-400">{rec.department}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">{rec.timeIn}</td>
                    <td className="px-4 py-3 font-mono text-amber-400">{rec.timeOut || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'Hadir'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : rec.status === 'Terlambat'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : rec.status === 'Izin'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : rec.status === 'Sakit'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {rec.matchScore ? `${Math.round(rec.matchScore * 100)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{rec.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Proof Modal Preview */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl text-center">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-white mb-3">Foto Sampel Bukti Presensi Kamera</h4>
            <img src={previewPhoto} alt="Proof Large" className="w-full rounded-2xl border border-slate-700 shadow" />
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Input Presensi Manual HR
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Catat izin, sakit, atau penyesuaian kehadiran karyawan secara manual.
            </p>

            <form onSubmit={handleSaveManual} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Pilih Karyawan</label>
                <select
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (NIP: {emp.nip})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status Kehadiran</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as any)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Alpha">Alpha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Jam Masuk</label>
                  <input
                    type="text"
                    value={manualTimeIn}
                    onChange={(e) => setManualTimeIn(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Jam Pulang</label>
                  <input
                    type="text"
                    value={manualTimeOut}
                    onChange={(e) => setManualTimeOut(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Keterangan / Alasan</label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Contoh: Surat Izin Dokter / Keperluan Dinas Luar"
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow"
                >
                  Simpan Presensi Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
