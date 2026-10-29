import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { 
  History as HistoryIcon, Search, Trash2, Play, Eye, Clock, 
  Calendar, AlertCircle, X, CheckCircle2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoCardSkeleton } from '../components/Skeleton';
import { cn, formatDuration } from '../lib/utils';

interface HistoryItem {
  history_id: number;
  id: number;
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  thumbnail_url?: string;
  views: number;
  created_at: string;
  watched_at: string;
  watch_time: number;
  duration?: number;
  status?: string;
  user_id?: number;
  firstName?: string;
  lastName?: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '') || '';

const getThumbnailUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const pathPart = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${pathPart}`;
};

const formatWatchTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0 dtk';
  if (seconds < 60) return `${seconds} dtk`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins} mnt ${secs} dtk` : `${mins} mnt`;
};

const formatRelativeDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay === 0) {
    if (diffHour === 0) {
      if (diffMin <= 1) return 'Baru saja';
      return `${diffMin} menit yang lalu`;
    }
    return `${diffHour} jam yang lalu`;
  }
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari yang lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/history');
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.response?.status === 401 ? 'Silakan login terlebih dahulu untuk melihat riwayat tontonan' : 'Gagal memuat riwayat tontonan');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (e: React.MouseEvent, historyId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(historyId);
    try {
      await api.delete(`/history/${historyId}`);
      setHistory((prev) => prev.filter((item) => item.history_id !== historyId));
    } catch (err) {
      console.error('Gagal menghapus item riwayat:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      await api.delete('/history');
      setHistory([]);
      setShowClearModal(false);
    } catch (err) {
      console.error('Gagal membersihkan seluruh riwayat:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const creatorMatch = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase().includes(q);
    return titleMatch || creatorMatch;
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 glass rounded-[2.5rem] border border-white/10 text-center px-6 max-w-lg mx-auto">
        <div className="p-6 bg-brand-500/10 text-brand-500 rounded-3xl mb-6 border border-brand-500/20">
          <AlertCircle size={44} />
        </div>
        <h2 className="text-2xl font-black font-display text-white mb-2">Akses Terbatas</h2>
        <p className="text-neutral-400 font-medium text-sm mb-8">{error}</p>
        <Link
          to="/auth"
          className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-brand-500/20 transition-all active:scale-95"
        >
          Masuk ke Akun
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-black uppercase tracking-wider">
            <HistoryIcon size={13} /> Aktivitas Tontonan
          </div>
          <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white">
            Riwayat Tontonan
          </h1>
          <p className="text-neutral-400 font-medium text-sm max-w-md">
            Daftar video yang telah Anda tonton beserta durasi pemutaran.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {history.length > 0 && (
            <>
              <div className="relative w-full sm:w-64 group">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-400 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Cari riwayat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                id="btn-clear-history"
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all active:scale-95 shrink-0"
              >
                <Trash2 size={14} />
                <span>Hapus Semua</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading Skeleton State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredHistory.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center glass rounded-3xl border border-white/10 p-8 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-lg shadow-brand-500/10">
            <HistoryIcon size={32} />
          </div>
          <h3 className="text-white font-black text-lg mb-1">
            {searchQuery ? 'Tidak Ada Video yang Cocok' : 'Belum Ada Riwayat Tontonan'}
          </h3>
          <p className="text-neutral-400 text-xs max-w-xs mb-6">
            {searchQuery
              ? `Tidak ditemukan video dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
              : 'Video yang Anda tonton akan otomatis muncul di halaman ini agar mudah diakses kembali.'}
          </p>
          {!searchQuery && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
              <span>Jelajahi Video</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* History Items Grid */}
      {!loading && filteredHistory.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredHistory.map((item) => {
              const thumb = getThumbnailUrl(item.thumbnail_url || item.thumbnail);
              const creatorName = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Omni Creator';

              return (
                <motion.div
                  key={item.history_id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="group relative flex flex-col rounded-2xl overflow-hidden glass border border-white/10 hover:border-brand-500/40 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-brand-500/5"
                >
                  {/* Thumbnail / Video Preview */}
                  <Link to={`/video/${item.id}`} className="relative aspect-video w-full overflow-hidden bg-neutral-950 block">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          // Fallback jika image thumbnail gagal dimuat
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                        <Play size={36} fill="currentColor" className="opacity-40" />
                      </div>
                    )}

                    {/* Dark gradient overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xl shadow-brand-500/40 transform scale-90 group-hover:scale-100 transition-transform">
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </div>
                    </div>

                    {/* Quality or Watch Time Pill */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                      {item.watch_time > 0 && (
                        <div className="bg-brand-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow flex items-center gap-1 border border-brand-400/20">
                          <Clock size={10} />
                          <span>{formatWatchTime(item.watch_time)}</span>
                        </div>
                      )}
                      <div className="bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow border border-white/10">
                        {item.duration ? formatDuration(item.duration) : 'HD'}
                      </div>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      id={`btn-remove-history-${item.history_id}`}
                      onClick={(e) => handleRemoveItem(e, item.history_id)}
                      disabled={deletingId === item.history_id}
                      title="Hapus dari riwayat"
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/70 hover:bg-red-600 text-neutral-300 hover:text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90 border border-white/10 hover:border-red-500 shadow"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Link>

                  {/* Metadata Content */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-[#0a0a0a]/60">
                    <div>
                      <Link to={`/video/${item.id}`}>
                        <h3
                          className="font-bold text-sm text-white group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-neutral-400 font-medium mt-1 truncate">
                        {creatorName}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Eye size={12} className="text-brand-500" />
                        <span>{Number(item.views || 0).toLocaleString()} views</span>
                      </span>
                      <span className="flex items-center gap-1 text-neutral-400" title={new Date(item.watched_at).toLocaleString('id-ID')}>
                        <Calendar size={12} />
                        <span>{formatRelativeDate(item.watched_at)}</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Confirmation Modal: Clear All History */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-3xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white font-display">Bersihkan Riwayat Tontonan?</h3>
                <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                  Semua video dalam daftar riwayat tontonan Anda akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-neutral-300 hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isClearing ? 'Menghapus...' : 'Ya, Bersihkan Semua'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
