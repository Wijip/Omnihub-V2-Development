import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, Play, Trash2, Eye, Calendar, 
  AlertCircle, Sparkles, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { formatDuration } from '../lib/utils';

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

const formatRelativeDate = (dateStr?: string) => {
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
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function WatchLaterPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  useEffect(() => {
    fetchWatchLater();
  }, []);

  const fetchWatchLater = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/watch-later');
      setVideos(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Silakan login terlebih dahulu untuk mengakses daftar Tonton Nanti.');
      } else {
        setError('Gagal memuat daftar Tonton Nanti. Silakan coba beberapa saat lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent, videoId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionInProgress) return;

    setActionInProgress(videoId);
    try {
      await api.delete(`/watch-later/${videoId}`);
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (err) {
      console.error('Failed to remove from watch later:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const firstVideo = videos[0];

  return (
    <div className="w-full space-y-8 pb-12">
      {/* LOADING SKELETON */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-pulse">
          <div className="lg:col-span-4 aspect-[4/5] bg-white/5 rounded-3xl border border-white/5" />
          <div className="lg:col-span-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white/5 rounded-2xl border border-white/5" />
            ))}
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 max-w-lg mx-auto">
          <AlertCircle size={36} className="mx-auto mb-3" />
          <p className="font-bold text-sm">{error}</p>
          <button
            onClick={fetchWatchLater}
            className="mt-4 px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* CONTENT */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT SUMMARY PANEL */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-b from-indigo-950/40 via-neutral-900/80 to-[#101013] border border-indigo-500/20 shadow-2xl space-y-6 relative overflow-hidden group">
              {/* Glow Accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Cover Preview */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-lg">
                {(firstVideo?.thumbnail_url || firstVideo?.thumbnail) ? (
                  <img
                    src={getThumbnailUrl(firstVideo.thumbnail_url || firstVideo.thumbnail)}
                    alt=""
                    className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-500"
                  />
                ) : firstVideo?.url ? (
                  <video
                    src={firstVideo.url}
                    className="w-full h-full object-contain bg-black"
                    muted
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-950/60 text-indigo-400">
                    <Clock size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Clock size={14} className="text-indigo-400" />
                    <span>Daftar Antrean Menonton</span>
                  </div>
                </div>
              </div>

              {/* Title & Info */}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
                  Tonton Nanti
                </h1>
                <p className="text-xs text-neutral-400">
                  Video yang telah Anda simpan untuk ditonton di waktu luang berikutnya.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-neutral-400">
                  <span className="text-white">{videos.length} video tersimpan</span>
                  <span>•</span>
                  <span>Hanya Anda yang dapat melihat</span>
                </div>
              </div>

              {/* Play All Button */}
              {videos.length > 0 && (
                <div className="pt-2">
                  <Link
                    to={`/video/${firstVideo.id}`}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-500/25 transition-all active:scale-95"
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Mulai Menonton</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT LIST PANEL */}
          <div className="lg:col-span-8 space-y-3">
            {videos.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                <Clock size={44} className="mx-auto text-neutral-600 mb-4" />
                <h3 className="text-lg font-black text-white">Daftar Tonton Nanti Masih Kosong</h3>
                <p className="text-neutral-400 text-xs mt-1 max-w-sm mx-auto">
                  Belum ada video yang disimpan. Simpan video menarik yang Anda temukan agar tidak terlewatkan.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Jelajahi Beranda</span>
                </Link>
              </div>
            ) : (
              <AnimatePresence>
                {videos.map((video: any, index: number) => (
                  <motion.div
                    key={video.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      to={`/video/${video.id}`}
                      className="group flex flex-col sm:flex-row gap-4 p-3 md:p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all duration-200"
                    >
                      {/* Video Number Indicator */}
                      <div className="hidden sm:flex items-center justify-center w-6 text-xs font-black text-neutral-500 group-hover:text-indigo-400 shrink-0">
                        {index + 1}
                      </div>

                      {/* Thumbnail */}
                      <div className="relative aspect-video sm:w-48 sm:h-28 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                        {(video.thumbnail_url || video.thumbnail) ? (
                          <img
                            src={getThumbnailUrl(video.thumbnail_url || video.thumbnail)}
                            alt={video.title}
                            className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : video.url ? (
                          <video
                            src={video.url}
                            className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-300"
                            muted
                            playsInline
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
                            <Play size={24} />
                          </div>
                        )}
                        {video.duration && (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                            {formatDuration(video.duration)}
                          </div>
                        )}
                      </div>

                      {/* Info & Action */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h3 className="text-sm md:text-base font-bold text-white group-hover:text-indigo-400 line-clamp-2 transition-colors leading-snug">
                            {video.title}
                          </h3>
                          <p className="text-xs text-neutral-400 font-medium mt-1 truncate">
                            {video.firstName} {video.lastName}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-medium mt-0.5 flex items-center gap-2">
                            <span>{formatViews(video.views)}</span>
                            <span>•</span>
                            <span>Disimpan {formatRelativeDate(video.saved_at)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="flex sm:flex-col justify-end sm:justify-center items-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleRemove(e, video.id)}
                          title="Hapus dari Tonton Nanti"
                          className="p-2.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

