// App.tsx
import { Routes, Route, useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Video, Upload, Settings, Compass, List, History, ThumbsUp, Clock, BarChart2, Search, User, LogOut, Menu, X, CheckCircle2, Sparkles, Plus, Radio } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import api from './lib/api';

import { MobileNavigation } from './components/MobileNavigation';

import ErrorBoundary from './components/ErrorBoundary';
import ProfileMenu from './components/ProfileMenu';
import { SearchBar } from './components/SearchBar';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';

// Pages
import HomePage from './pages/Home';
import VideoDetailPage from './pages/VideoDetail';
import UploadPage from './pages/Upload';
import AuthPage from './pages/Auth';
import ResetStatusPage from './pages/ResetStatus';
import AdminPage from './pages/Admin';
import PlaylistsPage from './pages/Playlists';
import PlaylistDetailPage from './pages/PlaylistDetail';
import AnalyticsPage from './pages/Analytics';
import StudioPage from './pages/Studio';
import LiveStudio from "./pages/LiveStudio";
import Channel from './pages/Channel';
import SystemLogsPage from './pages/SystemLogs';
import AccountSettings from './pages/AccountSettings';

import CreatorStudio from './pages/CreatorStudio';
import HistoryPage from './pages/History';
import ExplorePage from './pages/Explore';
import LikedVideosPage from './pages/LikedVideos';
import WatchLaterPage from './pages/WatchLater';
import ErrorPage from './pages/ErrorPage';

import { UploadProvider } from './contexts/UploadContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function MiniRailItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      title={label}
      className={cn(
        "flex flex-col items-center justify-center py-3.5 px-1 rounded-xl transition-all group w-full",
        isActive
          ? "bg-white/10 text-brand-400 font-bold"
          : "text-neutral-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn("transition-transform duration-200 group-hover:scale-110", isActive && "scale-110 text-brand-400")}>
        {icon}
      </div>
      <span className={cn("text-[10px] mt-1.5 truncate max-w-[64px] text-center leading-tight tracking-tight", isActive ? "text-white font-bold" : "text-neutral-400")}>
        {label}
      </span>
    </Link>
  );
}

function SidebarItem({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 py-2.5 px-3.5 rounded-xl transition-all font-bold text-sm group",
        isActive 
          ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" 
          : "text-neutral-300 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn("transition-transform duration-200 group-hover:scale-110", isActive && "scale-105")}>
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="px-3.5 pt-4 pb-1 text-[11px] font-black uppercase tracking-wider text-neutral-500">
      {title}
    </div>
  );
}

const NavLinks = ({ user, onItemClick }: { user: any; onItemClick?: () => void }) => (
  <>
    <SidebarItem to="/" icon={<Home size={20} />} label="Beranda" onClick={onItemClick} />
    <SidebarItem to="/explore" icon={<Compass size={20} />} label="Explore & Trending" onClick={onItemClick} />
    
    {user && (
      <>
        <div className="h-px bg-white/10 my-2 mx-2" />
        <SectionHeading title="Koleksi Anda" />
        <SidebarItem to="/playlists" icon={<List size={20} />} label="Playlists" onClick={onItemClick} />
        <SidebarItem to="/history" icon={<History size={20} />} label="Riwayat Tontonan" onClick={onItemClick} />
        <SidebarItem to="/liked" icon={<ThumbsUp size={20} />} label="Video yang Disukai" onClick={onItemClick} />
        <SidebarItem to="/watch-later" icon={<Clock size={20} />} label="Tonton Nanti" onClick={onItemClick} />

        <div className="h-px bg-white/10 my-2 mx-2" />
        <SectionHeading title="Studio & Kreator" />
        <SidebarItem to="/upload" icon={<Upload size={20} />} label="Upload Video" onClick={onItemClick} />
        <SidebarItem to="/studio/live" icon={<Radio size={20} className="text-rose-500" />} label="Go Live" onClick={onItemClick} />
        <SidebarItem to="/creator-studio" icon={<BarChart2 size={20} />} label="Creator Studio" onClick={onItemClick} />
        <SidebarItem to="/studio" icon={<Video size={20} />} label="Video Manager" onClick={onItemClick} />
      </>
    )}

    {user?.role === 'admin' && (
      <>
        <div className="h-px bg-white/10 my-2 mx-2" />
        <SectionHeading title="Administrator" />
        <SidebarItem to="/admin" icon={<BarChart2 size={20} />} label="Admin Dashboard" onClick={onItemClick} />
        <SidebarItem to="/admin/logs" icon={<Settings size={20} />} label="System Health" onClick={onItemClick} />
      </>
    )}
  </>
);

