import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
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

const TOPIC_CHIPS = [
  { id: 'all', label: 'Semua' },
  { id: 'trending', label: 'Populer & Trending', sort: 'trending' },
  { id: 'arduino', label: 'Arduino', category: 'arduino' },
  { id: 'robotika', label: 'Robotika', category: 'robotika' },
  { id: 'python', label: 'Python & Coding', category: 'python' },
  { id: 'web', label: 'Web & Desain', category: 'web' },
  { id: 'edukasi', label: 'Edukasi', category: 'edukasi' },
  { id: 'latest', label: 'Baru Diunggah', sort: 'latest' },
];

export default function HomePage({ searchQuery = '', isSearching = false, setIsSearching = () => {} }: any) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChip, setActiveChip] = useState('all');

  // Horizontal Scroll Carousel State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [videos]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  // Fetch Videos (Berdasarkan Search Query atau Topic Chip yang Dipilih)
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      setIsSearching(true);
      const delayDebounce = setTimeout(() => {
        api.get(`/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => {
            setVideos(Array.isArray(res.data) ? res.data : []);
          })
          .catch(err => console.error('Pencarian gagal:', err))
          .finally(() => {
            setIsSearching(false);
            setLoading(false);
          });
      }, 400);

      return () => clearTimeout(delayDebounce);
    }

    setIsSearching(false);
    setLoading(true);

    const chip = TOPIC_CHIPS.find(c => c.id === activeChip);
    let endpoint = '/videos';

    if (chip?.sort === 'trending') {
      endpoint = '/videos?sort=trending';
    } else if (chip?.category) {
      endpoint = `/videos?category=${chip.category}`;
    }

    api.get(endpoint)
      .then(res => {
        setVideos(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error("Gagal memuat video:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchQuery, activeChip]);

  return (
    <div className="w-full space-y-6">
      {/* YOUTUBE-STYLE TOPIC CHIPS BAR (Hanya muncul jika tidak sedang mencari keyword) */}
      {!searchQuery && (
        <div className="relative -mt-2 -mx-2 px-2 sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-md pb-2 pt-1 border-b border-white/5">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center h-full pr-6 pl-2 bg-gradient-to-r from-[#09090b] via-[#09090b]/90 to-transparent">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="w-8 h-8 rounded-full bg-neutral-800/90 hover:bg-neutral-700 text-white flex items-center justify-center transition-all shadow-lg active:scale-90 border border-white/10"
                title="Gulir ke kiri"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}

          {/* Chips Scrollable Container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1"
          >
            {TOPIC_CHIPS.map((chip) => {
              const isActive = activeChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveChip(chip.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 shrink-0 select-none ${
                    isActive
                      ? 'bg-white text-neutral-900 shadow-md font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5 hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Right Arrow Button */}
          {canScrollRight && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center h-full pl-6 pr-2 bg-gradient-to-l from-[#09090b] via-[#09090b]/90 to-transparent">
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="w-8 h-8 rounded-full bg-neutral-800/90 hover:bg-neutral-700 text-white flex items-center justify-center transition-all shadow-lg active:scale-90 border border-white/10"
                title="Gulir ke kanan"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* SKELETON GRID LOADING STATE */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-5 md:gap-y-10 pt-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse flex flex-col gap-3">
              <div className="w-full aspect-video bg-white/5 rounded-2xl border border-white/5" />
              <div className="flex gap-3 px-1">
                <div className="w-9 h-9 bg-white/5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIDEO GRID (YOUTUBE-STYLE CARDS DENGAN INTERAKTIVITAS TAHAP 4) */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-5 md:gap-y-10 pt-2">
          {videos.map((video: any) => (
            <VideoCard key={video.id} video={video} />
          ))}

          {/* EMPTY STATE */}
          {videos.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-neutral-500">
                <span className="text-3xl">📭</span>
              </div>
              <h2 className="text-white font-bold text-base md:text-lg">Tidak ada video pada kategori ini</h2>
              <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-sm">
                Belum ada video yang diunggah untuk kategori ini. Coba pilih kategori lain atau unggah video baru!
              </p>
              <button
                onClick={() => setActiveChip('all')}
                className="mt-5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Kembali ke Semua Video
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
