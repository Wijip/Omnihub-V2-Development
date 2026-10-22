import blessed from 'blessed';
// @ts-ignore (Karena modul contrib terkadang tidak memiliki deklarasi tipe yang lengkap)
import contrib from 'blessed-contrib';
import os from 'os';
import { exec, spawn } from 'child_process';

export const screen = blessed.screen({ smartCSR: true, title: 'OmniHub Server Control Center' });
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// 1. KOTAK LOG (Di tengah bawah)
export const logBox = grid.set(4, 0, 8, 12, contrib.log, {
  fg: "green",
  selectedFg: "green",
  label: ' Server & FFmpeg Logs ',
  border: { type: 'line', fg: 'cyan' }
});

// --- BOTTOM ACTION BAR PANEL (RESPONSIVE ANCHORED) ---
const actionBox = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  shrink: false,
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' },
    bg: 'blue',
    fg: 'white'
  },
  content: ' [1] Maintenance Mode  [2] Bersihkan Temp  [3] Shutdown Aman  [4] Restart Server'
});

// Pastikan Log Box dikunci bagian bawahnya di atas actionBox (bottom: 3)
if (typeof logBox !== 'undefined' && logBox) {
  logBox.position.bottom = 3;
}

// Keypress Event Handlers
screen.key(['1'], () => {
  (global as any).isMaintenance = !(global as any).isMaintenance;
  const status = (global as any).isMaintenance ? 'AKTIF' : 'NON-AKTIF';
  logBox.log(`[SYSTEM] Status Maintenance Mode: ${status}`);
  screen.render();
});

screen.key(['2'], () => {
  logBox.log('[SYSTEM] Memulai pembersihan berkas temporary...');
  // Pembersihan cache/temp
  logBox.log('[SYSTEM] Pembersihan berkas temporary selesai.');
  screen.render();
});

screen.key(['3'], () => {
  logBox.log('[SYSTEM] Memulai proses Shutdown Aman...');
  screen.render();
  if (typeof (global as any).gracefulShutdown === 'function') {
    (global as any).gracefulShutdown();
  } else {
    process.exit(0);
  }
});

// --- TOMBOL [4] RESTART SERVER (STAGE 1.10 CLEAN REBOOT) ---
screen.key(['4'], () => {
  logBox.log('[SYSTEM] 🔄 Memulai Ulang (Restart) Server OmniHub...');
  screen.render();
  
  setTimeout(() => {
    try {
      // Lepaskan layar terminal blessed agar tidak mengunci stdout/stdin
      screen.destroy();
    } catch (e) {
      /* ignore */
    }

    const isWindows = process.platform === 'win32';

    // Re-spawn proses server dengan shell wrapper untuk automatic reboot
    const child = spawn(process.argv[0], process.argv.slice(1), {
      cwd: process.cwd(),
      detached: true,
      stdio: 'inherit',
      shell: isWindows
    });

    child.unref();
    process.exit(0);
  }, 500);
});

// 2. GRAFIK CPU & RAM (Kiri Atas)
const cpuLine = grid.set(0, 0, 4, 6, contrib.line, {
  style: { line: "yellow", text: "green", baseline: "black" },
  xLabelPadding: 0,
  xPadding: 0,
  showLegend: false, // Dihilangkan agar grafik lebih lebar dan bersih ala btop
  wholeNumbersOnly: false,
  label: ' Menghitung Telemetri... '
});

// 3. TELEMETRI GPU NVENC (Kanan Atas)
const gpuBox = grid.set(0, 6, 4, 6, blessed.box, {
  label: ' NVIDIA NVENC Monitor ',
  content: '\n  Menunggu pembacaan sensor...',
  style: { fg: 'white', border: { fg: 'cyan' } }
});

// Variabel Penampung Data Grafik
const cpuData = { title: 'CPU', x: [] as string[], y: [] as number[], style: { line: 'red' } };
const ramData = { title: 'RAM', x: [] as string[], y: [] as number[], style: { line: 'blue' } };

// Kalkulator CPU khusus Windows (process.cpuUsage delta)
let lastCpuInfo: { idle: number, total: number } | null = null;
let lastCpuUsage = process.cpuUsage();
let lastTime = process.hrtime();

// --- RENDER PANELS TERMINAL REVISED (TAHAP 49 / 55.2) ---
// Helper Format Speed (Kbps vs Mbps berdasarkan Ambang Batas 1500 Kbps)
const formatNetworkSpeed = (bitsPerSec: number): string => {
  const kbps = bitsPerSec / 1000;
  if (kbps < 1500) {
    return `${kbps.toFixed(1)} Kbps`;
  } else {
    const mbps = kbps / 1000;
    return `${mbps.toFixed(2)} Mbps`;
  }
};

// Helper Format Total Data (MB vs GB berdasarkan Ambang Batas 1024 MB)
const formatTotalData = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  } else {
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }
};

let screenInitialized = false;

