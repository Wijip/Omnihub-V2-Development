import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { io } from 'socket.io-client';
import { 
  Play, ThumbsUp, ThumbsDown, Share2, MessageSquare, 
  User, Clock, Eye, Download, AlertTriangle, Settings, 
  ChevronDown, ChevronUp, FileText, Copy, CheckCircle2, 
  X, Loader2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RelatedVideoSkeleton } from '../components/Skeleton';
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

export default function VideoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [currentResolution, setCurrentResolution] = useState<string | number | undefined>(undefined);
  const [video, setVideo] = useState<any>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [relatedFilter, setRelatedFilter] = useState<'all' | 'channel'>('all');
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState<{ likes: number, dislikes: number, userAction?: 'like' | 'dislike' | null }>({ likes: 0, dislikes: 0, userAction: null });
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [resolutionsWithSizes, setResolutionsWithSizes] = useState<any[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);
  const [reportFields, setReportFields] = useState({
    pertemuan: '',
    program: '',
    materi: '',
    pembelajaran: ''
  });
  const [reportCopied, setReportCopied] = useState(false);
  const [isSavedWatchLater, setIsSavedWatchLater] = useState(false);
  const [isTogglingWatchLater, setIsTogglingWatchLater] = useState(false);

  const storedUser = localStorage.getItem('user');
  const currentUser = (storedUser && storedUser !== "undefined") ? JSON.parse(storedUser) : null;
  
  const hasIncremented = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingTimeRef = useRef<number | null>(null);
  const pendingPlayStateRef = useRef<boolean>(false);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      if (pendingTimeRef.current !== null) {
        videoRef.current.currentTime = pendingTimeRef.current;
        if (pendingPlayStateRef.current) {
          videoRef.current.play().catch(console.error);
        }
        pendingTimeRef.current = null;
        pendingPlayStateRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (id && hasIncremented.current !== id) {
      hasIncremented.current = id;
      api.post(`/videos/${id}/view`)
        .then((res) => {
          if (res.data?.views !== undefined) {
            setVideo((prev: any) => prev ? { ...prev, views: res.data.views } : prev);
          }
        })
        .catch(console.error);
    }
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const videoElement = videoRef.current;
    
    const startHeartbeat = () => {
      interval = setInterval(() => {
         api.post(`/videos/${id}/heartbeat`).catch(console.error);
      }, 10000);
    };

    const stopHeartbeat = () => {
      if (interval) clearInterval(interval);
    };

    if (videoElement) {
      videoElement.addEventListener('play', startHeartbeat);
      videoElement.addEventListener('pause', stopHeartbeat);
      videoElement.addEventListener('ended', stopHeartbeat);
      if (!videoElement.paused) startHeartbeat();
    }

    return () => {
      stopHeartbeat();
      if (videoElement) {
        videoElement.removeEventListener('play', startHeartbeat);
        videoElement.removeEventListener('pause', stopHeartbeat);
        videoElement.removeEventListener('ended', stopHeartbeat);
      }
    };
  }, [id, currentUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.menu-container')) {
        setShowQualityMenu(false);
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!videoRef.current) return;
      
      const key = e.key.toLowerCase();
      if (key === 'k') {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(console.error);
        } else {
          videoRef.current.pause();
        }
      } else if (key === 'j') {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      } else if (key === 'l') {
         videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Player HLS Live Stream Integration
  useEffect(() => {
    if (video && (video.status === 'live' || video.url?.endsWith('.m3u8'))) {
        const hlsUrl = video.url.startsWith('http') 
            ? video.url 
            : `http://${window.location.hostname}:8005${video.url}`;

        if (videoRef.current) {
            if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.current.src = hlsUrl;
            } else {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
                script.onload = () => {
                    if ((window as any).Hls && (window as any).Hls.isSupported()) {
                        const hls = new (window as any).Hls();
                        hls.loadSource(hlsUrl);
                        hls.attachMedia(videoRef.current);
                    }
                };
                document.body.appendChild(script);
            }
        }
    }
  }, [video]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [videoRes, commentsRes, likesRes, relatedRes] = await Promise.all([
          api.get(`/videos/${id}`),
          api.get(`/videos/${id}/comments`),
          api.get(`/videos/${id}/likes`),
          api.get(`/videos/${id}/related?limit=15`)
        ]);
        const videoData = videoRes.data;
        setVideo(videoData);
        setCurrentUrl(videoData.url);
        setComments(commentsRes.data);
        setLikes(likesRes.data);
        setRelatedVideos(relatedRes.data);

        const [channelResult, resolutionsResult] = await Promise.allSettled([
          api.get(`/channels/${videoData.user_id}`),
          api.get(`/videos/${id}/resolutions`)
        ]);

        if (channelResult.status === 'fulfilled') {
          setChannel(channelResult.value.data);
        } else {
          setChannel({
            id: videoData.user_id,
            firstName: videoData.first_name || videoData.firstName || 'Kreator',
            lastName: videoData.last_name || videoData.lastName || '',
            subscriberCount: 0
          });
        }

        if (resolutionsResult.status === 'fulfilled') {
          const resData = resolutionsResult.value.data;
          setResolutions(resData);
          if (resData && resData.length > 0) {
            setCurrentResolution(resData[0].res || resData[0]);
          }
          setResolutionsWithSizes(resData);
        }

        const token = localStorage.getItem('token');
        if (token) {
          api.get(`/watch-later/check/${id}`).then(res => {
            if (res.data?.saved) setIsSavedWatchLater(true);
          }).catch(() => {});
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Gagal memuat video');
      } finally {
        setLoading(false);
        setLoadingRelated(false);
      }
    };

    fetchData();

    const socket = io(API_BASE_URL);
    const handleProgress = async (data: any) => {
      if (data.status === 'ready') {
        const resWithSizes = await api.get(`/videos/${id}/resolutions`);
        setResolutionsWithSizes(resWithSizes.data);
        const videoRes = await api.get(`/videos/${id}`);
        setVideo(videoRes.data);
      }
    };
    
    socket.on(`video-progress-${id}`, handleProgress);

    return () => {
      socket.off(`video-progress-${id}`, handleProgress);
      socket.disconnect();
    };
  }, [id]);

  const handleToggleSubscribe = async () => {
    if (!currentUser) return alert('Silakan login untuk berlangganan');
    setSubmitting(true);
    try {
      await api.post('/subscriptions/toggle', { leaderId: video.user_id });
      const channelRes = await api.get(`/channels/${video.user_id}`);
      setChannel(channelRes.data);
    } catch (err) {
      console.error('Gagal memperbarui langganan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (type: 'like' | 'dislike') => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Silakan login untuk memberikan suka/tidak suka');
    try {
      await api.post(`/videos/${id}/like`, { type });
      const likesRes = await api.get(`/videos/${id}/likes`);
      setLikes(likesRes.data);
    } catch (err) {
      console.error('Gagal memperbarui status suka:', err);
    }
  };

  const handleToggleWatchLater = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Silakan login terlebih dahulu untuk menyimpan video ke Tonton Nanti');
    if (isTogglingWatchLater) return;

    setIsTogglingWatchLater(true);
    try {
      const res = await api.post(`/watch-later/${id}`);
      setIsSavedWatchLater(Boolean(res.data?.saved));
    } catch (err) {
      console.error('Gagal memperbarui Tonton Nanti:', err);
    } finally {
      setIsTogglingWatchLater(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPosting) return;
    const token = localStorage.getItem('token');
    if (!token) return alert('Silakan login untuk memberi komentar');

    setIsPosting(true);
    try {
      const res = await api.post(`/videos/${id}/comments`, { content: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Gagal mengirim komentar:', err);
    } finally {
      setIsPosting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-brand-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Play size={20} className="text-brand-500 ml-0.5" />
        </div>
      </div>
      <p className="text-neutral-400 font-semibold text-xs tracking-wider uppercase animate-pulse">Memuat Video...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <div className="p-5 bg-red-500/10 text-red-500 rounded-3xl mb-4">
        <AlertTriangle size={42} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Terjadi Kendala</h2>
      <p className="text-neutral-400 text-sm max-w-sm mb-6">{error}</p>
      <button 
        onClick={() => navigate('/')} 
        className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg shadow-brand-500/25"
      >
        Kembali ke Beranda
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 lg:px-6 py-2 pb-24">
      {/* YOUTUBE DESKTOP 2-COLUMN VIEWPORT LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* ==================================================================== */}
        {/* KOLOM KIRI (UTAMA): PEMUTAR VIDEO, INFO, AKSI, DESKRIPSI, KOMENTAR  */}
        {/* ==================================================================== */}
        <div className="flex-1 min-w-0 w-full">
          
          {/* 1. PEMUTAR VIDEO DENGAN AMBIENT LIGHTING GLOW */}
          <div className="relative group/player w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/5">
            {/* Ambient Lighting Mode (Glow Sinematik YouTube) */}
            {(video.thumbnail_url || video.thumbnail) && (
              <div className="absolute -inset-8 z-0 opacity-25 blur-[90px] scale-110 pointer-events-none overflow-hidden transition-opacity duration-700">
                <img 
                  src={getThumbnailUrl(video.thumbnail_url || video.thumbnail)} 
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              </div>
            )}

            <video
              ref={videoRef}
              src={video?.status === 'live' ? undefined : (video?.id && currentResolution ? `${API_BASE_URL}/api/videos/stream/${video.id}?res=${currentResolution}` : (video?.url ? (video.url.startsWith('http') ? video.url : `${API_BASE_URL}${video.url.startsWith('/') ? '' : '/'}${video.url}`) : undefined))}
              controls
              autoPlay
              onLoadedMetadata={handleLoadedMetadata}
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full object-contain bg-black relative z-10"
              poster={getThumbnailUrl(video.thumbnail_url || video.thumbnail)}
            />

            {/* Quality Setting Button */}
            <div className="absolute top-3 right-3 z-20 menu-container">
              <div className="relative">
                <button 
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide flex items-center gap-1.5 hover:bg-black/90 transition-all border border-white/10 shadow-lg"
                >
                  <Settings size={13} className={showQualityMenu ? 'animate-spin' : ''} />
                  <span>{currentResolution ? (String(currentResolution).endsWith('p') ? currentResolution : `${currentResolution}p`) : 'Kualitas'}</span>
                </button>
                
                <AnimatePresence>
                  {showQualityMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-36 max-h-[50vh] overflow-y-auto bg-[#1f1f1f] backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1 z-50 no-scrollbar"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/5 mb-1">
                        Kualitas Video
                      </div>
                      {resolutions.map((item: any) => {
                        const resLabel = String(item.res || item).endsWith('p') ? (item.res || item) : `${item.res || item}p`;
                        return (
                          <button 
                            key={item.res || item}
                            onClick={() => {
                              setCurrentResolution(item.res || item);
                              setShowQualityMenu(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-between",
                              currentResolution === (item.res || item) ? 'bg-white text-black font-bold' : 'text-neutral-300 hover:bg-white/10'
                            )}
                          >
                            <span>{resLabel}</span>
                            {currentResolution === (item.res || item) && <Check size={13} />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover/player:opacity-100 transition-opacity pointer-events-none hidden sm:block">
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[10px] font-medium text-white/70">
                <span className="flex items-center gap-1"><kbd className="bg-white/20 px-1 py-0.5 rounded">K</kbd> Putar/Jeda</span>
                <span className="text-white/20">•</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/20 px-1 py-0.5 rounded">J</kbd> -10d</span>
                <span className="text-white/20">•</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/20 px-1 py-0.5 rounded">L</kbd> +10d</span>
              </div>
            </div>
          </div>

          {/* 2. JUDUL VIDEO */}
          <div className="mt-3.5 space-y-2">
            <div className="flex items-start gap-3">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug">
                {video.title}
              </h1>
              {video?.status === 'live' && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse uppercase shrink-0 mt-1">
                  🔴 LIVE
                </span>
              )}
            </div>
          </div>

          {/* 3. CHANNEL BAR & SEGMENTED PILL ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pb-3 border-b border-white/5 relative z-40">
            {/* Sisi Kiri: Profil Kreator + Tombol Subscribe */}
            <div className="flex items-center gap-3">
              <Link 
                to={`/channel/${video.user_id}`} 
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white text-sm md:text-base shrink-0 overflow-hidden shadow-inner border border-white/10 hover:opacity-90 transition-opacity"
              >
                {channel?.avatar_url ? (
                  <img src={getThumbnailUrl(channel.avatar_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  (video.first_name?.[0] || video.firstName?.[0] || 'K').toUpperCase()
                )}
              </Link>
              <div className="min-w-0 pr-1">
                <Link 
                  to={`/channel/${video.user_id}`} 
                  className="font-bold text-sm md:text-base text-white hover:text-brand-400 transition-colors block truncate"
                >
                  {video.first_name || video.firstName} {video.last_name || video.lastName}
                </Link>
                <p className="text-[11px] md:text-xs text-neutral-400 truncate">
                  {channel?.subscriberCount ? `${channel.subscriberCount.toLocaleString()} pelanggan` : 'Kreator OmniHub'}
                </p>
              </div>

              {/* Tombol Subscribe Ala YouTube */}
              <button 
                onClick={handleToggleSubscribe}
                disabled={submitting}
                className={cn(
                  "ml-2 px-4 py-2 rounded-full font-semibold text-xs md:text-sm transition-all active:scale-95 shadow-sm shrink-0",
                  channel?.isSubscribed 
                    ? 'bg-white/10 text-neutral-300 hover:bg-white/15' 
                    : 'bg-white text-neutral-900 hover:bg-neutral-200'
                )}
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  channel?.isSubscribed ? 'Disubscribe' : 'Subscribe'
                )}
              </button>
            </div>

            {/* Sisi Kanan: Action Bar (Segmented Pills YouTube Style) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap relative z-40 overflow-visible py-1">
              {/* Joined Segmented Like / Dislike Pill */}
              <div className="flex items-center bg-white/10 hover:bg-white/15 rounded-full transition-colors overflow-hidden border border-white/5 shrink-0">
                <button 
                  onClick={() => handleLike('like')}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold transition-all active:scale-95",
                    likes.userAction === 'like' ? "text-brand-400 font-bold" : "text-white"
                  )}
                  title="Saya suka video ini"
                >
                  <ThumbsUp size={16} className={likes.userAction === 'like' ? "fill-current" : ""} />
                  <span>{likes.likes || 0}</span>
                </button>
                <div className="w-px h-5 bg-white/20" />
                <button 
                  onClick={() => handleLike('dislike')}
                  className={cn(
                    "flex items-center px-3 py-2 text-xs md:text-sm font-semibold transition-all active:scale-95",
                    likes.userAction === 'dislike' ? "text-red-400 font-bold" : "text-white"
                  )}
                  title="Saya tidak suka video ini"
                >
                  <ThumbsDown size={16} className={likes.userAction === 'dislike' ? "fill-current" : ""} />
                </button>
              </div>

              {/* Share Button Pill */}
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: video.title, url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Tautan video berhasil disalin ke clipboard!');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full text-xs md:text-sm font-semibold text-white transition-all active:scale-95 border border-white/5 shrink-0"
              >
                <Share2 size={16} />
                <span>Bagikan</span>
              </button>

              {/* Watch Later Button Pill */}
              <button 
                onClick={handleToggleWatchLater}
                disabled={isTogglingWatchLater}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all active:scale-95 border border-white/5 shrink-0",
                  isSavedWatchLater 
                    ? "bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/25" 
                    : "bg-white/10 hover:bg-white/15 text-white"
                )}
              >
                <Clock size={16} />
                <span>{isSavedWatchLater ? 'Tersimpan' : 'Tonton Nanti'}</span>
              </button>

              {/* Download Menu Pill dengan Z-Index Tinggi & Latar Solid */}
              <div className="relative menu-container shrink-0 z-50">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDownloadMenu((prev) => !prev);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold text-white transition-all border border-white/5",
                    showDownloadMenu ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/15"
                  )}
                >
                  <Download size={16} />
                  <span>Unduh</span>
                  <ChevronDown size={14} className={cn("transition-transform duration-200", showDownloadMenu ? "rotate-180" : "")} />
                </button>
                <AnimatePresence>
                  {showDownloadMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-64 bg-[#212121] border border-white/20 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.95)] overflow-hidden z-[999] p-2"
                      style={{ backgroundColor: '#212121' }}
                    >
                      <div className="px-3 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10 mb-1 flex items-center justify-between">
                        <span>Pilih Kualitas Unduhan</span>
                        <Download size={13} className="text-brand-400" />
                      </div>

                      {/* Resolusi Asli / Tertinggi */}
                      <a 
                        href={`${API_BASE_URL}/api/videos/download/${video?.id}?res=original`}
                        download
                        onClick={() => setShowDownloadMenu(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 hover:bg-white/10 rounded-xl transition-colors text-xs font-semibold text-white group/item"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                          <span>Resolusi Asli (Original)</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded group-hover/item:text-white shrink-0">
                          {(() => {
                            const originalSizeBytes = video.size || video.file_size || video.sizeBytes || video.fileSize;
                            return originalSizeBytes && !isNaN(Number(originalSizeBytes)) 
                              ? `${(Number(originalSizeBytes) / (1024 * 1024)).toFixed(1)} MB` 
                              : 'Paling Jernih';
                          })()}
                        </span>
                      </a>

                      {/* Daftar Resolusi Tersedia */}
                      {resolutions.map((item: any) => {
                        const resValue = item.res || item;
                        const cleanLabel = String(resValue).endsWith('p') ? resValue : `${resValue}p`;
                        return (
                          <a 
                            key={resValue}
                            href={`${API_BASE_URL}/api/videos/download/${video?.id}?res=${resValue}`}
                            download
                            onClick={() => setShowDownloadMenu(false)}
                            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/10 rounded-xl transition-colors text-xs font-semibold text-white group/item"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 group-hover/item:bg-white shrink-0" />
                              <span>Format {cleanLabel}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded group-hover/item:text-white shrink-0">
                              {item.size || 'Tersedia'}
                            </span>
                          </a>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Weekly Report Button Pill */}
              <button 
                onClick={() => setShowWeeklyReportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-full text-xs md:text-sm font-semibold transition-all active:scale-95 shrink-0"
              >
                <FileText size={16} />
                <span>Laporan</span>
              </button>
            </div>
          </div>

          {/* 4. YOUTUBE COLLAPSIBLE DESCRIPTION CARD */}
          <div 
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="mt-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-3.5 md:p-4 text-xs md:text-sm cursor-pointer border border-white/5 relative group/desc select-none"
          >
            <div className="font-bold text-white text-xs md:text-sm mb-2 flex flex-wrap items-center gap-2">
              <span>{formatViews(video.views)}</span>
              <span>•</span>
              <span>{new Date(video.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {video.duration > 0 && (
                <>
                  <span>•</span>
                  <span className="text-neutral-400 font-normal">Durasi {formatDuration(video.duration)}</span>
                </>
              )}
            </div>

            {/* Weekly Report Code Block Formatter */}
            {video.description && (video.description.includes('WEEKLY REPORT') || video.description.includes('```')) ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-brand-400 flex items-center gap-1.5">
                    <FileText size={14} /> Weekly Report Pembelajaran
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const cleanText = video.description.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
                      navigator.clipboard.writeText(cleanText);
                      setReportCopied(true);
                      setTimeout(() => setReportCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-md"
                  >
                    {reportCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    <span>{reportCopied ? 'Tersalin!' : 'Salin Laporan'}</span>
                  </button>
                </div>
                <pre className={cn(
                  "font-mono text-xs md:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap overflow-x-auto",
                  !showFullDescription && "line-clamp-4"
                )}>
                  {video.description.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()}
                </pre>
              </div>
            ) : (
              <p className={cn(
                "text-neutral-200 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-normal",
                !showFullDescription && "line-clamp-3"
              )}>
                {video.description || 'Tidak ada deskripsi pada video ini.'}
              </p>
            )}

            <div className="mt-2 text-xs font-bold text-neutral-400 group-hover:text-white transition-colors">
              {showFullDescription ? 'Tampilkan lebih sedikit' : '...selengkapnya'}
            </div>
          </div>

          {/* 5. KOLOM KOMENTAR ALA YOUTUBE */}
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare size={22} className="text-brand-500" />
                <span>{comments.length} Komentar</span>
              </h3>
            </div>

            {/* Input Tambah Komentar */}
            <form onSubmit={handlePostComment} className="flex gap-3 sm:gap-4 items-start">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white text-xs sm:text-sm shrink-0 shadow-inner">
                {currentUser?.firstName ? currentUser.firstName[0].toUpperCase() : <User size={18} />}
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  rows={1}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tambahkan komentar..."
                  className="w-full bg-transparent border-b border-white/20 pb-2 focus:border-white focus:outline-none text-xs sm:text-sm text-white placeholder-neutral-500 resize-none transition-colors"
                  onInput={(e: any) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
                {newComment.trim() && (
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      type="button"
                      onClick={() => setNewComment('')}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      disabled={!newComment.trim() || isPosting}
                      className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                    >
                      {isPosting ? <Loader2 className="animate-spin" size={13} /> : 'Kirim Komentar'}
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Daftar Komentar */}
            <div className="space-y-5 pt-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 sm:gap-4 group">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    {(comment.first_name?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {comment.first_name} {comment.last_name}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-normal">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4 pt-1 text-neutral-400">
                      <button className="flex items-center gap-1 text-[11px] hover:text-white transition-colors">
                        <ThumbsUp size={12} />
                      </button>
                      <button className="flex items-center gap-1 text-[11px] hover:text-white transition-colors">
                        <ThumbsDown size={12} />
                      </button>
                      <button className="text-[11px] hover:text-white font-semibold transition-colors">
                        Balas
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-neutral-500 italic py-2">Belum ada komentar. Jadilah yang pertama berkomentar!</p>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* KOLOM KANAN (SIDEBAR): DAFTAR VIDEO TERKAIT & REKOMENDASI UP NEXT   */}
        {/* ==================================================================== */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 space-y-4">
          {/* Filter Chips Terkait */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setRelatedFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none",
                relatedFilter === 'all'
                  ? "bg-white text-neutral-900 font-bold shadow-md"
                  : "bg-white/5 text-neutral-300 hover:bg-white/10"
              )}
            >
              Semua
            </button>
            <button
              onClick={() => setRelatedFilter('channel')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none",
                relatedFilter === 'channel'
                  ? "bg-white text-neutral-900 font-bold shadow-md"
                  : "bg-white/5 text-neutral-300 hover:bg-white/10"
              )}
            >
              Dari {video.first_name || video.firstName || 'Kreator Ini'}
            </button>
          </div>

          {/* Daftar Video Terkait Horizontal Compact (YouTube Desktop Style) */}
          <div className="flex flex-col gap-3">
            {loadingRelated ? (
              [...Array(6)].map((_, i) => <RelatedVideoSkeleton key={i} />)
            ) : (
              (relatedFilter === 'channel' 
                ? relatedVideos.filter(rv => rv.user_id === video.user_id) 
                : relatedVideos
              ).map((rv) => (
                <Link 
                  key={rv.id} 
                  to={`/video/${rv.id}`}
                  className="flex gap-3 group cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded-xl"
                >
                  {/* Thumbnail Container */}
                  <div className="w-36 sm:w-40 aspect-video bg-black rounded-xl overflow-hidden shrink-0 relative border border-white/5 group-hover:border-brand-500/40 transition-all">
                    {(rv.thumbnail_url || rv.thumbnail) ? (
                      <img 
                        src={getThumbnailUrl(rv.thumbnail_url || rv.thumbnail)} 
                        alt={rv.title}
                        className="w-full h-full object-contain bg-black group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : rv.url ? (
                      <video 
                        src={rv.url}
                        className="w-full h-full object-contain bg-black"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                        <Play size={20} />
                      </div>
                    )}
                    {rv.duration > 0 && (
                      <div className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        {formatDuration(rv.duration)}
                      </div>
                    )}
                  </div>

                  {/* Metadata Info */}
                  <div className="flex-1 min-w-0 py-0.5 space-y-1">
                    <h4 
                      className="text-xs md:text-sm font-semibold text-white group-hover:text-brand-400 line-clamp-2 leading-snug transition-colors"
                      title={rv.title}
                    >
                      {rv.title}
                    </h4>
                    <p className="text-[11px] md:text-xs text-neutral-400 truncate">
                      {rv.firstName || rv.first_name || 'Kreator'} {rv.lastName || rv.last_name || ''}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
                      <span>{formatViews(rv.views)}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(rv.created_at)}</span>
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>

      {/* WEEKLY REPORT TEMPLATE MODAL */}
      <AnimatePresence>
        {showWeeklyReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWeeklyReportModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#18181b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <FileText className="text-brand-400" size={22} />
                    <span>Template Laporan Mingguan</span>
                  </h2>
                  <p className="text-xs text-neutral-400">Dokumentasi hasil pembelajaran terstruktur</p>
                </div>
                <button 
                  onClick={() => setShowWeeklyReportModal(false)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-400 ml-1">Tanggal (Otomatis)</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs font-medium text-neutral-300">
                      {new Date(video.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-400 ml-1">Nama (Otomatis)</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs font-medium text-neutral-300">
                      {currentUser?.firstName || 'User'} {currentUser?.lastName || ''}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-400 ml-1">Pertemuan</label>
                    <input 
                      type="text"
                      placeholder="Contoh: 4"
                      value={reportFields.pertemuan}
                      onChange={(e) => setReportFields({...reportFields, pertemuan: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-500 text-xs text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-400 ml-1">Program</label>
                    <input 
                      type="text"
                      placeholder="Contoh: Arduino Beginner"
                      value={reportFields.program}
                      onChange={(e) => setReportFields({...reportFields, program: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-500 text-xs text-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400 ml-1">Materi</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Kontrol LED Menggunakan Potensiometer"
                    value={reportFields.materi}
                    onChange={(e) => setReportFields({...reportFields, materi: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-500 text-xs text-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400 ml-1">Pembelajaran Hari Ini</label>
                  <textarea 
                    rows={3}
                    placeholder="Tuliskan poin-poin yang dipelajari siswa hari ini..."
                    value={reportFields.pembelajaran}
                    onChange={(e) => setReportFields({...reportFields, pembelajaran: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-500 text-xs text-white transition-all resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400 ml-1">Pratinjau Output</label>
                  <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap">
                    {`WEEKLY REPORT\n`}
                    {`Tanggal: ${new Date(video.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}\n`}
                    {`Nama: ${currentUser?.firstName || 'User'} ${currentUser?.lastName || ''}\n`}
                    {`Pertemuan: ${reportFields.pertemuan || '...'}\n`}
                    {`Program: ${reportFields.program || '...'}\n`}
                    {`Materi: ${reportFields.materi || '...'}\n`}
                    {`Pembelajaran hari ini: ${reportFields.pembelajaran || '...'}\n`}
                    {`Note: Good Job`}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white/5 border-t border-white/10 flex items-center justify-end gap-3">
                <button 
                  onClick={() => {
                    const text = `WEEKLY REPORT\nTanggal: ${new Date(video.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}\nNama: ${currentUser?.firstName || 'User'} ${currentUser?.lastName || ''}\nPertemuan: ${reportFields.pertemuan}\nProgram: ${reportFields.program}\nMateri: ${reportFields.materi}\nPembelajaran hari ini: ${reportFields.pembelajaran}\nNote: Good Job`;
                    navigator.clipboard.writeText(text);
                    setReportCopied(true);
                    setTimeout(() => setReportCopied(false), 2000);
                  }}
                  className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-full font-bold text-xs transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-95"
                >
                  {reportCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  <span>{reportCopied ? 'Tersalin ke Clipboard' : 'Salin Template Laporan'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
