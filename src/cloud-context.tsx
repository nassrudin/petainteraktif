import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { AppContext, AppContextType, DEFAULT_DRIVE_FOLDER_URL } from './context';
import { DEFAULT_CLASS_CONFIGS } from './data';
import { studentAuth, studentDb, teacherAuth, teacherDb } from './firebase';
import { firebaseConfig, teacherEmail } from './firebase-config';
import { ActiveStudent, AppSettings, Gender, StudentJourney } from './types';
import { sanitizeTextInput } from './utils/security';

interface CloudStudentRecord {
  ownerUid: string;
  student: ActiveStudent;
  journey: StudentJourney;
}

const defaultSettings: AppSettings = { classNames: DEFAULT_CLASS_CONFIGS, allowEarlyPhaseTwo: false };
const studentCollection = 'students';
const activeStudentKey = 'gm_active_student_v2';
let anonymousSignIn: Promise<unknown> | null = null;

function readLegacyStudents(): ActiveStudent[] {
  try {
    const value = JSON.parse(localStorage.getItem('gm_all_students_v2') || '[]');
    return Array.isArray(value) ? value.filter((student) => student && typeof student.id === 'string' &&
      typeof student.name === 'string' && typeof student.class === 'string') : [];
  } catch { return []; }
}

function readLegacyJourneys(): Record<string, StudentJourney> {
  try {
    const value = JSON.parse(localStorage.getItem('gm_journeys_v2') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function readActiveStudent(): ActiveStudent | null {
  try {
    const value = JSON.parse(localStorage.getItem(activeStudentKey) || 'null');
    return value && typeof value.id === 'string' && typeof value.name === 'string' ? value : null;
  } catch { return null; }
}

function makeJourney(student: ActiveStudent): StudentJourney {
  return {
    studentId: student.id,
    studentName: student.name,
    studentGender: student.gender,
    studentClass: student.class,
    studentAbsentNumber: student.absentNumber,
    confidenceScore: 0,
    stages: {},
    lastActiveStage: 1,
    updatedAt: new Date().toISOString(),
  };
}

function confidenceScore(stages: StudentJourney['stages']): number {
  const answer = stages[8]?.answers?.future_confidence_scale ?? stages[1]?.answers?.confidence_scale;
  return typeof answer === 'number' && answer >= 1 && answer <= 5 ? answer * 20 : 0;
}

function isTeacher(user: User | null): boolean {
  return Boolean(user && user.email?.toLowerCase() === teacherEmail && user.emailVerified &&
    user.providerData.some((provider) => provider.providerId === 'google.com'));
}

function readableError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'permission-denied') return 'Akses Firebase ditolak. Periksa Firestore Rules dan akun guru.';
  if (code === 'auth/unauthorized-domain') return 'Domain website belum diizinkan di Firebase Authentication.';
  if (code === 'auth/operation-not-allowed') return 'Metode login Anonymous atau Google belum diaktifkan di Firebase.';
  if (code === 'auth/popup-closed-by-user') return 'Jendela login Google ditutup sebelum selesai.';
  return error instanceof Error ? error.message : 'Koneksi Firebase gagal. Coba lagi saat internet tersedia.';
}

export const CloudAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studentUid, setStudentUid] = useState<string | null>(null);
  const [teacherUser, setTeacherUser] = useState<User | null>(null);
  const [studentRecords, setStudentRecords] = useState<Record<string, CloudStudentRecord>>({});
  const [teacherRecords, setTeacherRecords] = useState<Record<string, CloudStudentRecord>>({});
  const studentRecordsRef = useRef(studentRecords);
  const [activeStudent, setActiveStudent] = useState<ActiveStudent | null>(readActiveStudent);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [studentReady, setStudentReady] = useState(false);

  const isAdminLoggedIn = isTeacher(teacherUser);
  const visibleRecords = isAdminLoggedIn ? teacherRecords : studentRecords;
  const allStudents = useMemo(() => Object.values(visibleRecords)
    .map((record) => record.student)
    .sort((a, b) => a.class.localeCompare(b.class) || a.absentNumber - b.absentNumber), [visibleRecords]);
  const journeys = useMemo(() => Object.fromEntries(Object.entries(visibleRecords)
    .map(([id, record]) => [id, record.journey])), [visibleRecords]);

  useEffect(() => { studentRecordsRef.current = studentRecords; }, [studentRecords]);

  useEffect(() => {
    try {
      if (activeStudent) localStorage.setItem(activeStudentKey, JSON.stringify(activeStudent));
      else localStorage.removeItem(activeStudentKey);
    } catch { setStorageError(true); }
  }, [activeStudent]);

  useEffect(() => {
    if (!studentAuth || !teacherAuth) return;
    const auth = studentAuth;
    const unsubscribeStudent = onAuthStateChanged(auth, (user) => {
      if (user) setStudentUid(user.uid);
      else {
        if (!anonymousSignIn) {
          anonymousSignIn = signInAnonymously(auth).finally(() => { anonymousSignIn = null; });
        }
        anonymousSignIn.catch((error) => { setCloudError(readableError(error)); setCloudLoading(false); });
      }
    }, (error) => { setCloudError(readableError(error)); setCloudLoading(false); });
    const unsubscribeTeacher = onAuthStateChanged(teacherAuth, (user) => {
      setTeacherUser(isTeacher(user) ? user : null);
    }, (error) => setCloudError(readableError(error)));
    return () => { unsubscribeStudent(); unsubscribeTeacher(); };
  }, []);

  useEffect(() => {
    if (!studentDb) return;
    return onSnapshot(doc(studentDb, 'settings', 'public'), (snapshot) => {
      if (!snapshot.exists()) { setAppSettings(defaultSettings); return; }
      const data = snapshot.data();
      if (Array.isArray(data.classNames) && data.classNames.length && typeof data.allowEarlyPhaseTwo === 'boolean') {
        setAppSettings({ classNames: data.classNames, allowEarlyPhaseTwo: data.allowEarlyPhaseTwo });
      }
    }, (error) => setCloudError(readableError(error)));
  }, []);

  useEffect(() => {
    if (!studentUid || !studentDb) return;
    const db = studentDb;
    let cancelled = false;
    let unsubscribe = () => {};
    const connect = async () => {
      try {
        let migrationFailures = 0;
        // One-time, non-destructive migration of data already saved in this browser.
        const migrationKey = `gm_firebase_migrated_${firebaseConfig.projectId}_${studentUid}`;
        let alreadyMigrated = false;
        try { alreadyMigrated = localStorage.getItem(migrationKey) === 'true'; }
        catch { setStorageError(true); }
        if (!alreadyMigrated) {
          const existing = await getDocs(query(collection(db, studentCollection), where('ownerUid', '==', studentUid)));
          const existingIds = new Set(existing.docs.map((item) => item.id));
          const legacyJourneys = readLegacyJourneys();
          for (const student of readLegacyStudents()) {
            if (cancelled) return;
            if (existingIds.has(student.id)) continue;
            const legacy = legacyJourneys[student.id];
            const journey = legacy ? { ...makeJourney(student), ...legacy, stages: legacy.stages || {} } : makeJourney(student);
            try {
              await setDoc(doc(db, studentCollection, student.id), JSON.parse(JSON.stringify({ ownerUid: studentUid, student, journey })));
            } catch { migrationFailures++; }
          }
          if (migrationFailures === 0) {
            try { localStorage.setItem(migrationKey, 'true'); } catch { setStorageError(true); }
          }
        }
        if (cancelled) return;
        unsubscribe = onSnapshot(query(collection(db, studentCollection), where('ownerUid', '==', studentUid)),
          (snapshot) => {
            const records = Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data() as CloudStudentRecord]));
            studentRecordsRef.current = records;
            setStudentRecords(records);
            setActiveStudent((current) => current && !records[current.id] ? null : current);
            setStudentReady(true);
            setCloudError(migrationFailures ? `${migrationFailures} data lama belum berhasil dipindahkan ke Firebase. Salinan lokal masih ada di browser ini.` : null);
            setCloudLoading(false);
          },
          (error) => { setCloudError(readableError(error)); setCloudLoading(false); });
      } catch (error) { if (!cancelled) { setCloudError(readableError(error)); setCloudLoading(false); } }
    };
    void connect();
    return () => { cancelled = true; unsubscribe(); };
  }, [studentUid]);

  useEffect(() => {
    if (!isAdminLoggedIn || !teacherDb) { setTeacherRecords({}); return; }
    const db = teacherDb;
    const migrateSettings = async () => {
      try {
        const reference = doc(db, 'settings', 'public');
        if ((await getDoc(reference)).exists()) return;
        const saved = JSON.parse(localStorage.getItem('gm_app_settings_v2') || 'null');
        if (saved && Array.isArray(saved.classNames) && saved.classNames.length &&
          typeof saved.allowEarlyPhaseTwo === 'boolean') {
          await setDoc(reference, { classNames: saved.classNames, allowEarlyPhaseTwo: saved.allowEarlyPhaseTwo });
        }
      } catch (error) { setCloudError(readableError(error)); }
    };
    void migrateSettings();
    return onSnapshot(collection(db, studentCollection), (snapshot) => {
      setTeacherRecords(Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data() as CloudStudentRecord])));
      setCloudError(null);
    }, (error) => setCloudError(readableError(error)));
  }, [isAdminLoggedIn]);

  const startStudentJourney: AppContextType['startStudentJourney'] = async (name, gender, studentClass, absentNumber) => {
    if (!studentUid || !studentDb || !studentReady) throw new Error('Firebase belum siap. Tunggu sebentar lalu coba lagi.');
    const cleanName = sanitizeTextInput(name).trim();
    const cleanClass = sanitizeTextInput(studentClass).trim();
    const config = appSettings.classNames.find((item) => item.className === cleanClass);
    if (!cleanName || !config || !Number.isInteger(absentNumber) ||
      absentNumber < config.absentRangeMin || absentNumber > config.absentRangeMax) throw new Error('Identitas siswa tidak valid.');
    const existing = Object.values(studentRecordsRef.current).find(({ student }) =>
      student.name.toLowerCase() === cleanName.toLowerCase() && student.class === cleanClass && student.absentNumber === absentNumber);
    if (existing) { setActiveStudent(existing.student); return; }
    const student: ActiveStudent = {
      id: `student-${crypto.randomUUID()}`, name: cleanName, gender,
      class: cleanClass, absentNumber, startedAt: new Date().toISOString(),
    };
    const record: CloudStudentRecord = { ownerUid: studentUid, student, journey: makeJourney(student) };
    await setDoc(doc(studentDb, studentCollection, student.id), record);
    studentRecordsRef.current = { ...studentRecordsRef.current, [student.id]: record };
    setStudentRecords(studentRecordsRef.current);
    setActiveStudent(student);
  };

  const saveStageAnswer: AppContextType['saveStageAnswer'] = async (studentId, stageId, answers) => {
    const record = studentRecordsRef.current[studentId];
    if (!record || record.ownerUid !== studentUid || !studentDb) throw new Error('Sesi siswa tidak cocok. Masuk kembali pada perangkat ini.');
    const now = new Date().toISOString();
    const stages = { ...record.journey.stages, [stageId]: { completed: true, completedAt: now, answers } };
    const journey: StudentJourney = {
      ...record.journey, stages, lastActiveStage: Math.min(8, stageId + 1),
      confidenceScore: confidenceScore(stages), updatedAt: now,
    };
    await updateDoc(doc(studentDb, studentCollection, studentId), { journey: JSON.parse(JSON.stringify(journey)) });
    const updated = { ...record, journey };
    studentRecordsRef.current = { ...studentRecordsRef.current, [studentId]: updated };
    setStudentRecords(studentRecordsRef.current);
  };

  const adminLogin: AppContextType['adminLogin'] = async () => {
    if (!teacherAuth) return false;
    try {
      const { user } = await signInWithPopup(teacherAuth, new GoogleAuthProvider());
      if (isTeacher(user)) { setCloudError(null); return true; }
      await signOut(teacherAuth);
      setCloudError(`Akun ini bukan akun guru yang diizinkan (${teacherEmail}).`);
      return false;
    } catch (error) { setCloudError(readableError(error)); return false; }
  };

  const adminLogout = () => { if (teacherAuth) void signOut(teacherAuth).catch((error) => setCloudError(readableError(error))); };
  const clearActiveStudent = () => setActiveStudent(null);
  const getStudentJourney = (studentId: string): StudentJourney => journeys[studentId] ||
    makeJourney(allStudents.find((student) => student.id === studentId) || {
      id: studentId, name: 'Siswa', gender: 'L', class: 'Kelas X', absentNumber: 1, startedAt: '',
    });

  const resetStudentProgress: AppContextType['resetStudentProgress'] = async (studentId) => {
    const record = visibleRecords[studentId];
    const db = isAdminLoggedIn ? teacherDb : studentDb;
    if (!record || !db || (!isAdminLoggedIn && record.ownerUid !== studentUid)) throw new Error('Akses ditolak.');
    await updateDoc(doc(db, studentCollection, studentId), { journey: makeJourney(record.student) });
    for (let stageId = 1; stageId <= 8; stageId++) {
      try { localStorage.removeItem(`gm_stage_draft_${studentId}_${stageId}`); } catch { setStorageError(true); }
    }
  };

  const deleteStudent: AppContextType['deleteStudent'] = async (studentId) => {
    if (!isAdminLoggedIn || !teacherDb) throw new Error('Hanya guru yang boleh menghapus data siswa.');
    await deleteDoc(doc(teacherDb, studentCollection, studentId));
    if (activeStudent?.id === studentId) setActiveStudent(null);
  };

  const updateAppSettings: AppContextType['updateAppSettings'] = async (settings) => {
    if (!isAdminLoggedIn || !teacherDb) return { success: false, message: 'Hanya guru yang boleh mengubah pengaturan.' };
    const names = settings.classNames.map((item) => item.className.trim().toLowerCase());
    const valid = names.length > 0 && new Set(names).size === names.length &&
      settings.classNames.every((item) => item.className.trim() && Number.isInteger(item.absentRangeMin) &&
        Number.isInteger(item.absentRangeMax) && item.absentRangeMin >= 1 && item.absentRangeMax >= item.absentRangeMin);
    if (!valid || typeof settings.allowEarlyPhaseTwo !== 'boolean') return { success: false, message: 'Pengaturan tidak valid.' };
    try {
      await setDoc(doc(teacherDb, 'settings', 'public'), {
        classNames: settings.classNames.map((item) => ({ ...item, className: item.className.trim() })),
        allowEarlyPhaseTwo: settings.allowEarlyPhaseTwo,
      });
      return { success: true, message: 'Pengaturan tersimpan di Firebase dan berlaku untuk semua perangkat.' };
    } catch (error) { return { success: false, message: readableError(error) }; }
  };

  const unavailable = () => ({ success: false, message: 'Fitur Google Drive tidak digunakan dalam mode Firebase.' });
  const contextValue: AppContextType = {
    activeStudent, startStudentJourney, clearActiveStudent,
    isAdminLoggedIn, adminLogin, adminLogout,
    adminCredentials: { username: teacherEmail, password: '' },
    updateAdminCredentials: unavailable,
    allStudents, journeys, saveStageAnswer, getStudentJourney,
    retryDriveSync: () => {}, resetStudentProgress, deleteStudent,
    driveFolderUrl: DEFAULT_DRIVE_FOLDER_URL, updateDriveFolderUrl: unavailable,
    driveWebhookUrl: '', driveWebhookManagedByBuild: false, updateDriveWebhookUrl: unavailable,
    appSettings, updateAppSettings, storageError, cloudLoading, cloudError,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
