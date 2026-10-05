import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || (await readFile('.env.local', 'utf8').catch(() => '')).match(/^VITE_FIREBASE_PROJECT_ID\s*=\s*["']?([a-z0-9-]+)/m)?.[1];
if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) throw new Error('Konfigurasi proyek Firebase diperlukan untuk skrip backup Drive.');
const compiled = await build({ entryPoints: ['src/data.ts'], bundle: true, format: 'cjs', write: false, platform: 'node' });
const module = { exports: {} };
new Function('module', 'exports', compiled.outputFiles[0].text)(module, module.exports);
const { STAGES_DATA, DEFAULT_CLASS_CONFIGS } = module.exports;
const worker = await readFile('google-apps-script-sync.js', 'utf8');
const constants = `var JM_PROJECT_ID = ${JSON.stringify(projectId)};\nvar JM_STAGE_DEFINITIONS = ${JSON.stringify(STAGES_DATA)};\nvar JM_DEFAULT_SETTINGS = ${JSON.stringify({ classNames: DEFAULT_CLASS_CONFIGS, allowEarlyPhaseTwo: false })};\n\n`;
await writeFile('public/drive-backup-worker.gs', constants + worker);
await writeFile('public/drive-backup-manifest.json', JSON.stringify({ timeZone: 'Asia/Jakarta', exceptionLogging: 'STACKDRIVER', runtimeVersion: 'V8', oauthScopes: [
  'https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/script.external_request', 'https://www.googleapis.com/auth/script.scriptapp',
] }, null, 2) + '\n');
