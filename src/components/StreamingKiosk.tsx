import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CheckCircle2, AlertTriangle, UserCheck, Volume2, VolumeX, ShieldCheck, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { Employee, AttendanceRecord, CompanySettings } from '../types';
import { extractFaceDescriptorFromCanvas, matchFace, playAttendanceSound } from '../lib/faceEngine';

interface StreamingKioskProps {
  employees: Employee[];
  todayRecords: AttendanceRecord[];
  onAttendanceSuccess: () => void;
  settings: CompanySettings;
}

export const StreamingKiosk: React.FC<StreamingKioskProps> = ({
  employees,
  todayRecords,
  onAttendanceSuccess,
  settings,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(settings.enableSoundEffect);

  const [currentMatch, setCurrentMatch] = useState<{
    employee: Employee | null;
    confidence: number;
    distance: number;
  } | null>(null);

  const [lastNotification, setLastNotification] = useState<{
    type: 'CHECK_IN' | 'CHECK_OUT';
    title: string;
    message: string;
    employeeName: string;
    nip: string;
    department: string;
    time: string;
    photoProof?: string;
  } | null>(null);

  // Cooldown map to prevent duplicate scans within 10 seconds
  const lastScanMap = useRef<Record<string, number>>({});

  // Initialize camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Real-time scan loop
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive || scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== 4) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setScanning(true);
    try {
      const result = await extractFaceDescriptorFromCanvas(canvas);

      if (result && result.descriptor) {
        // Draw face bounding box on canvas
        const box = result.box;
        ctx.strokeStyle = '#10b981'; // Emerald 500
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Corner accents
        const cornerLen = 15;
        ctx.strokeStyle = '#34d399';
        ctx.beginPath();
        // Top Left
        ctx.moveTo(box.x, box.y + cornerLen);
        ctx.lineTo(box.x, box.y);
        ctx.lineTo(box.x + cornerLen, box.y);
        // Top Right
        ctx.moveTo(box.x + box.width - cornerLen, box.y);
        ctx.lineTo(box.x + box.width, box.y);
        ctx.lineTo(box.x + box.width, box.y + cornerLen);
        ctx.stroke();

        // Perform face matching against database
        const matchRes = matchFace(result.descriptor, employees, settings.minMatchConfidence);

        if (matchRes.matchedEmployee) {
          const matchedEmp = matchRes.matchedEmployee;
          setCurrentMatch({
            employee: matchedEmp,
            confidence: matchRes.confidence,
            distance: matchRes.distance,
          });

          // Check cooldown (10 seconds)
          const now = Date.now();
          const lastScanTime = lastScanMap.current[matchedEmp.id] || 0;

          if (now - lastScanTime > 10000) {
            lastScanMap.current[matchedEmp.id] = now;

            // Capture frame as photo proof
            const photoProof = canvas.toDataURL('image/jpeg', 0.8);

            // Execute check-in/out to backend SQLite
            const response = await fetch('/api/attendance/checkin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employeeId: matchedEmp.id,
                photoProof,
                location: 'Kamera Kiosk Streaming',
                matchScore: matchRes.confidence / 100,
              }),
            });

            if (response.ok) {
              const resData = await response.json();

              if (soundEnabled) {
                playAttendanceSound('SUCCESS');
              }

              setLastNotification({
                type: resData.type,
                title: resData.type === 'CHECK_IN' ? 'PRESENSI MASUK BERHASIL' : 'PRESENSI PULANG BERHASIL',
                message: resData.message,
                employeeName: matchedEmp.name,
                nip: matchedEmp.nip,
                department: matchedEmp.department,
                time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                photoProof,
              });

              onAttendanceSuccess();

              // Auto dismiss banner after 6s
              setTimeout(() => {
                setLastNotification(null);
              }, 6000);
            }
          }
        } else {
          setCurrentMatch(null);
        }
      } else {
        setCurrentMatch(null);
      }
    } catch (e) {
      console.error('Error processing frame:', e);
    } finally {
      setScanning(false);
    }
  }, [cameraActive, scanning, employees, settings.minMatchConfidence, soundEnabled, onAttendanceSuccess]);

  useEffect(() => {
    if (!cameraActive) return;
    const interval = setInterval(() => {
      processFrame();
    }, 800); // scan frame every 800ms
    return () => clearInterval(interval);
  }, [cameraActive, processFrame]);

  // Manual Trigger Simulation for testing
  const handleManualSimulate = async (employee: Employee) => {
    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          photoProof: employee.photoUrl,
          location: 'Simulasi Pemindaian',
          matchScore: 0.96,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (soundEnabled) playAttendanceSound('SUCCESS');

        setLastNotification({
          type: resData.type,
          title: resData.type === 'CHECK_IN' ? 'PRESENSI MASUK BERHASIL' : 'PRESENSI PULANG BERHASIL',
          message: resData.message,
          employeeName: employee.name,
          nip: employee.nip,
          department: employee.department,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          photoProof: employee.photoUrl,
        });

        onAttendanceSuccess();
        setTimeout(() => setLastNotification(null), 5000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner Alert / Success Toast */}
      {lastNotification && (
        <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-xl border border-emerald-400/40 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-4">
            {lastNotification.photoProof ? (
              <img
                src={lastNotification.photoProof}
                alt={lastNotification.employeeName}
                className="w-14 h-14 rounded-xl object-cover border-2 border-white/80 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold tracking-wide uppercase text-emerald-100">
                <Sparkles className="w-3.5 h-3.5" />
                {lastNotification.title}
              </div>
              <h3 className="text-xl font-extrabold text-white mt-0.5">
                {lastNotification.employeeName} <span className="text-emerald-200 text-sm">({lastNotification.nip})</span>
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                {lastNotification.department} • Waktu: <span className="font-bold">{lastNotification.time}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-white text-emerald-900 rounded-lg text-xs font-bold shadow">
              SQLite Recorded
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Webcam Stream View */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
          {/* Header Controls */}
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Kamera Presensi Streaming
                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  AI Face Match Engine
                </span>
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl transition-all ${
                  soundEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}
                title="Toggle Audio Feedback"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  cameraActive
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cameraActive ? 'animate-spin' : ''}`} />
                <span>{cameraActive ? 'Matikan Kamera' : 'Nyalakan Kamera'}</span>
              </button>
            </div>
          </div>

          {/* Camera View Area */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800/80 shadow-inner">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none"
                />

                {/* Face Scanning Guide Frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-80 border-2 border-dashed border-emerald-500/40 rounded-3xl flex items-center justify-center relative">
                    <div className="absolute -top-3 bg-slate-900/90 backdrop-blur text-emerald-400 text-[10px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full border border-emerald-500/30">
                      Posisikan Wajah Di Sini
                    </div>
                  </div>
                </div>

                {/* Match Overlay Badge */}
                {currentMatch && currentMatch.employee && (
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between shadow-2xl animate-fade-in">
                    <div className="flex items-center space-x-3">
                      <img
                        src={currentMatch.employee.photoUrl}
                        alt={currentMatch.employee.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400"
                      />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          Terdeteksi ({currentMatch.confidence}% Match)
                        </span>
                        <h4 className="text-sm font-bold text-white">{currentMatch.employee.name}</h4>
                        <p className="text-xs text-slate-300">NIP: {currentMatch.employee.nip} • {currentMatch.employee.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-500/30">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Akurat
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-8 max-w-sm">
                <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4 animate-bounce" />
                <h3 className="text-base font-semibold text-slate-200">Kamera Non-Aktif</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Tekan tombol di bawah untuk mengaktifkan pemindaian wajah real-time.
                </p>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg hover:bg-emerald-400 transition-all"
                >
                  Aktifkan Kamera Sekarang
                </button>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-x-4 top-4 bg-rose-500/90 text-white p-3 rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Quick Simulation Bar for Testing/Demo */}
          <div className="mt-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Simulasi Presensi Cepat:</span>
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-md py-0.5">
              {employees.slice(0, 4).map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleManualSimulate(emp)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 text-slate-300 text-[11px] font-medium rounded-lg border border-slate-700 transition-all shrink-0 flex items-center gap-1"
                >
                  <span>{emp.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Today's Live Attendance Feed */}
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Presensi Hari Ini
            </h3>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20">
              {todayRecords.length} Record
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1 custom-scrollbar">
            {todayRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-xs">Belum ada data presensi hari ini.</p>
                <p className="text-[11px] text-slate-600 mt-1">Lakukan pemindaian wajah di kamera.</p>
              </div>
            ) : (
              todayRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    {record.photoProof ? (
                      <img
                        src={record.photoProof}
                        alt={record.employeeName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs">
                        {record.employeeName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{record.employeeName}</h4>
                      <p className="text-[11px] text-slate-400">
                        {record.department} • <span className="text-slate-300 font-mono">{record.timeIn}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        record.status === 'Hadir'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : record.status === 'Terlambat'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {record.status}
                    </span>
                    {record.timeOut && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Pulang: {record.timeOut}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
