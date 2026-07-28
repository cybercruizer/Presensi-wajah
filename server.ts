import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import initSqlJs, { Database } from 'sql.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'attendance.db');

let db: Database;

// Password Hashing Helpers (Crypto PBKDF2)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, combined: string): boolean {
  if (!combined || !combined.includes(':')) return false;
  const [salt, originalHash] = combined.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Helper to save SQLite database bytes to disk
function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database file:', err);
  }
}

// Initialize SQLite database
async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('SQLite database loaded from:', DB_FILE);
    } catch (e) {
      console.error('Failed to read existing DB file, creating new:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created new in-memory SQLite database');
  }

  // Schema creation
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      role TEXT DEFAULT 'admin',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      nip TEXT UNIQUE,
      name TEXT,
      department TEXT,
      position TEXT,
      photo_url TEXT,
      face_descriptor TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      employee_id TEXT,
      employee_name TEXT,
      employee_nip TEXT,
      department TEXT,
      date TEXT,
      time_in TEXT,
      time_out TEXT,
      status TEXT,
      photo_proof TEXT,
      location TEXT,
      match_score REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default admin user if empty
  const userRes = db.exec(`SELECT COUNT(*) as cnt FROM users`);
  if (!userRes[0] || userRes[0].values[0][0] === 0) {
    const adminId = 'usr-admin-default';
    const adminEmail = 'admin@company.com';
    const adminPass = hashPassword('admin123');
    const adminName = 'Administrator System';
    const nowIso = new Date().toISOString();

    db.run(
      `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, adminEmail, adminPass, adminName, 'admin', nowIso]
    );
    console.log('Default admin user seeded: admin@company.com / admin123');
  }

  // Initial settings default
  const settingsRes = db.exec(`SELECT COUNT(*) as cnt FROM settings`);
  if (!settingsRes[0] || settingsRes[0].values[0][0] === 0) {
    const defaults = [
      ['companyName', 'PT Teknologi Nusantara Utama'],
      ['companyAddress', 'Jl. Jendral Sudirman No. 88, Jakarta Selatan'],
      ['workStartTime', '08:00'],
      ['workEndTime', '17:00'],
      ['lateToleranceMins', '15'],
      ['enableSoundEffect', 'true'],
      ['minMatchConfidence', '0.65'],
    ];
    for (const [k, v] of defaults) {
      db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [k, v]);
    }
  }

  // Seed sample employees if empty
  const empRes = db.exec(`SELECT COUNT(*) as cnt FROM employees`);
  if (!empRes[0] || empRes[0].values[0][0] === 0) {
    seedInitialData();
  }

  saveDatabase();
}

function seedInitialData() {
  console.log('Seeding initial employees and attendance history into SQLite...');
  
  const sampleEmployees = [
    {
      id: 'emp-101',
      nip: '1001',
      name: 'Budi Santoso',
      department: 'Technology & IT',
      position: 'Senior Software Engineer',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      faceDescriptor: JSON.stringify(Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1) * 0.5)),
      createdAt: '2026-01-10T08:00:00.000Z',
      status: 'active'
    },
    {
      id: 'emp-102',
      nip: '1002',
      name: 'Siti Rahmawati',
      department: 'Human Resources',
      position: 'HR Manager',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
      faceDescriptor: JSON.stringify(Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.1) * 0.5)),
      createdAt: '2026-01-12T08:00:00.000Z',
      status: 'active'
    },
    {
      id: 'emp-103',
      nip: '1003',
      name: 'Rudi Hermawan',
      department: 'Finance & Accounting',
      position: 'Finance Specialist',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
      faceDescriptor: JSON.stringify(Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.2) * 0.4)),
      createdAt: '2026-01-15T08:00:00.000Z',
      status: 'active'
    },
    {
      id: 'emp-104',
      nip: '1004',
      name: 'Dewi Lestari',
      department: 'Marketing & PR',
      position: 'Digital Marketing Lead',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
      faceDescriptor: JSON.stringify(Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.2) * 0.4)),
      createdAt: '2026-02-01T08:00:00.000Z',
      status: 'active'
    },
    {
      id: 'emp-105',
      nip: '1005',
      name: 'Ahmad Fauzi',
      department: 'Operations',
      position: 'Operations Officer',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
      faceDescriptor: JSON.stringify(Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.3) * 0.3)),
      createdAt: '2026-02-10T08:00:00.000Z',
      status: 'active'
    }
  ];

  for (const emp of sampleEmployees) {
    db.run(
      `INSERT INTO employees (id, nip, name, department, position, photo_url, face_descriptor, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [emp.id, emp.nip, emp.name, emp.department, emp.position, emp.photoUrl, emp.faceDescriptor, emp.createdAt, emp.status]
    );
  }

  // Generate seed attendance for current month (July 2026) and previous month (June 2026)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Generate 20 working days for current month
  for (let day = 1; day <= 25; day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue; // skip weekends
    const dateStr = dateObj.toISOString().split('T')[0];

    sampleEmployees.forEach((emp, index) => {
      // Create realistic attendance variation
      let status = 'Hadir';
      let timeIn = '07:50:12';
      let timeOut = '17:05:40';

      const rand = (day + index) % 10;
      if (rand === 1) {
        status = 'Terlambat';
        timeIn = '08:22:15';
      } else if (rand === 2 && index === 2) {
        status = 'Izin';
        timeIn = '-';
        timeOut = '-';
      } else if (rand === 3 && index === 4) {
        status = 'Sakit';
        timeIn = '-';
        timeOut = '-';
      }

      db.run(
        `INSERT INTO attendance (id, employee_id, employee_name, employee_nip, department, date, time_in, time_out, status, photo_proof, location, match_score, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `att-${emp.id}-${dateStr}`,
          emp.id,
          emp.name,
          emp.nip,
          emp.department,
          dateStr,
          timeIn,
          timeOut,
          status,
          emp.photoUrl,
          'Kantor Pusat (GNS Loc)',
          0.92 + (index * 0.01),
          status === 'Izin' ? 'Acara Keluarga' : status === 'Sakit' ? 'Surat Dokter' : 'Presensi Face Scan'
        ]
      );
    });
  }
}

// REST API Endpoints

// Authentication Endpoints

// Register User
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = db.exec(`SELECT id FROM users WHERE LOWER(email) = ?`, [cleanEmail]);
    if (existingUser[0] && existingUser[0].values.length > 0) {
      return res.status(400).json({ error: 'Email ini sudah terdaftar dalam sistem.' });
    }

    const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const passwordHash = hashPassword(password);
    const userRole = role || 'admin';
    const createdAt = new Date().toISOString();

    db.run(
      `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, cleanEmail, passwordHash, name.trim(), userRole, createdAt]
    );

    saveDatabase();

    const userObj = {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      role: userRole,
      createdAt
    };

    res.json({
      success: true,
      message: 'Pendaftaran akun berhasil!',
      user: userObj,
      token: userId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login User
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = db.exec(`SELECT id, email, password_hash, name, role, created_at FROM users WHERE LOWER(email) = ?`, [cleanEmail]);

    if (!result[0] || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Email atau kata sandi tidak ditemukan.' });
    }

    const row = result[0].values[0];
    const user = {
      id: row[0] as string,
      email: row[1] as string,
      passwordHash: row[2] as string,
      name: row[3] as string,
      role: row[4] as string,
      createdAt: row[5] as string
    };

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Kata sandi yang Anda masukkan salah.' });
    }

    const userClean = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      user: userClean,
      token: user.id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current Logged-in User
app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userIdQuery = req.query.userId as string;
    let userId = userIdQuery;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = authHeader.substring(7);
    }

    if (!userId) {
      return res.status(401).json({ error: 'Tidak ada otentikasi.' });
    }

    const result = db.exec(`SELECT id, email, name, role, created_at FROM users WHERE id = ?`, [userId]);
    if (!result[0] || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Sesi pengguna tidak valid.' });
    }

    const row = result[0].values[0];
    res.json({
      user: {
        id: row[0] as string,
        email: row[1] as string,
        name: row[2] as string,
        role: row[3] as string,
        createdAt: row[4] as string
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout User
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Sesi telah ditutup.' });
});

// Get List of Registered Users (Admin interface)
app.get('/api/auth/users', (req, res) => {
  try {
    const result = db.exec(`SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`);
    const users = [];
    if (result[0]) {
      for (const row of result[0].values) {
        users.push({
          id: row[0] as string,
          email: row[1] as string,
          name: row[2] as string,
          role: row[3] as string,
          createdAt: row[4] as string
        });
      }
    }
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get company settings
app.get('/api/settings', (req, res) => {
  try {
    const result = db.exec(`SELECT key, value FROM settings`);
    const settings: Record<string, any> = {};
    if (result[0]) {
      for (const row of result[0].values) {
        settings[row[0] as string] = row[1];
      }
    }
    res.json({
      companyName: settings.companyName || 'PT Teknologi Nusantara Utama',
      companyAddress: settings.companyAddress || 'Jakarta, Indonesia',
      workStartTime: settings.workStartTime || '08:00',
      workEndTime: settings.workEndTime || '17:00',
      lateToleranceMins: parseInt(settings.lateToleranceMins || '15', 10),
      enableSoundEffect: settings.enableSoundEffect === 'true',
      minMatchConfidence: parseFloat(settings.minMatchConfidence || '0.65')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
app.post('/api/settings', (req, res) => {
  try {
    const body = req.body;
    for (const [key, value] of Object.entries(body)) {
      db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, String(value)]);
    }
    saveDatabase();
    res.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Employees
app.get('/api/employees', (req, res) => {
  try {
    const result = db.exec(`SELECT id, nip, name, department, position, photo_url, face_descriptor, created_at, status FROM employees ORDER BY name ASC`);
    const employees = [];
    if (result[0]) {
      for (const row of result[0].values) {
        employees.push({
          id: row[0],
          nip: row[1],
          name: row[2],
          department: row[3],
          position: row[4],
          photoUrl: row[5],
          faceDescriptor: row[6] ? JSON.parse(row[6] as string) : null,
          createdAt: row[7],
          status: row[8]
        });
      }
    }
    res.json(employees);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update Employee
app.post('/api/employees', (req, res) => {
  try {
    const { id, nip, name, department, position, photoUrl, faceDescriptor, status } = req.body;
    const empId = id || `emp-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const descJson = faceDescriptor ? JSON.stringify(faceDescriptor) : null;

    db.run(
      `INSERT OR REPLACE INTO employees (id, nip, name, department, position, photo_url, face_descriptor, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [empId, nip, name, department, position, photoUrl, descJson, createdAt, status || 'active']
    );

    saveDatabase();
    res.json({ success: true, id: empId, message: 'Data karyawan berhasil disimpan.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Employee
app.delete('/api/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run(`DELETE FROM employees WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, message: 'Karyawan berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Attendance Records
app.get('/api/attendance', (req, res) => {
  try {
    const { date, month, employeeId, search } = req.query;
    let query = `SELECT id, employee_id, employee_name, employee_nip, department, date, time_in, time_out, status, photo_proof, location, match_score, notes FROM attendance WHERE 1=1`;
    const params: any[] = [];

    if (date) {
      query += ` AND date = ?`;
      params.push(date);
    }
    if (month) {
      query += ` AND date LIKE ?`;
      params.push(`${month}%`); // e.g. "2026-07%"
    }
    if (employeeId) {
      query += ` AND employee_id = ?`;
      params.push(employeeId);
    }
    if (search) {
      query += ` AND (employee_name LIKE ? OR employee_nip LIKE ? OR department LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY date DESC, time_in DESC`;

    const result = db.exec(query, params);
    const records = [];
    if (result[0]) {
      for (const row of result[0].values) {
        records.push({
          id: row[0],
          employeeId: row[1],
          employeeName: row[2],
          employeeNip: row[3],
          department: row[4],
          date: row[5],
          timeIn: row[6],
          timeOut: row[7],
          status: row[8],
          photoProof: row[9],
          location: row[10],
          matchScore: row[11],
          notes: row[12]
        });
      }
    }
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Face Scan / Streaming Check-in Endpoint
app.post('/api/attendance/checkin', (req, res) => {
  try {
    const { employeeId, photoProof, location, matchScore } = req.body;
    
    // Fetch employee info
    const empRes = db.exec(`SELECT id, nip, name, department FROM employees WHERE id = ?`, [employeeId]);
    if (!empRes[0] || empRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
    }
    
    const [empId, empNip, empName, empDept] = empRes[0].values[0] as [string, string, string, string];

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const nowTimeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

    // Fetch settings for late logic
    const settingsRes = db.exec(`SELECT key, value FROM settings`);
    const settings: Record<string, string> = {};
    if (settingsRes[0]) {
      for (const row of settingsRes[0].values) {
        settings[row[0] as string] = row[1] as string;
      }
    }

    const workStartTime = settings.workStartTime || '08:00';
    const lateToleranceMins = parseInt(settings.lateToleranceMins || '15', 10);

    // Calculate status (Hadir vs Terlambat)
    const [startH, startM] = workStartTime.split(':').map(Number);
    const [currH, currM] = nowTimeStr.split(':').map(Number);
    
    const startMins = startH * 60 + startM + lateToleranceMins;
    const currMins = currH * 60 + currM;

    let status = 'Hadir';
    if (currMins > startMins) {
      status = 'Terlambat';
    }

    // Check if record for today already exists
    const existing = db.exec(`SELECT id, time_in, time_out FROM attendance WHERE employee_id = ? AND date = ?`, [employeeId, todayStr]);

    if (existing[0] && existing[0].values.length > 0) {
      // Already checked in today -> record Check-out (Jam Pulang)
      const recordId = existing[0].values[0][0] as string;
      const existingTimeIn = existing[0].values[0][1] as string;

      db.run(
        `UPDATE attendance SET time_out = ?, photo_proof = COALESCE(?, photo_proof) WHERE id = ?`,
        [nowTimeStr, photoProof || null, recordId]
      );

      saveDatabase();
      return res.json({
        type: 'CHECK_OUT',
        message: `Presensi Pulang Berhasil! Sampai Jumpa, ${empName}`,
        record: {
          employeeName: empName,
          nip: empNip,
          department: empDept,
          timeIn: existingTimeIn,
          timeOut: nowTimeStr,
          date: todayStr
        }
      });
    } else {
      // First scan of the day -> Check-In (Jam Masuk)
      const attId = `att-${employeeId}-${todayStr}`;
      db.run(
        `INSERT INTO attendance (id, employee_id, employee_name, employee_nip, department, date, time_in, time_out, status, photo_proof, location, match_score, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attId,
          empId,
          empName,
          empNip,
          empDept,
          todayStr,
          nowTimeStr,
          null,
          status,
          photoProof || null,
          location || 'Sistem Kamera Streaming',
          matchScore || 0.95,
          'Streaming Face Recognition'
        ]
      );

      saveDatabase();
      return res.json({
        type: 'CHECK_IN',
        status,
        message: `Presensi Masuk Berhasil! (${status}): ${empName}`,
        record: {
          employeeName: empName,
          nip: empNip,
          department: empDept,
          timeIn: nowTimeStr,
          date: todayStr,
          status
        }
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual attendance entry (Izin / Sakit / Override)
app.post('/api/attendance/manual', (req, res) => {
  try {
    const { employeeId, date, timeIn, timeOut, status, notes } = req.body;
    
    const empRes = db.exec(`SELECT id, nip, name, department FROM employees WHERE id = ?`, [employeeId]);
    if (!empRes[0] || empRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
    }
    const [empId, empNip, empName, empDept] = empRes[0].values[0] as [string, string, string, string];

    const attId = `att-${employeeId}-${date}`;
    db.run(
      `INSERT OR REPLACE INTO attendance (id, employee_id, employee_name, employee_nip, department, date, time_in, time_out, status, photo_proof, location, match_score, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [attId, empId, empName, empNip, empDept, date, timeIn || '-', timeOut || '-', status, null, 'Input Manual HR', 1.0, notes || 'Data disesuaikan oleh HR']
    );

    saveDatabase();
    res.json({ success: true, message: 'Data presensi manual berhasil disimpan.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Attendance Record
app.delete('/api/attendance/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run(`DELETE FROM attendance WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, message: 'Record presensi berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly Summary Report
app.get('/api/reports/monthly', (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7); // YYYY-MM
    
    // Fetch all active employees
    const empRes = db.exec(`SELECT id, nip, name, department, position FROM employees WHERE status = 'active' ORDER BY name ASC`);
    if (!empRes[0]) {
      return res.json([]);
    }

    const employees = empRes[0].values.map(row => ({
      id: row[0] as string,
      nip: row[1] as string,
      name: row[2] as string,
      department: row[3] as string,
      position: row[4] as string
    }));

    // Fetch all attendance for this month
    const attRes = db.exec(`SELECT employee_id, date, status FROM attendance WHERE date LIKE ?`, [`${month}%`]);
    const attMap: Record<string, Record<string, string>> = {}; // empId -> dateStr -> status

    if (attRes[0]) {
      for (const row of attRes[0].values) {
        const empId = row[0] as string;
        const dateStr = row[1] as string;
        const status = row[2] as string;
        if (!attMap[empId]) attMap[empId] = {};
        attMap[empId][dateStr] = status;
      }
    }

    // Number of days in month
    const [yearNum, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    const summaryList = employees.map(emp => {
      let totalHadir = 0;
      let totalTerlambat = 0;
      let totalIzin = 0;
      let totalSakit = 0;
      let totalAlpha = 0;
      const dailyStatus: Record<number, 'H' | 'T' | 'I' | 'S' | 'A' | '-'> = {};

      let totalWorkDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(yearNum, monthNum - 1, day);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const status = attMap[emp.id]?.[dateStr];

        if (status === 'Hadir') {
          totalHadir++;
          dailyStatus[day] = 'H';
          totalWorkDays++;
        } else if (status === 'Terlambat') {
          totalTerlambat++;
          dailyStatus[day] = 'T';
          totalWorkDays++;
        } else if (status === 'Izin') {
          totalIzin++;
          dailyStatus[day] = 'I';
          totalWorkDays++;
        } else if (status === 'Sakit') {
          totalSakit++;
          dailyStatus[day] = 'S';
          totalWorkDays++;
        } else if (status === 'Alpha') {
          totalAlpha++;
          dailyStatus[day] = 'A';
          totalWorkDays++;
        } else {
          dailyStatus[day] = '-';
          if (!isWeekend && dateObj <= new Date()) {
            // Unrecorded weekday up to today counts as Alpha
            totalAlpha++;
            totalWorkDays++;
            dailyStatus[day] = 'A';
          }
        }
      }

      const totalAttended = totalHadir + totalTerlambat;
      const attendancePercentage = totalWorkDays > 0 ? Math.round((totalAttended / totalWorkDays) * 100) : 100;

      return {
        employeeId: emp.id,
        nip: emp.nip,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        totalHadir,
        totalTerlambat,
        totalIzin,
        totalSakit,
        totalAlpha,
        attendancePercentage,
        dailyStatus
      };
    });

    res.json(summaryList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Database Export Endpoint (Download attendance.db SQLite binary file)
app.get('/api/db/export', (req, res) => {
  try {
    saveDatabase();
    if (fs.existsSync(DB_FILE)) {
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance.db"');
      const stream = fs.createReadStream(DB_FILE);
      stream.pipe(res);
    } else {
      res.status(404).json({ error: 'SQLite database file not found.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Database Info & Sync status
app.get('/api/db/status', (req, res) => {
  try {
    saveDatabase();
    const stats = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE) : null;
    const empCount = db.exec(`SELECT COUNT(*) FROM employees`)[0]?.values[0][0] || 0;
    const attCount = db.exec(`SELECT COUNT(*) FROM attendance`)[0]?.values[0][0] || 0;

    res.json({
      dbFileExists: !!stats,
      filePath: DB_FILE,
      fileSizeBytes: stats ? stats.size : 0,
      fileSizeFormatted: stats ? `${(stats.size / 1024).toFixed(1)} KB` : '0 KB',
      lastModified: stats ? stats.mtime : new Date(),
      totalEmployees: empCount,
      totalAttendanceLogs: attCount,
      sqliteVersion: '3.42.0 (SQL.js WASM Engine)'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express and Vite
async function startServer() {
  await initDB();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Presensi Wajah running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
