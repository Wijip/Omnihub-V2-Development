import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Compass, Flame, Tv, GraduationCap, Gamepad2, 
  Music2, Cpu, Eye, Play, Sparkles, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { formatDuration } from '../lib/utils';
import VideoCard from '../components/VideoCard';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '') || '';

const getThumbnailUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const pathPart = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${pathPart}`;
};

const formatViews = (views: number = 0) => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M tayangan`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K tayangan`;
  return `${views} tayangan`;
};

const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari yang lalu`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu yang lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CATEGORIES = [
  { id: 'all', label: 'Semua', icon: Compass },
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: '1', label: 'Entertainment', icon: Tv },
  { id: '2', label: 'Education', icon: GraduationCap },
  { id: '3', label: 'Gaming', icon: Gamepad2 },
  { id: '4', label: 'Music', icon: Music2 },
  { id: '5', label: 'Technology', icon: Cpu },
];

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  const [categoryVideos, setCategoryVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExploreData();
  }, [activeCategory]);

  const fetchExploreData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeCategory === 'all') {
        // Ambil trending dan semua video
        const [trendingRes, allRes] = await Promise.all([
          api.get('/videos?sort=trending&limit=6'),
          api.get('/videos'),
        ]);
        setTrendingVideos(Array.isArray(trendingRes.data) ? trendingRes.data : []);
        setCategoryVideos(Array.isArray(allRes.data) ? allRes.data : []);
      } else if (activeCategory === 'trending') {
        const trendingRes = await api.get('/videos?sort=trending');
        const list = Array.isArray(trendingRes.data) ? trendingRes.data : [];
        setTrendingVideos(list.slice(0, 3));
        setCategoryVideos(list);
      } else {
        // Filter kategori spesifik
        const res = await api.get(`/videos?category=${activeCategory}`);
        setCategoryVideos(Array.isArray(res.data) ? res.data : []);
        setTrendingVideos([]);
      }
    } catch (err: any) {
      console.error('Failed to load explore videos:', err);
      setError('Gagal memuat konten jelajah. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  const featuredVideo = trendingVideos.length > 0 ? trendingVideos[0] : categoryVideos[0];

  return (
    <div className="w-full space-y-8 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-black tracking-wider uppercase mb-2">
            <Compass size={14} className="animate-spin-slow" />
            <span>Pusat Jelajah</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight font-display">
            Explore & Trending
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1">
            Temukan video terpopuler, rilis terbaru, dan kreator favorit berdasarkan kategori.
          </p>
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-2 px-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm transition-all whitespace-nowrap active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25 border border-brand-400/30'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-neutral-400'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* FEATURED / TRENDING HERO BANNER (Jika di kategori 'all' atau 'trending' dan ada video) */}
      {!loading && featuredVideo && (activeCategory === 'all' || activeCategory === 'trending') && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-neutral-900 to-[#0e0e11] shadow-2xl group"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Thumbnail Box */}
            <div className="lg:col-span-7 relative aspect-video w-full overflow-hidden bg-black/60">
              {(featuredVideo.thumbnail_url || featuredVideo.thumbnail) ? (
                <img
                  src={getThumbnailUrl(featuredVideo.thumbnail_url || featuredVideo.thumbnail)}
                  alt={featuredVideo.title}
                  className="w-full h-full object-contain bg-black transition-transform duration-500 group-hover:scale-105"
                />
              ) : featuredVideo.url ? (
                <video
                  src={featuredVideo.url}
                  className="w-full h-full object-contain bg-black transition-transform duration-500 group-hover:scale-105"
                  muted
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                  <Play size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
              <div className="absolute top-4 left-4 bg-rose-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
                <Flame size={14} className="animate-pulse" />
                <span>#1 Trending Video</span>
              </div>
              {featuredVideo.duration && (
                <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-white text-[11px] font-black px-2 py-1 rounded-lg">
                  {formatDuration(featuredVideo.duration)}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-center space-y-4">
              <div className="inline-flex items-center gap-2 text-rose-400 text-xs font-bold tracking-wider uppercase">
                <Sparkles size={14} />
                <span>Sorotan Utama Minggu Ini</span>
              </div>

              <h2 className="text-xl md:text-3xl font-black text-white tracking-tight line-clamp-2 leading-snug">
                {featuredVideo.title}
              </h2>

              <p className="text-neutral-400 text-xs md:text-sm line-clamp-3 leading-relaxed">
                {featuredVideo.description || 'Tonton video unggulan terpopuler di OmniHub sekarang.'}
              </p>

              <div className="flex items-center gap-4 text-xs text-neutral-400 font-medium pt-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-black text-white overflow-hidden">
                    {featuredVideo.avatar_url ? (
                      <img src={getThumbnailUrl(featuredVideo.avatar_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (featuredVideo.firstName?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <span>{featuredVideo.firstName} {featuredVideo.lastName}</span>
                </div>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye size={13} /> {formatViews(featuredVideo.views)}
                </span>
                <span>•</span>
                <span>{formatTimeAgo(featuredVideo.created_at)}</span>
              </div>

              <div className="pt-2">
                <Link
                  to={`/video/${featuredVideo.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-brand-500/25 transition-all active:scale-95"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Tonton Sekarang</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* SKELETON LOADING STATE */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse flex flex-col gap-3">
              <div className="w-full aspect-video bg-white/5 rounded-2xl border border-white/5" />
              <div className="flex gap-3 px-1">
                <div className="w-10 h-10 bg-white/5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 max-w-lg mx-auto">
          <AlertCircle size={32} className="mx-auto mb-3" />
          <p className="font-bold">{error}</p>
          <button
            onClick={fetchExploreData}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* VIDEO GRID */}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{activeCategory === 'trending' ? 'Daftar Video Trending' : 'Video Pilihan'}</span>
              <span className="text-xs font-bold text-neutral-500">({categoryVideos.length})</span>
            </h3>
          </div>

          {categoryVideos.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
              <Compass size={40} className="mx-auto text-neutral-600 mb-3" />
              <h4 className="text-base font-bold text-white">Belum Ada Video di Kategori Ini</h4>
              <p className="text-neutral-500 text-xs mt-1 max-w-sm mx-auto">
                Koleksi video untuk kategori ini belum tersedia. Jelajahi kategori lain atau unggah video Anda sendiri!
              </p>
              <button
                onClick={() => setActiveCategory('all')}
                className="mt-5 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Lihat Semua Kategori
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
              {categoryVideos.map((video: any) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

