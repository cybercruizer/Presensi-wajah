import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CheckCircle2, AlertTriangle, UserCheck, Volume2, VolumeX, ShieldCheck, RefreshCw, Zap, Sparkles, Upload, ExternalLink } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [isVirtualCamera, setIsVirtualCamera] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize camera stream
  const startCamera = async () => {
    setCameraError(null);
    setIsVirtualCamera(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Akses kamera tidak didukung di browser ini.');
      }

      let stream: MediaStream;
      try {
        // Try high quality first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
      } catch (e) {
        // Fallback to basic video constraint
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setCameraActive(true);
            })
            .catch((err) => {
              console.warn('Video play deferred or blocked:', err);
              setCameraActive(true);
            });
        } else {
          setCameraActive(true);
        }
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      let msg = 'Gagal mengakses kamera.';
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.includes('Permission denied')
      ) {
        msg =
          'Akses kamera fisik diblokir oleh sistem Iframe browser. Anda dapat mengeklik "Buka di Tab Baru" untuk izin kamera fisik langsung, atau gunakan "Mode Kamera Virtual Live" di bawah untuk melihat tampilan live.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Kamera fisik tidak ditemukan. Mengalihkan ke Mode Kamera Virtual Live...';
      } else {
        msg = err.message || 'Gagal mengaktifkan kamera.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // Start Virtual Animated Live Stream Canvas
  const startVirtualCameraStream = () => {
    setIsVirtualCamera(true);
    setCameraActive(true);
    setCameraError(null);
  };

  useEffect(() => {
    if (!cameraActive || !isVirtualCamera || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const renderVirtualFeed = () => {
      frameCount++;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 640);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 480);

      // Background gradient simulation (Webcam video style)
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Grid overlay
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Animated Face Mesh Graphic
      const centerX = width / 2 + Math.sin(frameCount * 0.03) * 15;
      const centerY = height / 2 - 10 + Math.cos(frameCount * 0.02) * 10;
      const headRadius = 85;

      // Scanning Laser Bar
      const scanY = (frameCount * 3) % height;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 120, scanY);
      ctx.lineTo(centerX + 120, scanY);
      ctx.stroke();

      // Head silhouette outline
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, headRadius, headRadius * 1.25, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(centerX - 30, centerY - 20, 6, 0, Math.PI * 2);
      ctx.arc(centerX + 30, centerY - 20, 6, 0, Math.PI * 2);
      ctx.fill();

      // Nose & Mouth landmarks
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX - 8, centerY + 15);
      ctx.lineTo(centerX + 8, centerY + 15);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY + 35, 20, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Facial Vector Points
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + frameCount * 0.02;
        const px = centerX + Math.cos(angle) * (headRadius + 5);
        const py = centerY + Math.sin(angle) * (headRadius * 1.25 + 5);
        ctx.fillStyle = i % 2 === 0 ? '#34d399' : '#059669';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // HUD Text
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`VIRTUAL LIVE STREAM - 60FPS`, 20, 30);
      ctx.fillText(`AI FACE ENGINE: READY`, 20, 48);
      ctx.fillText(`TIMESTAMP: ${new Date().toLocaleTimeString()}`, 20, 66);

      animationFrameRef.current = requestAnimationFrame(renderVirtualFeed);
    };

    renderVirtualFeed();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [cameraActive, isVirtualCamera]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imgUrl = event.target?.result as string;
      if (!imgUrl) return;

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 640;
        canvas.height = img.height || 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setScanning(true);
        try {
          const result = await extractFaceDescriptorFromCanvas(canvas);
          if (result && result.descriptor) {
            const matchRes = matchFace(result.descriptor, employees, settings.minMatchConfidence);
            if (matchRes.matchedEmployee) {
              const matchedEmp = matchRes.matchedEmployee;
              const photoProof = canvas.toDataURL('image/jpeg', 0.85);

              const response = await fetch('/api/attendance/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  employeeId: matchedEmp.id,
                  photoProof,
                  location: 'Unggah Foto Wajah',
                  matchScore: matchRes.confidence / 100,
                }),
              });

              if (response.ok) {
                const resData = await response.json();
                if (soundEnabled) playAttendanceSound('SUCCESS');

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
                setTimeout(() => setLastNotification(null), 6000);
              }
            } else {
              alert('Wajah pada foto tidak cocok dengan data karyawan terdaftar (Confidence < ' + (settings.minMatchConfidence * 100) + '%).');
            }
          } else {
            alert('Wajah tidak terdeteksi pada foto yang diunggah. Silakan gunakan foto wajah yang jelas.');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
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
                {!isVirtualCamera && (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    playsInline
                    muted
                  />
                )}
                <canvas
                  ref={canvasRef}
                  className={`w-full h-full object-cover ${
                    isVirtualCamera ? 'block' : 'absolute inset-0 transform scale-x-[-1] pointer-events-none'
                  }`}
                />

                {/* Face Scanning Guide Frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-80 border-2 border-dashed border-emerald-500/40 rounded-3xl flex items-center justify-center relative">
                    <div className="absolute -top-3 bg-slate-900/90 backdrop-blur text-emerald-400 text-[10px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full border border-emerald-500/30">
                      Posisikan Wajah Di Sini
                    </div>
                  </div>
                </div>

                {/* Mode Indicator Badge */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-700/80 text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 shadow">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{isVirtualCamera ? 'Kamera Virtual Live (Simulasi AI)' : 'Webcam Fisik Live'}</span>
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
              <div className="text-center p-6 max-w-md">
                <Camera className="w-14 h-14 text-slate-600 mx-auto mb-3 animate-bounce" />
                <h3 className="text-base font-bold text-slate-200">Mode Kamera Presensi</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                  Iframe preview browser memerlukan izin akses kamera. Anda dapat membuka di tab baru untuk webcam fisik langsung, mengaktifkan mode kamera virtual live, atau mengunggah foto wajah.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={startCamera}
                    className="px-3.5 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg hover:bg-emerald-400 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Kamera Fisik Live
                  </button>

                  <button
                    onClick={startVirtualCameraStream}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Stream Virtual Live
                  </button>

                  <button
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow"
                    title="Buka di Tab Baru untuk izin kamera browser langsung"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka di Tab Baru
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleUploadPhoto}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={scanning}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    {scanning ? 'Memproses Foto...' : 'Unggah Foto Wajah'}
                  </button>
                </div>
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
