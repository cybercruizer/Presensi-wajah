export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | string;
  createdAt: string;
}

export interface Employee {
  id: string;
  nip: string;
  name: string;
  department: string;
  position: string;
  photoUrl: string;
  faceDescriptor: number[] | null;
  createdAt: string;
  status: 'active' | 'inactive';
}

export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpha';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  department: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm:ss
  timeOut: string | null; // HH:mm:ss
  status: AttendanceStatus;
  photoProof: string | null;
  location: string | null;
  matchScore: number | null; // e.g. 0.94 (94% confidence)
  notes?: string | null;
}

export interface CompanySettings {
  companyName: string;
  companyAddress: string;
  workStartTime: string; // e.g. "08:00"
  workEndTime: string; // e.g. "17:00"
  lateToleranceMins: number; // e.g. 15
  enableSoundEffect: boolean;
  minMatchConfidence: number; // e.g. 0.65
}

export interface MonthlySummaryItem {
  employeeId: string;
  nip: string;
  name: string;
  department: string;
  position: string;
  totalHadir: number;
  totalTerlambat: number;
  totalIzin: number;
  totalSakit: number;
  totalAlpha: number;
  attendancePercentage: number;
  dailyStatus: Record<number, 'H' | 'T' | 'I' | 'S' | 'A' | '-'>;
}

export interface FaceDetectionResult {
  detected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  matchedEmployee?: Employee | null;
  distance?: number;
  confidence?: number;
  descriptor?: number[];
  livenessPassed?: boolean;
}
