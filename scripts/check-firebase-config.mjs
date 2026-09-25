const keys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const configured = keys.filter((key) => Boolean(process.env[key]));
if (configured.length > 0 && configured.length !== keys.length) {
  throw new Error(`Konfigurasi Firebase belum lengkap: ${keys.filter((key) => !process.env[key]).join(', ')}`);
}