function DesktopSidebar({ user, isCollapsed }: { user: any; isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <aside className="w-[72px] h-full bg-[#0f0f0f] border-r border-white/10 flex flex-col items-center py-2 px-1 gap-1 overflow-y-auto no-scrollbar hidden md:flex shrink-0 z-40 transition-all duration-300">
        <MiniRailItem to="/" icon={<Home size={22} />} label="Beranda" />
        <MiniRailItem to="/explore" icon={<Compass size={22} />} label="Explore" />
        {user && (
          <>
            <MiniRailItem to="/playlists" icon={<List size={22} />} label="Playlists" />
            <MiniRailItem to="/history" icon={<History size={22} />} label="History" />
            <MiniRailItem to="/liked" icon={<ThumbsUp size={22} />} label="Disukai" />
            <MiniRailItem to="/watch-later" icon={<Clock size={22} />} label="Nanti" />
          </>
        )}
        {user?.role === 'admin' && (
          <MiniRailItem to="/admin" icon={<BarChart2 size={22} />} label="Admin" />
        )}
      </aside>
    );
  }

  return (
    <aside className="w-60 h-full bg-[#0f0f0f] border-r border-white/10 flex flex-col overflow-y-auto no-scrollbar hidden md:flex shrink-0 z-40 transition-all duration-300">
      <nav className="flex-1 p-3 flex flex-col gap-1">
        <NavLinks user={user} />
      </nav>
    </aside>
  );
}

interface ToastItem {
  id: string;
  title: string;
  videoTitle: string;
}

