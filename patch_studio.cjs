const fs = require('fs');
let code = fs.readFileSync('src/pages/Studio.tsx', 'utf-8');
const search = `          <Link 
            to="/upload"`;
const replace = `          {/* Tombol Akses Live Studio Baru (Tahap 43.2) */}
          <Link 
            to="/live-studio"
            className="flex-1 md:flex-none bg-red-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-2xl shadow-red-500/30 flex items-center justify-center gap-3 active:scale-95 hover:scale-[1.02]"
          >
            <span className="text-lg">🔴</span> 
            <span>Go Live</span>
          </Link>
          <Link 
            to="/upload"`;
code = code.replace(search, replace);
fs.writeFileSync('src/pages/Studio.tsx', code);
