import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlySummaryItem, AttendanceRecord, CompanySettings } from '../types';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getMonthLabel(monthStr: string): string {
  // monthStr: "2026-07"
  const [year, month] = monthStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIdx] || month} ${year}`;
}

// Export Monthly Summary to Excel (.xlsx)
export function exportMonthlyToExcel(
  summaryData: MonthlySummaryItem[],
  monthStr: string,
  settings: CompanySettings
) {
  const periodLabel = getMonthLabel(monthStr);
  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  // Create Excel workbook & worksheet
  const wb = XLSX.utils.book_new();

  const excelRows: any[][] = [];

  // Header rows
  excelRows.push([settings.companyName.toUpperCase()]);
  excelRows.push([`LAPORAN REKAPITULASI PRESENSI KARYAWAN`]);
  excelRows.push([`PERIODE: ${periodLabel.toUpperCase()}`]);
  excelRows.push([`Alamat: ${settings.companyAddress}`]);
  excelRows.push([]); // Empty row

  // Table Headers
  const dayHeaders: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dayHeaders.push(`Tgl ${d}`);
  }

  const tableHeader = [
    'No',
    'NIP',
    'Nama Karyawan',
    'Departemen',
    'Jabatan',
    ...dayHeaders,
    'Total Hadir (H)',
    'Terlambat (T)',
    'Izin (I)',
    'Sakit (S)',
    'Alpha (A)',
    'Tingkat Kehadiran (%)'
  ];

  excelRows.push(tableHeader);

  // Table Body Rows
  summaryData.forEach((emp, index) => {
    const dayValues: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dayValues.push(emp.dailyStatus[d] || '-');
    }

    excelRows.push([
      index + 1,
      emp.nip,
      emp.name,
      emp.department,
      emp.position,
      ...dayValues,
      emp.totalHadir,
      emp.totalTerlambat,
      emp.totalIzin,
      emp.totalSakit,
      emp.totalAlpha,
      `${emp.attendancePercentage}%`
    ]);
  });

  // Summary footer
  excelRows.push([]);
  excelRows.push(['KETERANGAN SIMBOL PRESENSI:']);
  excelRows.push(['H: Hadir Tepat Waktu | T: Terlambat | I: Izin | S: Sakit | A: Alpha / Tanpa Keterangan | -: Libur / Belum Ada Data']);
  excelRows.push([`Tanggal Dicetak: ${new Date().toLocaleString('id-ID')}`]);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Column width auto sizing
  const colWidths = [
    { wch: 5 },  // No
    { wch: 10 }, // NIP
    { wch: 25 }, // Nama
    { wch: 20 }, // Dept
    { wch: 22 }, // Jabatan
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    colWidths.push({ wch: 5 });
  }
  colWidths.push({ wch: 15 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 22 });

  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Presensi');

  const fileName = `Laporan_Presensi_${monthStr.replace('-', '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Export Monthly Summary to PDF (.pdf)
export function exportMonthlyToPDF(
  summaryData: MonthlySummaryItem[],
  monthStr: string,
  settings: CompanySettings
) {
  const periodLabel = getMonthLabel(monthStr);

  // Create A4 Landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`LAPORAN REKAPITULASI PRESENSI KARYAWAN - ${periodLabel.toUpperCase()}`, 14, 18);

  // Company address right side
  doc.setFontSize(8);
  doc.text(settings.companyAddress, pageWidth - 14, 14, { align: 'right' });
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth - 14, 20, { align: 'right' });

  // Summary Metrics Bar
  const totalEmployees = summaryData.length;
  const avgAttendance = Math.round(
    summaryData.reduce((acc, curr) => acc + curr.attendancePercentage, 0) / (totalEmployees || 1)
  );
  const totalLate = summaryData.reduce((acc, curr) => acc + curr.totalTerlambat, 0);

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(14, 30, pageWidth - 28, 14, 'F');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Total Karyawan: ${totalEmployees} orang  |  Rata-Rata Kehadiran: ${avgAttendance}%  |  Total Kasus Terlambat: ${totalLate} kali`, 20, 39);

  // Table Data
  const tableHead = [
    ['No', 'NIP', 'Nama Karyawan', 'Departemen', 'Jabatan', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha', '% Hadir']
  ];

  const tableBody = summaryData.map((emp, idx) => [
    idx + 1,
    emp.nip,
    emp.name,
    emp.department,
    emp.position,
    emp.totalHadir,
    emp.totalTerlambat,
    emp.totalIzin,
    emp.totalSakit,
    emp.totalAlpha,
    `${emp.attendancePercentage}%`
  ]);

  autoTable(doc, {
    startY: 48,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 16 },
      9: { halign: 'center', cellWidth: 16 },
      10: { halign: 'center', cellWidth: 20, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  if (finalY < 170) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Catatan: Laporan ini diterbitkan secara otomatis dari Sistem Presensi Pengenalan Wajah SQLite.', 14, finalY);

    const sigX1 = 40;
    const sigX2 = pageWidth - 70;

    doc.setTextColor(30, 41, 59);
    doc.text('Dibuat Oleh,', sigX1, finalY + 10);
    doc.text('Manager HRD', sigX1, finalY + 14);

    doc.text('Disetujui Oleh,', sigX2, finalY + 10);
    doc.text('Direktur Utama', sigX2, finalY + 14);

    doc.line(sigX1, finalY + 32, sigX1 + 45, finalY + 32);
    doc.line(sigX2, finalY + 32, sigX2 + 45, finalY + 32);

    doc.setFont('helvetica', 'bold');
    doc.text('( Tim HRD )', sigX1 + 10, finalY + 36);
    doc.text('( Pimpinan )', sigX2 + 10, finalY + 36);
  }

  const fileName = `Laporan_Presensi_${monthStr.replace('-', '_')}.pdf`;
  doc.save(fileName);
}

// Export Daily Logs to Excel
export function exportDailyLogsToExcel(
  records: AttendanceRecord[],
  dateStr: string,
  settings: CompanySettings
) {
  const wb = XLSX.utils.book_new();

  const excelRows: any[][] = [];
  excelRows.push([settings.companyName.toUpperCase()]);
  excelRows.push([`LAPORAN PRESENSI HARIAN - TANGGAL: ${dateStr}`]);
  excelRows.push([]);

  excelRows.push(['No', 'NIP', 'Nama Karyawan', 'Departemen', 'Jam Masuk', 'Jam Pulang', 'Status', 'Skor Cocok Wajah', 'Catatan']);

  records.forEach((rec, idx) => {
    excelRows.push([
      idx + 1,
      rec.employeeNip,
      rec.employeeName,
      rec.department,
      rec.timeIn,
      rec.timeOut || '-',
      rec.status,
      rec.matchScore ? `${Math.round(rec.matchScore * 100)}%` : '-',
      rec.notes || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Presensi Harian');
  XLSX.writeFile(wb, `Presensi_Harian_${dateStr}.xlsx`);
}