export default function App() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const notifiedTaskIds = useRef<Set<string>>(new Set());

  // --- GLOBAL TOAST MONITORING ENGINE (TAHAP 54.13) ---
  useEffect(() => {
    const checkReadyTasks = () => {
      try {
        const raw = localStorage.getItem('active_upload_tasks');
        if (!raw) return;

        const tasks = JSON.parse(raw);
        if (!Array.isArray(tasks)) return;

        tasks.forEach((task: any) => {
          if (task.status === 'ready' && !notifiedTaskIds.current.has(task.id)) {
            notifiedTaskIds.current.add(task.id);
            triggerToast(task.title || 'Video Tanpa Judul');
          }
        });
      } catch (e) {
        console.error("Global toast listener error:", e);
      }
    };

    const triggerToast = (videoTitle: string) => {
      const toastId = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastItem = {
        id: toastId,
        title: 'Video Successfully Published',
        videoTitle: videoTitle
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss setelah 4 detik
      setTimeout(() => {
        removeToast(toastId);
      }, 4000);
    };

    // Dengarkan event instan dan interval sync
    window.addEventListener('upload_task_updated', checkReadyTasks);
    const interval = setInterval(checkReadyTasks, 500);

    return () => {
      window.removeEventListener('upload_task_updated', checkReadyTasks);
      clearInterval(interval);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- PERSISTENT USER AUTH STATE (TAHAP 58.3) ---
  const [user, setUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem('omnihub_user') || localStorage.getItem('user');
      return savedUser && savedUser !== 'undefined' && savedUser !== 'null' ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('omnihub_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try { localStorage.setItem('omnihub_sidebar_collapsed', String(next)); } catch {}
        return next;
      });
    }
  };
  
  // Lifted Search State (Tahap 39.1)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // --- ADMIN IDLE AUTO-LOGOUT ENGINE (TAHAP 55.7) ---
  const ADMIN_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Jam inaktivitas

  useEffect(() => {
    // HANYA AKTIF JIKA USER ADALAH ADMIN
    if (!user || user.role !== 'admin') return;

    let idleTimer: NodeJS.Timeout;

    const performAutoLogout = () => {
      console.warn('[SECURITY] Sesi Admin berakhir karena tidak ada aktivitas selama 2 jam.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      alert('Sesi Admin Anda telah berakhir karena tidak ada aktivitas demi alasan keamanan. Silakan login kembali.');
      window.location.href = '/login';
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(performAutoLogout, ADMIN_IDLE_TIMEOUT_MS);
    };

    // Event listener aktivitas pengguna
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    // Jalankan timer pertama kali
    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [user]);

  // --- STRICT AUTH MOUNT VERIFIER (TAHAP 58.3) ---
  useEffect(() => {
    const verifyAuthOnBoot = async () => {
      const token = localStorage.getItem('omnihub_token') || localStorage.getItem('token');
      
      if (!token || token === 'null' || token === 'undefined') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
          // HANYA HAPUS SESI JIKA SERVER SECARA EKSPLISIT MENYATAKAN TOKEN INVALID (401)
          console.warn("[AUTH] Token kedaluwarsa. Melakukan logout...");
          localStorage.removeItem('omnihub_token');
          localStorage.removeItem('token');
          localStorage.removeItem('omnihub_user');
          localStorage.removeItem('user');
          setUser(null);
        } else if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            localStorage.setItem('omnihub_user', JSON.stringify(data.user));
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
        // Jika res.status 404, 500, atau network error -> PERTAHANKAN STATE LOCALSTORAGE LAMA
      } catch (err) {
        console.warn("[AUTH] Server tidak merespons, mempertahankan sesi lokal...");
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuthOnBoot();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-neutral-900 flex items-center justify-center text-brand-500 font-bold overflow-hidden">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p>Loading OmniHub...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <UploadProvider>
        <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0f0f0f] text-white font-sans">
        
        <AnimatePresence>
          {isNavigating && (
            <motion.div 
              initial={{ width: 0, opacity: 1 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="fixed top-0 left-0 h-1 bg-brand-500 z-[100] shadow-[0_0_10px_rgba(59,130,246,0.8)]"
            />
          )}
        </AnimatePresence>

        {/* TOP FULL-WIDTH YOUTUBE HEADER */}
        <header className="h-14 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-3 md:px-5 shrink-0 sticky top-0 z-50">
          {/* LEFT: HAMBURGER & LOGO */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={toggleSidebar}
              title="Menu Navigasi"
              className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
            >
              <Menu size={22} />
            </button>

            <Link to="/" className="flex items-center gap-2.5 text-white font-black text-xl tracking-tighter group">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-brand-500/30 group-hover:scale-105 transition-transform">
                <Video fill="currentColor" size={17} />
              </div>
              <span className="font-display font-black text-lg tracking-tight hidden xs:inline">OmniHub</span>
            </Link>
          </div>

          {/* CENTER: YOUTUBE SEARCH PILL */}
          <div className="flex-1 max-w-2xl mx-4 hidden sm:block">
            <SearchBar />
          </div>

          {/* RIGHT: CREATE + THEME + USER */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user && (
              <Link 
                to="/upload" 
                title="Upload Video"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all active:scale-95 shadow-sm"
              >
                <Plus size={16} className="text-brand-400" />
                <span className="hidden md:inline">Buat</span>
              </Link>
            )}

            <ThemeToggle />

            {user === null ? (
              <Link to="/auth" className="flex items-center gap-2 border border-brand-500/50 hover:bg-brand-500/10 text-brand-400 px-4 py-1.5 rounded-full font-bold transition-all active:scale-95 text-xs shadow-sm">
                <User size={15} />
                <span>Sign In</span>
              </Link>
            ) : (
              <div className="flex items-center">
                <ProfileMenu />
              </div>
            )}
          </div>
        </header>

        {/* BODY SHELL: SIDEBAR + CONTENT */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* MOBILE DRAWER */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] md:hidden"
                />
                <motion.aside
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 left-0 bottom-0 w-[260px] bg-[#0f0f0f] border-r border-white/10 z-[120] flex flex-col md:hidden overflow-hidden"
                >
                  <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
                    <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 text-white font-black text-xl tracking-tighter">
                      <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                        <Video fill="currentColor" size={16} />
                      </div>
                      <span className="text-white font-display text-lg">OmniHub</span>
                    </Link>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 no-scrollbar pb-safe">
                    <NavLinks user={user} onItemClick={() => setIsMobileMenuOpen(false)} />
                  </nav>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* DESKTOP SIDEBAR (EXPANDED OR MINI-RAIL) */}
          <DesktopSidebar user={user} isCollapsed={isSidebarCollapsed} />

          {/* MAIN PAGE CONTENT */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-8 relative bg-[#09090b]">
            <div className="max-w-[1920px] mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                      <ErrorBoundary>
                    <Routes location={location}>
                      {/* Public Routes */}
                      <Route path="/" element={<HomePage searchQuery={new URLSearchParams(location.search).get('q') || ''} isSearching={isSearching} setIsSearching={setIsSearching} />} />
                      <Route path="/search" element={<HomePage searchQuery={new URLSearchParams(location.search).get('q') || ''} isSearching={isSearching} setIsSearching={setIsSearching} />} />
                      <Route path="/explore" element={<ExplorePage />} />
                      <Route path="/home" element={<Navigate to="/" replace />} />
                      <Route path="/video/:id" element={<VideoDetailPage />} />
                      <Route path="/auth" element={<AuthPage setUser={setUser} />} />
                      <Route path="/reset-status" element={<ResetStatusPage />} />
                      <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
                      <Route path="/analytics/:id" element={<AnalyticsPage />} />
                      <Route path="/channel" element={<Channel />} />
                      <Route path="/channel/:id" element={<Channel />} />

                      {/* Protected Routes (RBAC) */}
                      <Route path="/upload" element={user ? <UploadPage /> : <Navigate to="/auth" replace />} />
                      <Route path="/studio" element={user ? <StudioPage /> : <Navigate to="/auth" replace />} />
                      <Route path="/studio/live" element={user ? <LiveStudio /> : <Navigate to="/auth" replace />} />
                      <Route path="/creator-studio" element={user ? <CreatorStudio /> : <Navigate to="/auth" replace />} />
                      <Route path="/playlists" element={user ? <PlaylistsPage /> : <Navigate to="/auth" replace />} />
                      <Route path="/history" element={user ? <HistoryPage /> : <Navigate to="/auth" replace />} />
                      <Route path="/liked" element={user ? <LikedVideosPage /> : <Navigate to="/auth" replace />} />
                      <Route path="/watch-later" element={user ? <WatchLaterPage /> : <Navigate to="/auth" replace />} />
                      <Route path="/settings" element={user ? <AccountSettings /> : <Navigate to="/auth" replace />} />
                      
                      {/* Admin Only Routes (RBAC) */}
                      <Route path="/admin" element={
                        user?.role === 'admin' ? <AdminPage /> : <Navigate to="/home" replace />
                      } />
                      <Route path="/admin/logs" element={
                        user?.role === 'admin' ? <SystemLogsPage /> : <Navigate to="/home" replace />
                      } />
                      <Route path="*" element={<ErrorPage type={404} />} />
                    </Routes>
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
        <MobileNavigation />
      </div>

      {/* FLOATING GLOBAL TOAST CONTAINER (TAHAP 54.13) */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto bg-neutral-900/90 dark:bg-black/90 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-start gap-3.5 relative overflow-hidden group"
            >
              {/* Highlight Glow Border Line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_12px_#10b981]" />

              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                <CheckCircle2 size={18} />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 text-xs font-black text-white font-display">
                  <span>{toast.title}</span>
                  <Sparkles size={12} className="text-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-neutral-300 font-medium truncate mt-0.5">
                  "{toast.videoTitle}" siap ditonton publik!
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-500 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      </UploadProvider>
    </ThemeProvider>
  );
}
