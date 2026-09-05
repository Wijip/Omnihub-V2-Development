const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace declarations
const regex = /const UPLOAD_DIR = path\.join\(process\.cwd\(\), 'uploads'\);\nconst THUMBNAIL_DIR = path\.join\(process\.cwd\(\), 'thumbnails'\);\nconst PROCESSED_DIR = process\.platform === 'win32' \? 'F:\\\\WEB\\\\Omnihub\\\\processed' : path\.join\(process\.cwd\(\), 'processed'\);\nconst CHUNK_DIR = path\.join\(process\.cwd\(\), 'chunks'\);\nconst LOG_DIR = process\.platform === 'win32' \? 'F:\\\\WEB\\\\Omnihub\\\\logs' : path\.join\(process\.cwd\(\), 'logs'\);\n\n\/\/ Pastikan semua direktori eksis\n\[UPLOAD_DIR, THUMBNAIL_DIR, PROCESSED_DIR, CHUNK_DIR, LOG_DIR\]\.forEach\(dir => {\n  if \(!fs\.existsSync\(dir\)\) fs\.mkdirSync\(dir, { recursive: true }\);\n}\);/g;

const rootCode = `const ROOT_DIR = process.cwd();

const OMNIHUB_DIRS = {
  uploads: path.join(ROOT_DIR, 'uploads'),
  thumbnails: path.join(ROOT_DIR, 'thumbnails'),
  processed: path.join(ROOT_DIR, 'processed'),
  deleted: path.join(ROOT_DIR, 'deleted'),
  chunks: path.join(ROOT_DIR, 'chunks'),
  logs: path.join(ROOT_DIR, 'logs')
};

Object.entries(OMNIHUB_DIRS).forEach(([key, folderPath]) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(\`[STORAGE INIT] Folder '\${key}' berhasil dibuat otomatis di: \${folderPath}\`);
  }
});`;

code = code.replace(regex, rootCode);

// Replace usages
code = code.replace(/\bUPLOAD_DIR\b/g, 'OMNIHUB_DIRS.uploads');
code = code.replace(/\bTHUMBNAIL_DIR\b/g, 'OMNIHUB_DIRS.thumbnails');
code = code.replace(/\bPROCESSED_DIR\b/g, 'OMNIHUB_DIRS.processed');
code = code.replace(/\bCHUNK_DIR\b/g, 'OMNIHUB_DIRS.chunks');
code = code.replace(/\bLOG_DIR\b/g, 'OMNIHUB_DIRS.logs');

code = code.replace(`path.join(\n    process.cwd(), 'deleted'`, `path.join(\n    OMNIHUB_DIRS.deleted`);

fs.writeFileSync('server.ts', code);
console.log('Replacement done.');
