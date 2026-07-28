# 🏢 Sistem Presensi Wajah Real-Time & Otentikasi Pengguna

Sistem aplikasi presensi berbasis pengenalan wajah (*Face Recognition*) secara real-time yang terintegrasi dengan backend Express, basis data **SQLite** aman, otentikasi kata sandi terenkripsi (PBKDF2), serta laporan rekapitulasi presensi otomatis (PDF/Excel).

---

## 🌟 Fitur Utama

- **Otentikasi Pengguna & Kredensial Terenkripsi**: Pendaftaran, masuk, dan keluar akun pengguna/admin dengan hash kata sandi PBKDF2 salt 64-bit di SQLite.
- **Presensi Wajah Real-Time (Kiosk)**: Pemindaian wajah otomatis dengan deteksi landmark & penentuan skor *confidence*.
- **Multi-Option Camera Stream**: Mendukung kamera fisik live (webcam), Stream Virtual Live (Simulasi AI), dan opsi Unggah Foto Presensi jika akses kamera diblokir browser.
- **Manajemen Karyawan**: Tambah data karyawan baru beserta foto pendaftaran wajah untuk ekstraksi 128 vektor titik wajah (*face descriptors*).
- **Log Presensi Harian & Bulanan**: Pelacakan jam masuk, jam pulang, status keterlambatan, foto bukti presensi, dan persentase kehadiran.
- **Ekspor Laporan**: Unduh rekapitulasi presensi dalam format **PDF** dan **Excel (.xlsx)**.
- **Penyimpanan SQLite Persisten**: Database file terenkripsi yang dapat diunduh langsung via menu pengaturan.

---

## 🛠️ Persyaratan Sistem (Prerequisites)

Sebelum melakukan deployment, pastikan lingkungan server telah terpasang:
- **Node.js**: versi `18.x` atau `20.x` (LTS direkomendasikan)
- **NPM**: versi `9.x` atau lebih baru
- **HTTPS Certificate** (Opsional untuk lingkungan produksi): Diperlukan agar browser memberikan izin akses kamera fisik (Webcam) secara langsung.

---

## 🚀 Langkah Instalasi & Menjalankan Lokal (Development)

1. **Clone Repositori & Masuk ke Direktori**
   ```bash
   git clone <URL_REPOSITORI_ANDA>
   cd <NAMA_DIREKTORI>
   ```

2. **Install Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable (Opsional)**
   Buat file `.env` di root direktori jika diperlukan:
   ```env
   PORT=3000
   NODE_ENV=development
   ```

4. **Jalankan Server Development**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan pada `http://localhost:3000`.

---

## 📦 Langkah Deployment ke Produksi

### Opsi A: Deployment Standard (Node.js Build Script)

1. **Jalankan Proses Build**
   Perintah ini akan melakukan kompilasi frontend Vite ke direktori `dist/` dan membundel backend TypeScript `server.ts` menjadi file CommonJS siap pakai `dist/server.cjs`:
   ```bash
   npm run build
   ```

2. **Jalankan Server Produksi**
   ```bash
   npm run start
   ```
   Server akan aktif melayani trafik pada port `3000` (atau sesuai variabel lingkungan `PORT`).

---

### Opsi B: Deployment dengan Process Manager (PM2 / Linux VPS)

1. **Install PM2 secara Global**
   ```bash
   npm install -g pm2
   ```

2. **Build Aplikasi**
   ```bash
   npm run build
   ```

3. **Jalankan Aplikasi dengan PM2**
   ```bash
   pm2 start dist/server.cjs --name "presensi-app"
   ```

4. **Simpan Konfigurasi PM2 agar Otomatis Startup**
   ```bash
   pm2 save
   pm2 startup
   ```

---

### Opsi C: Deployment Docker Container / Cloud Run

1. **Buat file `Dockerfile` pada Root Project (Contoh)**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   ENV PORT=3000
   ENV NODE_ENV=production
   CMD ["npm", "start"]
   ```

2. **Build & Run Docker Image**
   ```bash
   docker build -t presensi-app .
   docker run -p 3000:3000 presensi-app
   ```

---

## 🔑 Kredensial Default Admin

Saat database SQLite pertama kali dibuat, sistem otomatis menyediakan akun administrator default:

- **Email**: `admin@company.com`
- **Password**: `admin123`
- **Peran**: `admin`

*Catatan: Anda dapat mendaftarkan akun pengguna baru atau mengubah password setelah berhasil masuk.*

---

## 📷 Catatan Penting Izin Kamera & HTTPS

1. **Akses Kamera Fisik (Webcam)**: Browser modern (Chrome, Safari, Firefox, Edge) membatasi akses `getUserMedia()` hanya untuk asal aman (**HTTPS** atau `localhost`).
2. Jika disebar ke domain produksi, pastikan server Anda dipasangi sertifikat SSL/TLS (HTTPS) seperti Let's Encrypt atau Cloudflare SSL.
3. Apabila berjalan di dalam penampil iFrame atau tanpa sertifikat HTTPS, penguna dapat memanfaatkan **Mode Kamera Virtual Live** atau fitur **Unggah Foto Wajah** yang telah disiapkan secara fleksibel.

---

## 📄 Lisensi & Hak Cipta
Dilindungi di bawah lisensi internal aplikasi presensi perusahaan.
