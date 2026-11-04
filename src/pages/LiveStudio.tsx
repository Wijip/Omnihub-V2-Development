import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Radio, Copy, Check, Eye, Save, Settings, Video, Sparkles, Layers, ShieldCheck } from 'lucide-react';

const LiveStudio: React.FC = () => {
  const currentIp = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  const [liveData, setLiveData] = useState({
    isLive: false,
    rtmpUrl: `rtmp://${currentIp}:1935/live`,
    streamKey: 'stream_key_wiji_hub',
    title: 'Live Stream Siaran Langsung',
    description: 'Siaran langsung dari OmniHub Live Studio',
    viewerCount: 0,
    videoId: null as number | null
  });
  
  const [titleInput, setTitleInput] = useState(liveData.title);
  const [descInput, setDescInput] = useState(liveData.description);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [wasLive, setWasLive] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Polling Otomatis Status Live Setiap 3 Detik
  useEffect(() => {
    let isSubscribed = true;

    const checkLiveStatus = async () => {
      try {
        const res = await api.get('/live/status');
        if (res.data && typeof res.data.isLive !== 'undefined' && isSubscribed) {
          setLiveData(prev => {
            // Deteksi transisi dari Live ke Selesai untuk menampilkan notifikasi VOD Encoding
            if (prev.isLive && !res.data.isLive) {
              setArchiveNotice(true);
            }
            return {
              ...prev,
              ...res.data
            };
          });
        }
      } catch (err) {
        console.error("Error polling live status:", err);
      }
    };

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  // Update input text saat liveData pertama kali didapat dari backend
  useEffect(() => {
    if (liveData.title) setTitleInput(liveData.title);
    if (liveData.description) setDescInput(liveData.description);
  }, [liveData.title, liveData.description]);

  // Engine HLS.js Decoder untuk Browser Desktop
  useEffect(() => {
    if (liveData.isLive && videoRef.current) {
      const hlsUrl = `http://${window.location.hostname}:8005/live/${liveData.streamKey}/index.m3u8`;
      
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = hlsUrl;
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = () => {
          if ((window as any).Hls && (window as any).Hls.isSupported()) {
            const hls = new (window as any).Hls({
              manifestLoadingTimeOut: 10000,
              manifestLoadingMaxRetry: 5,
            });
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoRef.current);
          }
        };
        document.body.appendChild(script);
      }
    }
  }, [liveData.isLive, liveData.streamKey]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccess(false);
    try {
      await api.post('/live/settings', {
        title: titleInput,
        description: descInput
      });
      setSaveSuccess(true);
      setLiveData(prev => ({
        ...prev,
        title: titleInput,
        description: descInput
      }));
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Gagal menyimpan setelan live:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-display flex items-center gap-3">
            <Radio className="text-rose-500 animate-pulse" size={28} />
            Ruang Kontrol Siaran Langsung
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Siarkan langsung konten Anda dan nikmati auto-archive multi-resolusi otomatis saat siaran selesai.
          </p>
        </div>
        
        <div className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${
          liveData.isLive 
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${liveData.isLive ? 'bg-rose-500 animate-ping' : 'bg-neutral-500'}`} />
          {liveData.isLive ? `LIVE ON AIR • ${liveData.viewerCount} Penonton` : 'OFFLINE (MENUNGGU ENCODER)'}
        </div>
      </div>

      {/* Notifikasi Auto-Archive VOD Selesai */}
      {archiveNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-amber-300 text-sm">Siaran Langsung Telah Selesai!</p>
              <p className="text-xs text-neutral-300 mt-0.5">
                Rekaman video Anda sedang diarsipkan dan dimasukkan ke antrean encoding multi-resolusi (1080p, 720p, 480p, 360p). Video VOD akan segera muncul otomatis di tab Creator Dashboard & Beranda.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setArchiveNotice(false)}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Grid Konten Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri & Tengah: Player Preview & Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Layar Preview HLS Live Player */}
          <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-neutral-800 flex items-center justify-center shadow-xl">
            {liveData.isLive ? (
              <video 
                ref={videoRef}
                controls 
                autoPlay 
                muted 
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-500 shadow-inner">
                  <Video size={30} />
                </div>
                <p className="text-lg font-bold text-neutral-200 mb-2">Hubungkan encoder untuk memulai siaran</p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Salin dan tempel **URL Streaming** serta **Stream Key** di bawah ke OBS Studio, Streamlabs, atau aplikasi live HP Anda. Begitu Anda klik <i>Start Streaming</i>, player ini akan langsung menyala.
                </p>
              </div>
            )}
          </div>

          {/* Panel Setelan Streaming (YouTube Studio Style) */}
          <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-300 flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Settings size={18} className="text-brand-500" />
              Setelan Koneksi Encoder (OBS / vMix / Prism)
            </h3>
            
            <div className="space-y-4">
              {/* URL Streaming */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block mb-1.5">
                  URL STREAMING (RTMP SERVER)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={liveData.rtmpUrl} 
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs flex-1 font-mono text-neutral-200 focus:outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => handleCopy(liveData.rtmpUrl, 'url')}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-neutral-700"
                  >
                    {copiedField === 'url' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedField === 'url' ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Kunci Streaming / Stream Key */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block mb-1.5">
                  KUNCI STREAMING (STREAM KEY)
                </label>
                <div className="flex gap-2">
                  <input 
                    type={showKey ? 'text' : 'password'} 
                    readOnly 
                    value={liveData.streamKey} 
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs flex-1 font-mono text-neutral-200 focus:outline-none tracking-widest"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors border border-neutral-700"
                  >
                    {showKey ? 'Sembunyikan' : 'Lihat'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleCopy(liveData.streamKey, 'key')}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                  >
                    {copiedField === 'key' ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                    {copiedField === 'key' ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Metadata & Informasi Auto-Archive */}
        <div className="space-y-6">
          
          {/* Card Form Informasi Siaran */}
          <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-300 border-b border-neutral-800 pb-3 flex items-center justify-between">
              <span>📋 Informasi Siaran</span>
              {saveSuccess && (
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Check size={12} /> Tersimpan!
                </span>
              )}
            </h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block mb-1.5">
                  JUDUL SIARAN LIVE
                </label>
                <input 
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Masukkan judul siaran live Anda..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block mb-1.5">
                  DESKRIPSI
                </label>
                <textarea 
                  rows={3}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Deskripsi singkat siaran..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
              >
                <Save size={14} />
                {isSavingSettings ? 'Menyimpan...' : 'Simpan Informasi'}
              </button>
            </form>
          </div>

          {/* Card Fitur Auto-Archive & Multi-Resolusi */}
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-900/50 p-6 rounded-3xl border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2.5 text-brand-400">
              <Layers size={20} />
              <h4 className="font-black text-sm uppercase tracking-wider text-white">
                Auto-Archive VOD Pipeline
              </h4>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Terinspirasi dari sistem YouTube: Saat siaran live Anda berakhir di OBS, server OmniHub akan otomatis:
            </p>

            <ul className="text-xs text-neutral-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Menyimpan Master Video:</strong> Seluruh durasi siaran direkam langsung ke storage lokal.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Multi-Resolution Transcoding:</strong> Meng-encode video ke varian <strong>1080p, 720p, 480p, dan 360p</strong> menggunakan GPU NVENC.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Pembuatan Thumbnail:</strong> Menghasilkan poster thumbnail video secara otomatis.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span><strong>Terbit Otomatis di Studio:</strong> Hasil VOD langsung muncul di Creator Dashboard & Beranda untuk ditonton kembali oleh audiens.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LiveStudio;
