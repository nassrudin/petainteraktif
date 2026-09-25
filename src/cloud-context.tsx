import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, GoogleAuthProvider, inMemoryPersistence, onAuthStateChanged, reauthenticateWithCredential, setPersistence, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signOut, updatePassword, User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { AdminRole, AppContext, AppContextType, DEFAULT_DRIVE_FOLDER_URL, StaffAccount } from './context';
import { DEFAULT_CLASS_CONFIGS } from './data';
import { provisioningAuth, studentAuth, studentDb, teacherAuth, teacherDb } from './firebase';
import { firebaseConfig, teacherEmail } from './firebase-config';
import { ActiveStudent, AppSettings, Gender, StudentJourney } from './types';
import { sanitizeTextInput } from './utils/security';

interface CloudStudentRecord {
  ownerUid: string;
  student: ActiveStudent;
  journey: StudentJourney;
}

interface RootAccount {
  uid: string;
  username: string;
  email: string;
}

interface TeacherAccount {
  username: string;
  email: string;
  role: 'teacher';
  active: boolean;
}

const defaultSettings: AppSettings = { classNames: DEFAULT_CLASS_CONFIGS, allowEarlyPhaseTwo: false };
const studentCollection = 'students';
const activeStudentKey = 'gm_active_student_v2';
const validUsername = /^[a-z][a-z0-9._-]{2,31}$/;
let anonymousSignIn: Promise<unknown> | null = null;

function internalEmail(): string {
  return `staff-${crypto.randomUUID()}@${firebaseConfig.authDomain}`;
}

function hasPasswordProvider(user: User | null): boolean {
  return Boolean(user?.providerData.some((provider) => provider.providerId === 'password'));
}

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

function isLegacyTeacher(user: User | null): boolean {
  return Boolean(user && user.email?.toLowerCase() === teacherEmail && user.emailVerified &&
    user.providerData.some((provider) => provider.providerId === 'google.com'));
}

function readableError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'permission-denied') return 'Akses Firebase ditolak. Periksa Firestore Rules dan akun guru.';
  if (code === 'auth/unauthorized-domain') return 'Domain website belum diizinkan di Firebase Authentication.';
  if (code === 'auth/operation-not-allowed') return 'Metode login Anonymous, Email/Password, atau Google untuk pengaturan pertama belum diaktifkan di Firebase.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Nama pengguna atau kata sandi salah.';
  if (code === 'auth/weak-password') return 'Kata sandi terlalu lemah. Gunakan minimal 12 karakter.';
  if (code === 'auth/email-already-in-use') return 'Akun internal sudah digunakan. Coba lagi.';
  if (code === 'auth/too-many-requests') return 'Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.';
  if (code === 'auth/popup-closed-by-user') return 'Jendela login Google ditutup sebelum selesai.';
  return error instanceof Error ? error.message : 'Koneksi Firebase gagal. Coba lagi saat internet tersedia.';
}

