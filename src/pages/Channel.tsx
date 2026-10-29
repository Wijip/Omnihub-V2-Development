import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Video, Play, User, Eye, Calendar, 
  Settings, CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
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

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function Channel() {
  const { id } = useParams<{ id?: string }>();
  const [channelData, setChannelData] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'Video' | 'Tentang'>('Video');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const isOwnChannel = !id || (currentUser && String(currentUser.id) === String(id));

  useEffect(() => {
    fetchChannelDetails();
  }, [id]);

  const fetchChannelDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      if (id) {
        // Mode Channel Publik
        const [channelRes, videosRes] = await Promise.all([
          api.get(`/channels/${id}`),
          api.get(`/channels/${id}/videos`)
        ]);
        setChannelData(channelRes.data);
        setVideos(Array.isArray(videosRes.data) ? videosRes.data : []);
      } else {
        // Mode Channel Pribadi Saya
        const [profileRes, videosRes] = await Promise.all([
          api.get('/user/profile'),
          api.get('/studio/videos').catch(() => ({ data: [] }))
        ]);
        const prof = profileRes.data;
        setChannelData({
          id: prof.id,
          firstName: prof.firstName,
          lastName: prof.lastName,
          channel_name: `${prof.firstName} ${prof.lastName}`,
          avatar_url: prof.avatar_url,
          subscriberCount: 0,
          total_videos: videosRes.data?.length || 0,
          total_views: videosRes.data?.reduce((acc: number, v: any) => acc + (Number(v.views) || 0), 0) || 0
        });
        setVideos(Array.isArray(videosRes.data) ? videosRes.data : []);
      }
    } catch (err: any) {
      console.error('Failed to load channel:', err);
      setError('Kreator tidak ditemukan atau profil belum tersedia.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscribe = async () => {
    if (!channelData?.id || subscribing) return;
    setSubscribing(true);
    try {
      await api.post('/subscriptions/toggle', { leaderId: channelData.id });
      setChannelData((prev: any) => ({
        ...prev,
        isSubscribed: !prev.isSubscribed,
        subscriberCount: prev.isSubscribed 
          ? Math.max(0, (prev.subscriberCount || 1) - 1)
          : (prev.subscriberCount || 0) + 1
      }));
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
    } finally {
      setSubscribing(false);
    }
  };

  const getInitials = () => {
    if (!channelData) return 'U';
    const first = channelData.firstName?.[0] || channelData.channel_name?.[0] || 'U';
    const last = channelData.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !channelData) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <AlertCircle size={40} className="mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Profil Tidak Ditemukan</h2>
        <p className="text-sm text-neutral-400 mb-6">{error || 'Data channel ini tidak tersedia.'}</p>
        <Link to="/" className="px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-xs">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* CHANNEL BANNER */}
      <div className="w-full h-40 sm:h-56 md:h-64 rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 via-brand-950/60 to-neutral-900 border border-white/10 relative shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/20 via-transparent to-transparent" />
      </div>

      {/* CHANNEL HEADER INFO */}
      <div className="px-2 md:px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 relative z-10 pb-6 border-b border-white/10">
          <div className="flex items-end gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-[#050505] bg-neutral-800 shadow-2xl flex items-center justify-center shrink-0">
              {channelData.avatar_url ? (
                <img
                  src={getThumbnailUrl(channelData.avatar_url)}
                  alt={channelData.channel_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl sm:text-4xl font-black text-white font-display">
                  {getInitials()}
                </span>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="space-y-1.5 pb-1">
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight font-display flex items-center gap-2">
                <span>{channelData.channel_name}</span>
                <CheckCircle2 size={18} className="text-brand-400 shrink-0" />
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-400">
                <span>{channelData.subscriberCount || 0} subscriber</span>
                <span>•</span>
                <span>{videos.length} video</span>
                <span>•</span>
                <span>{formatViews(channelData.total_views)}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isOwnChannel ? (
              <Link
                to="/settings"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-2xl border border-white/10 transition-colors"
              >
                <Settings size={15} />
                <span>Pengaturan Profil</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleToggleSubscribe}
                disabled={subscribing}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 ${
                  channelData.isSubscribed
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/25'
                }`}
              >
                {subscribing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : channelData.isSubscribed ? (
                  'Sudah Subscribed'
                ) : (
                  'Subscribe'
                )}
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-8 border-b border-white/10 pt-4">
          <button
            onClick={() => setActiveTab('Video')}
            className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${
              activeTab === 'Video' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span>Semua Video</span>
            {activeTab === 'Video' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_8px_#3b82f6]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('Tentang')}
            className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${
              activeTab === 'Tentang' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span>Tentang Channel</span>
            {activeTab === 'Tentang' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_8px_#3b82f6]" />
            )}
          </button>
        </div>

        {/* TAB CONTENT: VIDEO */}
        {activeTab === 'Video' && (
          <div className="pt-6">
            {videos.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                <Video size={40} className="mx-auto text-neutral-600 mb-3" />
                <h3 className="text-base font-bold text-white">Belum Ada Video Publik</h3>
                <p className="text-neutral-500 text-xs mt-1 max-w-sm mx-auto">
                  Kreator ini belum mengunggah video atau semua video masih dalam proses.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
                {videos.map((video) => (
                  <Link
                    to={`/video/${video.id}`}
                    key={video.id}
                    className="group flex flex-col gap-3 outline-none"
                  >
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 group-hover:border-brand-500/50 transition-all duration-300 shadow-md">
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
                          <Play size={28} />
                        </div>
                      )}
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 px-1">
                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-brand-400 transition-colors">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        <span>{formatViews(video.views)}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(video.created_at)}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: TENTANG */}
        {activeTab === 'Tentang' && (
          <div className="pt-6 max-w-2xl space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <h3 className="text-base font-bold text-white">Statistik Channel</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white/5 space-y-1">
                  <span className="text-neutral-400">Total Video</span>
                  <p className="text-lg font-black text-white">{videos.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 space-y-1">
                  <span className="text-neutral-400">Total Tayangan</span>
                  <p className="text-lg font-black text-white">{formatViews(channelData.total_views)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 space-y-1">
                  <span className="text-neutral-400">Subscribers</span>
                  <p className="text-lg font-black text-white">{channelData.subscriberCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