export function initDashboard() {
  if (screenInitialized) return;
  screenInitialized = true;

  // --- STAGE 1.11: COMPLETE CONSOLE & STDOUT INTERCEPTOR ---
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);

  const safeLogToBox = (msg: string, color?: string) => {
    if (!logBox) return;
    const cleanMsg = msg.replace(/\r?\n$/, '');
    if (!cleanMsg.trim()) return;

    if (color) {
      logBox.log(`{${color}-fg}${cleanMsg}{/${color}-fg}`);
    } else {
      logBox.log(cleanMsg);
    }
    screen.render();
  };

  console.log = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    safeLogToBox(msg);
  };

  console.error = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    safeLogToBox(msg, 'red');
  };

  console.warn = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    safeLogToBox(msg, 'yellow');
  };

  // Intercept direct stdout.write from external libraries (e.g., Node-Media-Server)
  process.stdout.write = (chunk: any, ...args: any[]): boolean => {
    if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
      const str = chunk.toString();
      // Bypass internal ANSI render sequences from blessed
      if (str.includes('\x1b[')) {
        return originalStdoutWrite(chunk, ...args);
      }
      safeLogToBox(str);
      return true;
    }
    return originalStdoutWrite(chunk, ...args);
  };

  // Auto re-render canvas on terminal window resize
  screen.on('resize', () => {
    screen.render();
  });

  (global as any).renderDashboard = () => {
    screen.render();
  };

  setInterval(() => {
    // -- Sensor RAM --
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

    // -- Sensor CPU Akurat Windows --
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) {
            total += cpu.times[type as keyof typeof cpu.times];
        }
        idle += cpu.times.idle;
    }
    let cpuPercent = 0;
    if (lastCpuInfo) {
      const idleDelta = idle - lastCpuInfo.idle;
      const totalDelta = total - lastCpuInfo.total;
      cpuPercent = 100 - (100 * idleDelta / totalDelta);
      if (cpuPercent < 0) cpuPercent = 0;
      if (cpuPercent > 100) cpuPercent = 100;
    }
    lastCpuInfo = { idle, total };

    // Update Label ala Btop (Informasi angka real-time di bingkai atas)
    cpuLine.setLabel(` CPU: ${cpuPercent.toFixed(1)}% (Merah) | RAM: ${usedMemPercent.toFixed(1)}% (Biru) `);

    // Gunakan string kosong agar grafik mengalir mulus tanpa teks bergeser
    cpuData.x.push(' ');
    cpuData.y.push(cpuPercent);
    ramData.x.push(' ');
    ramData.y.push(usedMemPercent);

    // Memperpanjang jejak grafik (30 detik)
    if (cpuData.x.length > 30) { cpuData.x.shift(); cpuData.y.shift(); }
    if (ramData.x.length > 30) { ramData.x.shift(); ramData.y.shift(); }
    
    cpuLine.setData([cpuData, ramData]);

    // -- Sensor GPU (Nvidia SMI) --
    if (process.platform === 'win32') {
        // Query Presisi NVENC Encoder & GPU Core (Tahap 49)
        exec('nvidia-smi --query-gpu=utilization.gpu,utilization.encoder,temperature.gpu,memory.used,memory.total --format=csv,noheader,nounits', (err, stdout) => {
        const liveStatus = (global as any).isStreamActive 
          ? `{red-fg}🔴 [LIVE] ${(global as any).currentStreamKey}{/red-fg}` 
          : `⚪ [LIVE] OFFLINE`;
          
        const currentRxBitsPerSec = (global as any).currentRxBitsPerSec || 0;
        const currentTxBitsPerSec = (global as any).currentTxBitsPerSec || 0;
        const totalBytesRx = (global as any).totalBytesRx || 0;
        const totalBytesTx = (global as any).totalBytesTx || 0;
        
        // Panel Network Info Teks
        const netInfo = `🌐 NETWORK TRAFFIC:
 ⬇️ Down Speed : ${formatNetworkSpeed(currentRxBitsPerSec)} | Total Rx : ${formatTotalData(totalBytesRx)}
 ⬆️ Up Speed   : ${formatNetworkSpeed(currentTxBitsPerSec)} | Total Tx : ${formatTotalData(totalBytesTx)}`;

        if (!err && stdout) {
            const [util, encUtil, temp, memUsed, memTotal] = stdout.trim().split(', ');
            gpuBox.setContent(`\n  GPU : ${util}% | NVENC : ${encUtil}%\n  Temp: ${temp} C | VRAM: ${memUsed}/${memTotal} MB\n\n  ${netInfo}\n\n  ${liveStatus}`);
        } else {
            gpuBox.setContent(`\n  [ERROR] Tidak dapat membaca sensor NVIDIA\n\n  ${netInfo}\n\n  ${liveStatus}`);
        }
        screen.render();
        });
    } else {
        const liveStatus = (global as any).isStreamActive 
          ? `{red-fg}🔴 [LIVE] ${(global as any).currentStreamKey}{/red-fg}` 
          : `⚪ [LIVE] OFFLINE`;
          
        const currentRxBitsPerSec = (global as any).currentRxBitsPerSec || 0;
        const currentTxBitsPerSec = (global as any).currentTxBitsPerSec || 0;
        const totalBytesRx = (global as any).totalBytesRx || 0;
        const totalBytesTx = (global as any).totalBytesTx || 0;
        
        const netInfo = `🌐 NETWORK TRAFFIC:
 ⬇️ Down Speed : ${formatNetworkSpeed(currentRxBitsPerSec)} | Total Rx : ${formatTotalData(totalBytesRx)}
 ⬆️ Up Speed   : ${formatNetworkSpeed(currentTxBitsPerSec)} | Total Tx : ${formatTotalData(totalBytesTx)}`;

        gpuBox.setContent(`\n  [INFO] NVIDIA SMI khusus OS Windows.\n\n  ${netInfo}\n\n  ${liveStatus}`);
        screen.render();
    }

    screen.render();
  }, 2000);

  // Pencegahan Force Close: Hapus 'q' dan arahkan Ctrl+C ke Shutdown Aman
  screen.key(['escape', 'C-c'], function() {
    logBox.log('{yellow-fg}[SISTEM] Mencegah Force Close. Mengalihkan ke Shutdown Aman...{/yellow-fg}');
    if ((global as any).gracefulShutdown) {
      (global as any).gracefulShutdown();
    } else {
      process.exit(0);
    }
  });

  screen.render();
}
