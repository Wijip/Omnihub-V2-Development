import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, Clock, Share2, MoreVertical, Check, 
  Copy, User, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { cn, formatDuration } from '../lib/utils';

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

interface VideoCardProps {
  video: any;
  onWatchLaterToggle?: (saved: boolean) => void;
}

export default function VideoCard({ video, onWatchLaterToggle }: VideoCardProps) {
  const navigate = useNavigate();
  const [isSavedWatchLater, setIsSavedWatchLater] = useState(false);
  const [isTogglingWatchLater, setIsTogglingWatchLater] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Toggle Watch Later without navigating
  const handleToggleWatchLater = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Silakan login terlebih dahulu untuk menyimpan ke Tonton Nanti.');
      return;
    }

    if (isTogglingWatchLater) return;
    setIsTogglingWatchLater(true);

    try {
      const res = await api.post(`/watch-later/${video.id}`);
      const newState = Boolean(res.data?.saved);
      setIsSavedWatchLater(newState);
      if (onWatchLaterToggle) onWatchLaterToggle(newState);
    } catch (err) {
      console.error('Gagal memperbarui Tonton Nanti:', err);
    } finally {
      setIsTogglingWatchLater(false);
      setShowMenu(false);
    }
  };

  // Quick Share link copy
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/video/${video.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } else {
      alert('Tautan disalin: ' + url);
    }
    setShowMenu(false);
  };

  // Copy Video Title
  const handleCopyTitle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(video.title || '');
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
    setShowMenu(false);
  };

  // Open Creator Channel
  const handleOpenChannel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/channel/${video.user_id}`);
    setShowMenu(false);
  };

  return (
    <div className="group flex flex-col gap-3 relative select-none">
      {/* THUMBNAIL CONTAINER */}
      <Link
        to={`/video/${video.id}`}
        className="relative w-full aspect-video rounded-2xl bg-black overflow-hidden border border-white/10 group-hover:border-brand-500/40 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300 group/thumb block"
      >
        {/* Thumbnail Image / Video Fallback */}
        {(video.thumbnail_url || video.thumbnail) ? (
          <img
            src={getThumbnailUrl(video.thumbnail_url || video.thumbnail)}
            alt={video.title}
            className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : video.url ? (
          <video
            src={video.url}
            className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-500 ease-out"
            muted
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
            <Play size={28} />
          </div>
        )}

        {/* Live Badge or Duration Badge (YouTube Bottom Right Style) */}
        {video.status === 'live' ? (
          <div className="absolute bottom-2 right-2 bg-rose-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1.5 animate-pulse z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            LIVE
          </div>
        ) : video.duration > 0 ? (
          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md shadow-md border border-white/10 pointer-events-none">
            {formatDuration(video.duration)}
          </div>
        ) : null}

        {/* YOUTUBE-STYLE HOVER QUICK-ACTION BUTTONS (TOP RIGHT OF THUMBNAIL) */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
          {/* Quick Watch Later Button */}
          <button
            type="button"
            onClick={handleToggleWatchLater}
            disabled={isTogglingWatchLater}
            title={isSavedWatchLater ? "Hapus dari Tonton Nanti" : "Tonton Nanti"}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-xl active:scale-90 border",
              isSavedWatchLater
                ? "bg-brand-600 text-white border-brand-400"
                : "bg-black/85 hover:bg-black text-white hover:text-brand-400 border-white/10 backdrop-blur-md"
            )}
          >
            {isSavedWatchLater ? <Check size={15} /> : <Clock size={15} />}
          </button>

          {/* Quick Share Button */}
          <button
            type="button"
            onClick={handleShare}
            title="Bagikan tautan"
            className="w-8 h-8 rounded-lg bg-black/85 hover:bg-black text-white hover:text-brand-400 flex items-center justify-center transition-all shadow-xl active:scale-90 border border-white/10 backdrop-blur-md"
          >
            <Share2 size={15} />
          </button>
        </div>

        {/* Visual Copied Badge Alert */}
        <AnimatePresence>
          {showCopiedToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 left-2 bg-brand-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xl flex items-center gap-1 z-30"
            >
              <Check size={12} />
              <span>Tautan disalin!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>

      {/* METADATA SECTION */}
      <div className="flex gap-3 px-1 items-start relative">
        {/* Creator Avatar (Direct Link to Channel) */}
        <button
          type="button"
          onClick={handleOpenChannel}
          title={`Lihat channel ${video.firstName || 'kreator'}`}
          className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-inner border border-white/10 hover:opacity-85 transition-opacity active:scale-95"
        >
          {video.avatar_url ? (
            <img src={getThumbnailUrl(video.avatar_url)} alt="" className="w-full h-full object-cover" />
          ) : (
            (video.firstName?.[0] || 'U').toUpperCase()
          )}
        </button>

        {/* Video Info */}
        <div className="flex flex-col overflow-hidden min-w-0 flex-1 pt-0.5">
          <Link
            to={`/video/${video.id}`}
            className="text-white font-bold text-sm leading-snug group-hover:text-brand-400 transition-colors line-clamp-2"
            title={video.title}
          >
            {video.title}
          </Link>
          <button
            type="button"
            onClick={handleOpenChannel}
            className="text-neutral-400 hover:text-white font-medium text-xs mt-1 truncate text-left transition-colors"
          >
            {video.firstName} {video.lastName}
          </button>
          <p className="text-neutral-500 text-[11px] font-medium mt-0.5 truncate flex items-center gap-1.5">
            {video.status === 'live' ? (
              <span className="text-rose-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Sedang Disiarkan Langsung
              </span>
            ) : (
              <>
                <span>{formatViews(video.views)}</span>
                <span>•</span>
                <span>{formatTimeAgo(video.created_at)}</span>
              </>
            )}
          </p>
        </div>

        {/* 3-DOT CONTEXT MENU BUTTON (YOUTUBE DESKTOP STYLE) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="Tindakan lainnya"
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreVertical size={16} />
          </button>

          {/* Context Menu Dropdown */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute right-0 top-full mt-1 w-48 bg-[#1f1f1f] border border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={handleToggleWatchLater}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors text-left"
                >
                  <Clock size={15} className="text-neutral-400" />
                  <span>{isSavedWatchLater ? 'Hapus Tonton Nanti' : 'Tonton Nanti'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors text-left"
                >
                  <Share2 size={15} className="text-neutral-400" />
                  <span>Bagikan Tautan</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenChannel}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors text-left"
                >
                  <User size={15} className="text-neutral-400" />
                  <span>Buka Channel Kreator</span>
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={handleCopyTitle}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors text-left"
                >
                  <Copy size={15} className="text-neutral-400" />
                  <span>Salin Judul Video</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

