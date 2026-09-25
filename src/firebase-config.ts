export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0);
export const firebaseConfigIncomplete = Object.values(firebaseConfig).some((value) => typeof value === 'string' && value.length > 0) && !firebaseEnabled;
export const teacherEmail = 'andy.wbowo@gmail.com';
