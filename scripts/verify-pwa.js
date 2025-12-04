import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const criticalFiles = [
  'public/service-worker.js',
  'src/utils/pwa-register.ts',
  'public/manifest.json'
];

const requiredContent = {
  'public/service-worker.js': ['CACHE_VERSION', 'skipWaiting', 'fetch', 'caches.open'],
  'src/utils/pwa-register.ts': ['beforeinstallprompt', 'deferredPrompt', 'prompt', 'userChoice'],
  'public/manifest.json': ['"name"', '"display"', '"icons"', '"start_url"']
};

let allGood = true;

console.log('🔍 Verifying PWA Critical Files...');

criticalFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ MISSING: ${file}`);
    allGood = false;
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const required = requiredContent[file] || [];

    const missingKeywords = required.filter(keyword => !content.includes(keyword));

    if (missingKeywords.length > 0) {
      console.error(`❌ ${file}: Corrupted or missing logic. Missing keywords: ${missingKeywords.join(', ')}`);
      allGood = false;
    } else {
      console.log(`✅ ${file} verified`);
    }
  } catch (err) {
    console.error(`❌ Error reading ${file}:`, err.message);
    allGood = false;
  }
});

if (!allGood) {
  console.error('\n⚠️  PWA Integrity Check Failed!');
  console.error('Do not commit broken PWA files. Restore from git or edit manually.');
  process.exit(1);
}

console.log('\n✨ PWA System Healthy');
