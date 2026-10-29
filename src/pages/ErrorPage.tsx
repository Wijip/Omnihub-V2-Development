import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Search, RefreshCcw, Home, ArrowLeft, 
  Sparkles, AlertCircle, ChevronDown, ChevronUp, Compass 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ErrorPageProps {
  type?: 404 | 500 | 'error' | 'development' | 'under-construction';
  title?: string;
  description?: string;
  featureName?: string;
  errorMessage?: string;
}

// Daftar rute yang secara otomatis dikenali sebagai rute dalam tahap pengembangan jika belum diimplementasikan
const KNOWN_DEV_ROUTES: Record<string, { title: string; desc: string }> = {
  '/explore': {
    title: 'Halaman Explore Sedang Disiapkan',
    desc: 'Halaman Jelajah video trending dan kategori favorit sedang dalam tahap penyempurnaan agar Anda mendapatkan rekomendasi terbaik.',
  },
  '/liked': {
    title: 'Halaman Video yang Disukai',
    desc: 'Fitur koleksi video yang Anda sukai sedang dalam tahap pengembangan dan akan segera aktif untuk akun Anda.',
  },
  '/watch-later': {
    title: 'Halaman Tonton Nanti',
    desc: 'Fitur antrean simpan video untuk ditonton nanti sedang kami persiapkan untuk kenyamanan Anda.',
  },
  '/subscriptions': {
    title: 'Halaman Langganan Channel',
    desc: 'Fitur feed pembaruan dari kreator yang Anda ikuti sedang kami kembangkan dan akan segera hadir.',
  },
};

export default function ErrorPage({
  type = 'error',
  title: customTitle,
  description: customDesc,
  featureName,
  errorMessage,
}: ErrorPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const pathname = location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const devRouteInfo = KNOWN_DEV_ROUTES[pathname];

  // Tentukan apakah halaman ini merupakan "Tahap Pengembangan"
  const isDevelopment = 
    type === 'development' || 
    type === 'under-construction' || 
    (type === 404 && Boolean(devRouteInfo));

  // Tentukan visual dan pesan berdasarkan kondisi
  let IconComponent = Search;
  let iconTheme = {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
  };
  let pageBadge = 'Halaman';
  let title = customTitle || 'Halaman Tidak Ditemukan';
  let description =
    customDesc ||
    'Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.';

  if (isDevelopment) {
    IconComponent = Sparkles;
    iconTheme = {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_35px_rgba(245,158,11,0.2)]',
    };
    pageBadge = 'Tahap Pengembangan';
    title = customTitle || devRouteInfo?.title || (featureName ? `Fitur ${featureName} Sedang Disiapkan` : 'Fitur Sedang Dalam Pengembangan');
    description =
      customDesc ||
      devRouteInfo?.desc ||
      'Fitur ini sedang dirancang dan dibangun oleh tim kami untuk menghadirkan pengalaman terbaik bagi Anda. Silakan nantikan pembaruan berikutnya!';
  } else if (type === 404) {
    IconComponent = Search;
    iconTheme = {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    };
    pageBadge = 'Status 404';
    title = customTitle || 'Halaman Tidak Ditemukan';
    description =
      customDesc ||
      'Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.';
  } else {
    // 500 / Runtime error
    IconComponent = AlertCircle;
    iconTheme = {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]',
    };
    pageBadge = 'Kendala Sistem';
    title = customTitle || 'Layanan Sedang Mengalami Kendala';
    description =
      customDesc ||
      'Maaf, terjadi gangguan sementara pada sistem. Tim kami sedang menanganinya dan layanan akan segera kembali normal.';
  }

  return (
    <div className="w-full min-h-[calc(100vh-160px)] flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-lg bg-[#141416]/95 dark:bg-[#111113]/95 backdrop-blur-2xl border border-white/10 dark:border-white/[0.08] rounded-[2rem] p-8 sm:p-12 shadow-2xl shadow-black/60 text-center relative overflow-hidden"
      >
        {/* Soft Background Radial Light */}
        <div 
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: isDevelopment ? '#f59e0b' : type === 404 ? '#3b82f6' : '#f43f5e' }}
        />

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-6">
          <span className={`w-2 h-2 rounded-full ${isDevelopment ? 'bg-amber-400 animate-pulse' : type === 404 ? 'bg-blue-400' : 'bg-rose-400'}`} />
          {pageBadge}
        </div>

        {/* Central Icon */}
        <div className={`mx-auto w-20 h-20 rounded-full ${iconTheme.bg} border ${iconTheme.border} ${iconTheme.glow} flex items-center justify-center mb-6 transition-transform hover:scale-105 duration-300`}>
          <IconComponent className={`w-9 h-9 ${iconTheme.text}`} />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight font-display">
          {title}
        </h1>

        {/* Friendly, Non-technical Description */}
        <p className="text-neutral-400 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
          {description}
        </p>

        {/* Non-intrusive Technical Error Accordion (Hanya jika ada errorMessage & tidak membingungkan pengguna umum) */}
        {errorMessage && (
          <div className="mb-6 text-left">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-neutral-400 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span>Informasi Teknis Tambahan</span>
              {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {showTechnicalDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <pre className="mt-2 p-3 text-[11px] text-neutral-300 font-mono bg-black/60 border border-white/5 rounded-xl whitespace-pre-wrap break-words">
                    {errorMessage}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Buttons (Matches user UI) */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl border border-white/10 transition-all active:scale-95 hover:shadow-lg hover:shadow-black/20"
          >
            <RefreshCcw className="w-4 h-4 text-neutral-300" />
            <span>Segarkan</span>
          </button>

          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-brand-500/25 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
        </div>

        {/* Optional Back Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke halaman sebelumnya</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
