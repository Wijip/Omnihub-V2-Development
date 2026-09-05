const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
appCode = appCode.replace('<Route path="/live-studio"', '<Route path="/studio/live"');
fs.writeFileSync('src/App.tsx', appCode);

// Patch Studio.tsx
let studioCode = fs.readFileSync('src/pages/Studio.tsx', 'utf-8');
studioCode = studioCode.replace('to="/live-studio"', 'to="/studio/live"');
fs.writeFileSync('src/pages/Studio.tsx', studioCode);

// Patch Sidebar.tsx
let sidebarCode = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');
sidebarCode = sidebarCode.replace(
  '<SidebarItem to="/upload" icon={<Upload size={20} />} label="Upload Video" />',
  '<SidebarItem to="/upload" icon={<Upload size={20} />} label="Upload Video" />\n            <SidebarItem to="/studio/live" icon={<span className="text-lg leading-none">🔴</span>} label="Go Live" />'
);
fs.writeFileSync('src/components/Sidebar.tsx', sidebarCode);
