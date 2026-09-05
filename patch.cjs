const fs = require('fs');
const content = fs.readFileSync('src/pages/Upload.tsx', 'utf8');

const target = `  const handleFileSelect = (e: any) => {
    const selectedFiles = Array.from(e.target.files);
    const draftText = localStorage.getItem('omnihub_upload_draft');
    const drafts = draftText ? JSON.parse(draftText) : [];

    const newFiles = selectedFiles.map((file: any, index: number) => {
      const draft = drafts[index] || {};
      return {
        file: file,
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : \`item_\${Date.now()}_\${Math.random()}\`,
        title: file.name,
        description: draft.description || '',
        visibility: draft.visibility || 'public',
        categoryId: draft.categoryId || '1',
        allowDownload: draft.allowDownload !== undefined ? draft.allowDownload : true,
      };
    });

    setFiles([...files, ...newFiles]);
  };`;

const replacement = `// --- INSTANT LOCAL VIDEO FRAME EXTRACTOR (TAHAP 55.5) ---
const generateLocalVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    // Ambil sampel frame pada detik ke 1.0 untuk menghindari black frame awal
    video.onloadeddata = () => {
      video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
          return;
        }
      } catch (e) {
        console.error("Failed to capture video frame:", e);
      }
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };
  });
};

  // --- ENHANCED MULTI-FILE SELECTION HANDLER (TAHAP 55.5) ---
  const handleFileSelect = async (e: any) => {
    const selectedFiles = Array.from(e.target.files) as File[];
    if (selectedFiles.length === 0) return;

    const draftText = localStorage.getItem('omnihub_upload_draft');
    const drafts = draftText ? JSON.parse(draftText) : [];

    const newFiles = await Promise.all(
      selectedFiles.map(async (file: File, index: number) => {
        const draft = drafts[index] || {};
        const localPreviewUrl = URL.createObjectURL(file);
        const generatedThumb = await generateLocalVideoThumbnail(file);

        return {
          file: file,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : \`item_\${Date.now()}_\${Math.random()}\`,
          title: file.name.replace(/\\.[^/.]+$/, ''), // Judul default dari nama file
          description: draft.description || '',
          visibility: draft.visibility || 'public',
          categoryId: draft.categoryId || '1',
          allowDownload: draft.allowDownload !== undefined ? draft.allowDownload : true,
          sizeFormatted: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
          localPreviewUrl: localPreviewUrl,
          thumbnailUrl: generatedThumb || localPreviewUrl,
        };
      })
    );

    setFiles((prev: any[]) => [...prev, ...newFiles]);
  };`;

if (content.includes(target)) {
  fs.writeFileSync('src/pages/Upload.tsx', content.replace(target, replacement));
  console.log('Success');
} else {
  console.log('Target not found, printing some lines around 50');
  const lines = content.split('\n');
  console.log(lines.slice(45, 75).join('\n'));
}
