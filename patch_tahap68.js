import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// Patch 1: Extract rotation
const probeStart = `      let sourceHeight = 0;
      let sourceWidth = 0;
      if (metadataStr && metadataStr.streams) {
        const videoStream = metadataStr.streams.find((s: any) => s.codec_type === 'video');
        if (videoStream) {
          sourceHeight = videoStream.height || 0;
          sourceWidth = videoStream.width || 0;
          console.log(\`[SYSTEM] Detected source video resolution: \${sourceWidth}x\${sourceHeight}\`);
        }
      }`;

const probeReplace = `      let sourceHeight = 0;
      let sourceWidth = 0;
      let sourceRotation = 0;
      if (metadataStr && metadataStr.streams) {
        const videoStream = metadataStr.streams.find((s: any) => s.codec_type === 'video');
        if (videoStream) {
          sourceHeight = videoStream.height || 0;
          sourceWidth = videoStream.width || 0;
          sourceRotation = videoStream.side_data_list?.find((sd: any) => sd.rotation)?.rotation || 0;
          if (videoStream.tags && videoStream.tags.rotate) {
            sourceRotation = parseInt(videoStream.tags.rotate, 10);
          }
          console.log(\`[SYSTEM] Detected source video resolution: \${sourceWidth}x\${sourceHeight}, rotation: \${sourceRotation}\`);
        }
      }`;

// Patch 2: buildPureGPUVRAMArgs signature and logic
const buildStart = `        // --- TAHAP 67.0: ASPECT RATIO SAFEGUARD ---
        const buildPureGPUVRAMArgs = (inputPath: string, outputPath: string, targetResName: string, srcW: number, srcH: number) => {
          const profile = RESOLUTION_PROFILES[targetResName] || RESOLUTION_PROFILES['720p'];
          const isVertical = srcH > srcW;
          const scaleFilter = isVertical 
            ? \`scale_cuda=-2:\${profile.height}\` 
            : \`scale_cuda=\${profile.width}:-2\`;`;

const buildReplace = `        // --- TAHAP 68.0: DETEKSI ORIENTASI & DYNAMIC SCALING SAFEGUARD ---
        const buildPureGPUVRAMArgs = (inputPath: string, outputPath: string, targetResName: string, srcW: number, srcH: number, srcRotation: number) => {
          const profile = RESOLUTION_PROFILES[targetResName] || RESOLUTION_PROFILES['720p'];
          
          // Tahap 68.1: Cek apakah video berorientasi Portrait / Vertical (termasuk tag rotasi 90°/270°)
          const isPortrait = (srcH > srcW) || Math.abs(srcRotation) === 90 || Math.abs(srcRotation) === 270;

          // Tahap 68.2: Tentukan filter scale presisi tanpa merusak aspect ratio
          // Kalkulasi TS manual digunakan agar kompatibel dengan scale_cuda hardware-accelerated filter
          const targetH = Math.min(srcH || profile.height, profile.height);
          const targetW = Math.min(srcW || profile.width, profile.width);
          
          const scaleFilter = isPortrait 
            ? \`scale_cuda=-2:\${targetH}\` 
            : \`scale_cuda=\${targetW}:-2\`;`;

// Patch 3: Update buildPureGPUVRAMArgs call
const callStart = `const args = buildPureGPUVRAMArgs(inputPath, outputPath, targetResName, sourceWidth, sourceHeight);`;
const callReplace = `const args = buildPureGPUVRAMArgs(inputPath, outputPath, targetResName, sourceWidth, sourceHeight, sourceRotation);`;

code = code.replace(probeStart, probeReplace);
code = code.replace(buildStart, buildReplace);
code = code.replace(callStart, callReplace);

fs.writeFileSync('server.ts', code);
console.log('Tahap 68 applied!');