export const CloudAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studentUid, setStudentUid] = useState<string | null>(null);
  const [teacherUser, setTeacherUser] = useState<User | null>(null);
  const [rootAccount, setRootAccount] = useState<RootAccount | null>(null);
  const [rootLoaded, setRootLoaded] = useState(false);
  const [teacherAccount, setTeacherAccount] = useState<TeacherAccount | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [studentRecords, setStudentRecords] = useState<Record<string, CloudStudentRecord>>({});
  const [teacherRecords, setTeacherRecords] = useState<Record<string, CloudStudentRecord>>({});
  const studentRecordsRef = useRef(studentRecords);
  const [activeStudent, setActiveStudent] = useState<ActiveStudent | null>(readActiveStudent);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [studentReady, setStudentReady] = useState(false);

  const adminRole: AdminRole = !rootLoaded || !teacherUser ? null
    : !rootAccount && isLegacyTeacher(teacherUser) ? 'legacy'
    : rootAccount?.uid === teacherUser.uid && hasPasswordProvider(teacherUser) ? 'admin'
    : teacherAccount?.role === 'teacher' && teacherAccount.active && teacherAccount.email === teacherUser.email && hasPasswordProvider(teacherUser) ? 'teacher'
    : null;
  const isAdminLoggedIn = adminRole !== null;
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
    const unsubscribeTeacher = onAuthStateChanged(teacherAuth, setTeacherUser,
      (error) => setCloudError(readableError(error)));
    return () => { unsubscribeStudent(); unsubscribeTeacher(); };
  }, []);

  useEffect(() => {
    if (!teacherDb) return;
    return onSnapshot(doc(teacherDb, 'config', 'adminRoot'), (snapshot) => {
      setRootAccount(snapshot.exists() ? snapshot.data() as RootAccount : null);
      setRootLoaded(true);
    }, (error) => { setCloudError(readableError(error)); setRootLoaded(true); });
  }, []);

  useEffect(() => {
    if (!teacherUser || !teacherDb || !hasPasswordProvider(teacherUser)) {
      setTeacherAccount(null);
      return;
    }
    return onSnapshot(doc(teacherDb, 'staff', teacherUser.uid), (snapshot) => {
      setTeacherAccount(snapshot.exists() ? snapshot.data() as TeacherAccount : null);
    }, (error) => { setTeacherAccount(null); setCloudError(readableError(error)); });
  }, [teacherUser]);

  useEffect(() => {
    if (adminRole !== 'admin' || !teacherDb) {
      setStaffAccounts([]);
      return;
    }
    return onSnapshot(collection(teacherDb, 'staff'), (snapshot) => {
      setStaffAccounts(snapshot.docs.map((item) => ({
        uid: item.id,
        username: String(item.data().username || ''),
        active: item.data().active === true,
      })).sort((a, b) => a.username.localeCompare(b.username)));
    }, (error) => setCloudError(readableError(error)));
  }, [adminRole]);

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

  const adminLogin: AppContextType['adminLogin'] = async (username, password) => {
    if (!teacherAuth || !teacherDb) return false;
    const normalized = username.trim().toLowerCase();
    if (!validUsername.test(normalized) || !password) {
      setCloudError('Isi nama pengguna dan kata sandi yang benar.');
      return false;
    }
    try {
      const account = normalized === 'admin'
        ? await getDoc(doc(teacherDb, 'config', 'adminRoot'))
        : await getDoc(doc(teacherDb, 'staffUsernames', normalized));
      if (!account.exists()) throw new Error('Nama pengguna atau kata sandi salah.');
      const email = account.data().email;
      if (typeof email !== 'string') throw new Error('Akun belum siap. Hubungi admin.');
      const { user } = await signInWithEmailAndPassword(teacherAuth, email, password);
      const currentRoot = await getDoc(doc(teacherDb, 'config', 'adminRoot'));
      const isRoot = normalized === 'admin' && currentRoot.exists() && currentRoot.data().uid === user.uid;
      const staff = isRoot ? null : await getDoc(doc(teacherDb, 'staff', user.uid));
      const isActiveTeacher = staff?.exists() && staff.data().role === 'teacher' &&
        staff.data().active === true && staff.data().username === normalized;
      if (!isRoot && !isActiveTeacher) {
        await signOut(teacherAuth);
        throw new Error('Akun guru ini tidak aktif atau tidak diberi akses.');
      }
      setCloudError(null);
      return true;
    } catch (error) {
      try { await signOut(teacherAuth); } catch { /* no active session */ }
      setCloudError(readableError(error));
      return false;
    }
  };

  const bootstrapLogin = async (): Promise<boolean> => {
    if (!teacherAuth || rootAccount) return false;
    try {
      const { user } = await signInWithPopup(teacherAuth, new GoogleAuthProvider());
      if (isLegacyTeacher(user) && !(await getDoc(doc(teacherDb!, 'config', 'adminRoot'))).exists()) {
        setCloudError(null);
        return true;
      }
      await signOut(teacherAuth);
      setCloudError(`Hanya akun Google lama (${teacherEmail}) yang dapat membuat akun admin pertama.`);
      return false;
    } catch (error) {
      try { await signOut(teacherAuth); } catch { /* no active session */ }
      setCloudError(readableError(error));
      return false;
    }
  };

  const createAdmin = async (password: string) => {
    if (adminRole !== 'legacy' || !teacherDb || !teacherAuth || !provisioningAuth) {
      return { success: false, message: 'Hanya guru lama yang dapat membuat akun admin pertama.' };
    }
    if (password.length < 12) return { success: false, message: 'Kata sandi minimal 12 karakter.' };
    let createdUser: User | null = null;
    let rootSaved = false;
    try {
      const reference = doc(teacherDb, 'config', 'adminRoot');
      if ((await getDoc(reference)).exists()) throw new Error('Akun admin sudah dibuat. Muat ulang halaman.');
      await setPersistence(provisioningAuth, inMemoryPersistence);
      const email = internalEmail();
      createdUser = (await createUserWithEmailAndPassword(provisioningAuth, email, password)).user;
      await setDoc(reference, { uid: createdUser.uid, username: 'admin', email });
      rootSaved = true;
      try { await signOut(teacherAuth); } catch { /* root has already been created */ }
      setCloudError(null);
      return { success: true, message: 'Akun admin dibuat. Sekarang masuk dengan nama pengguna admin dan kata sandi tadi.' };
    } catch (error) {
      if (createdUser && !rootSaved) { try { await deleteUser(createdUser); } catch { /* account can be removed in Firebase Console */ } }
      return { success: false, message: readableError(error) };
    } finally { try { await signOut(provisioningAuth); } catch { /* no session */ } }
  };

  const createTeacherAccount = async (username: string, password: string) => {
    if (adminRole !== 'admin' || !teacherDb || !provisioningAuth) {
      return { success: false, message: 'Hanya admin yang dapat membuat akun guru.' };
    }
    const normalized = username.trim().toLowerCase();
    if (!validUsername.test(normalized) || normalized === 'admin') {
      return { success: false, message: 'Nama pengguna harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung; diawali huruf.' };
    }
    if (password.length < 12) return { success: false, message: 'Kata sandi minimal 12 karakter.' };
    let createdUser: User | null = null;
    try {
      if ((await getDoc(doc(teacherDb, 'staffUsernames', normalized))).exists()) {
        throw new Error('Nama pengguna sudah digunakan.');
      }
      await setPersistence(provisioningAuth, inMemoryPersistence);
      const email = internalEmail();
      createdUser = (await createUserWithEmailAndPassword(provisioningAuth, email, password)).user;
      const batch = writeBatch(teacherDb);
      batch.set(doc(teacherDb, 'staff', createdUser.uid), { username: normalized, email, role: 'teacher', active: true });
      batch.set(doc(teacherDb, 'staffUsernames', normalized), { uid: createdUser.uid, email });
      await batch.commit();
      return { success: true, message: `Akun guru ${normalized} dibuat. Sampaikan nama pengguna dan kata sandinya langsung kepada guru tersebut.` };
    } catch (error) {
      if (createdUser) { try { await deleteUser(createdUser); } catch { /* account can be removed in Firebase Console */ } }
      return { success: false, message: readableError(error) };
    } finally { try { await signOut(provisioningAuth); } catch { /* no session */ } }
  };

  const setTeacherActive = async (uid: string, active: boolean) => {
    if (adminRole !== 'admin' || !teacherDb) return { success: false, message: 'Hanya admin yang dapat mengatur akses guru.' };
    try {
      await updateDoc(doc(teacherDb, 'staff', uid), { active });
      return { success: true, message: active ? 'Akses guru diaktifkan.' : 'Akses guru dinonaktifkan.' };
    } catch (error) { return { success: false, message: readableError(error) }; }
  };

  const changeOwnPassword = async (oldPassword: string, newPassword: string) => {
    if (!teacherUser || !teacherUser.email || !hasPasswordProvider(teacherUser) || !isAdminLoggedIn) {
      return { success: false, message: 'Masuk dahulu dengan akun guru atau admin.' };
    }
    if (newPassword.length < 12) return { success: false, message: 'Kata sandi baru minimal 12 karakter.' };
    try {
      await reauthenticateWithCredential(teacherUser, EmailAuthProvider.credential(teacherUser.email, oldPassword));
      await updatePassword(teacherUser, newPassword);
      return { success: true, message: 'Kata sandi berhasil diganti.' };
    } catch (error) { return { success: false, message: readableError(error) }; }
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
    isAdminLoggedIn, adminLogin, bootstrapLogin, bootstrapNeeded: rootLoaded && !rootAccount, adminLogout,
    adminRole, staffAccounts, createAdmin, createTeacherAccount, setTeacherActive, changeOwnPassword,
    adminCredentials: { username: adminRole === 'admin' ? 'admin' : teacherAccount?.username || '', password: '' },
    updateAdminCredentials: unavailable,
    allStudents, journeys, saveStageAnswer, getStudentJourney,
    retryDriveSync: () => {}, resetStudentProgress, deleteStudent,
    driveFolderUrl: DEFAULT_DRIVE_FOLDER_URL, updateDriveFolderUrl: unavailable,
    driveWebhookUrl: '', driveWebhookManagedByBuild: false, updateDriveWebhookUrl: unavailable,
    appSettings, updateAppSettings, storageError, cloudLoading, cloudError,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
