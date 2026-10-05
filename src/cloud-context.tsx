import { prepareStageSave } from './utils/journeyRevision';
import { reviseJourney } from './utils/journeyRevision';
import { collectDatabaseBackup } from './utils/databaseBackup';
import { applyMaintenancePlan, makeDeletePlan, makeRestorePlan, sameDocument, validateDatabaseBackup } from './utils/databaseMaintenance';
import { backupMilestone, driveFolderId, DriveBackupSettings, DriveBackupJob, DriveBackupWorker } from './utils/driveBackup';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, GoogleAuthProvider, inMemoryPersistence, onAuthStateChanged, reauthenticateWithCredential, setPersistence, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signOut, updatePassword, User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, onSnapshot, runTransaction, query, setDoc, updateDoc, where, writeBatch, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { AdminRole, AppContext, AppContextType, StaffAccount } from './context';
import { DEFAULT_CLASS_CONFIGS, STAGES_DATA } from './data';
import { provisioningAuth, studentAuth, studentDb, teacherAuth, teacherDb } from './firebase';
import { firebaseConfig, teacherEmail } from './firebase-config';
import { ActiveStudent, AppSettings, Gender, StudentJourney } from './types';
import { sanitizeTextInput } from './utils/security';
import { findExistingStudent } from './utils/studentIdentity';
import { normalizeStudentAccessCode, openStudentWithAccess } from './utils/studentAccess';

interface CloudStudentRecord {
  ownerUid: string;
  student: ActiveStudent;
  journey: StudentJourney;
}

function reviseRecord(record: CloudStudentRecord): CloudStudentRecord {
  return { ...record, journey: reviseJourney(record.journey) };
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

const validUsername = /^[a-z][a-z0-9._-]{2,31}$/;
let anonymousSignIn: Promise<unknown> | null = null;

function internalEmail(): string {
  return `staff-${crypto.randomUUID()}@${firebaseConfig.authDomain}`;
}

function hasPasswordProvider(user: User | null): boolean {
  return Boolean(user?.providerData.some((provider) => provider.providerId === 'password'));
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
  const studentLinkedIds = useRef(new Set<string>());
  const maintenanceRunning = useRef(false);
  const [activeStudent, setActiveStudent] = useState<ActiveStudent | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);
  const [driveBackupSettings, setDriveBackupSettings] = useState<DriveBackupSettings>({ folderUrl: '', enabled: false });
  const [driveBackupJobs, setDriveBackupJobs] = useState<DriveBackupJob[]>([]);
  const [driveBackupWorker, setDriveBackupWorker] = useState<DriveBackupWorker | null>(null);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const storageError = false;
  const [teacherReady, setTeacherReady] = useState(false);
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
    if (!studentUid || !studentDb) return;
    return onSnapshot(doc(studentDb, 'settings', 'driveBackup'), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      const data = snapshot.data();
      setDriveBackupSettings(data && driveFolderId(data.folderUrl) && typeof data.enabled === 'boolean'
        ? { folderUrl: data.folderUrl, enabled: data.enabled } : { folderUrl: '', enabled: false });
    }, () => { setDriveBackupSettings({ folderUrl: '', enabled: false }); });
  }, [studentUid]);

  useEffect(() => {
    if (!isAdminLoggedIn || !teacherDb) { setDriveBackupJobs([]); setDriveBackupWorker(null); return; }
    const unsubscribeJobs = onSnapshot(query(collection(teacherDb, 'driveBackupJobs'), orderBy('createdAt', 'desc'), limit(100)),
      { includeMetadataChanges: true }, snapshot => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        setDriveBackupJobs(snapshot.docs.map(item => {
          const data = item.data();
          return { ...data, id: item.id, createdAt: data.createdAt?.toDate?.().toISOString() || '' } as DriveBackupJob;
        }));
      }, () => setDriveBackupJobs([]));
    const unsubscribeWorker = onSnapshot(doc(teacherDb, 'settings', 'driveBackupWorker'), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setDriveBackupWorker(snapshot.exists() ? snapshot.data() as DriveBackupWorker : null);
    }, error => setDriveBackupWorker({ checkedAt: '', error: readableError(error) }));
    return () => { unsubscribeJobs(); unsubscribeWorker(); };
  }, [isAdminLoggedIn]);



  useEffect(() => {
    if (!studentAuth || !teacherAuth) return;
    const auth = studentAuth;
    const unsubscribeStudent = onAuthStateChanged(auth, (user) => {
      if (user) setStudentUid(user.uid);
      else {
        setStudentUid(null);
        setStudentReady(false);
        setActiveStudent(null);
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
    return onSnapshot(doc(teacherDb, 'config', 'adminRoot'), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setRootAccount(snapshot.exists() ? snapshot.data() as RootAccount : null);
      setRootLoaded(true);
    }, (error) => { setCloudError(readableError(error)); setRootLoaded(true); });
  }, []);

  useEffect(() => {
    if (!teacherUser || !teacherDb || !hasPasswordProvider(teacherUser)) {
      setTeacherAccount(null);
      return;
    }
    return onSnapshot(doc(teacherDb, 'staff', teacherUser.uid), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setTeacherAccount(snapshot.exists() ? snapshot.data() as TeacherAccount : null);
    }, (error) => { setTeacherAccount(null); setCloudError(readableError(error)); });
  }, [teacherUser]);

  useEffect(() => {
    if (adminRole !== 'admin' || !teacherDb) {
      setStaffAccounts([]);
      return;
    }
    return onSnapshot(collection(teacherDb, 'staff'), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setStaffAccounts(snapshot.docs.map((item) => ({
        uid: item.id,
        username: String(item.data().username || ''),
        active: item.data().active === true,
      })).sort((a, b) => a.username.localeCompare(b.username)));
    }, (error) => setCloudError(readableError(error)));
  }, [adminRole]);

  useEffect(() => {
    if (!studentDb) return;
    return onSnapshot(doc(studentDb, 'settings', 'public'), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
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
    let ownRecords: Record<string, CloudStudentRecord> = {};
    const linkedRecords: Record<string, CloudStudentRecord> = {};
    const linkedListeners = new Map<string, { code: string; waiting: boolean; unsubscribe: () => void }>();
    let disposed = false;
    const publish = () => {
      if (disposed) return;
      const records = { ...linkedRecords, ...ownRecords };
      for (const [id, listener] of linkedListeners) {
        if (listener.waiting && studentLinkedIds.current.has(id) && !records[id] && studentRecordsRef.current[id]) {
          records[id] = studentRecordsRef.current[id];
        }
      }
      studentRecordsRef.current = records;
      setStudentRecords(records);
      setActiveStudent(current => current ? records[current.id]?.student ??
        (studentLinkedIds.current.has(current.id) ? current : null) : null);
    };
    setStudentReady(false);
    setCloudLoading(true);
    studentRecordsRef.current = {};
    studentLinkedIds.current = new Set();
    setStudentRecords({});
    const unsubscribeOwn = onSnapshot(query(collection(db, studentCollection), where('ownerUid', '==', studentUid)),
      { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        if (snapshot.metadata.fromCache) {
          setStudentReady(false);
          setCloudError('Menunggu koneksi Firebase. Data belum diperbarui dari server; jawaban yang sedang diketik belum disimpan.');
          return;
        }
        ownRecords = Object.fromEntries(snapshot.docs.map(item => [item.id, reviseRecord(item.data() as CloudStudentRecord)]));
        publish();
        setStudentReady(true);
        setCloudLoading(false);
        setCloudError(null);
      }, error => { setStudentReady(false); setCloudError(readableError(error)); setCloudLoading(false); });
    const unsubscribeLinks = onSnapshot(collection(db, 'studentBrowserAccess', studentUid, 'students'),
      { includeMetadataChanges: true }, snapshot => {
        if (disposed) return;
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        const ids = new Set(snapshot.docs.map(item => item.id));
        studentLinkedIds.current = ids;
        for (const [id, listener] of linkedListeners) {
          if (!ids.has(id)) { listener.unsubscribe(); linkedListeners.delete(id); delete linkedRecords[id]; }
        }
        for (const grant of snapshot.docs) {
          const id = grant.id;
          const code = String(grant.data().code);
          const previous = linkedListeners.get(id);
          if (previous?.code === code) continue;
          previous?.unsubscribe();
          const unsubscribe = onSnapshot(doc(db, studentCollection, id), { includeMetadataChanges: true }, item => {
            if (disposed || linkedListeners.get(id)?.code !== code) return;
            if (item.metadata.fromCache || item.metadata.hasPendingWrites) return;
            linkedListeners.get(id)!.waiting = false;
            if (item.exists()) linkedRecords[id] = reviseRecord(item.data() as CloudStudentRecord);
            else { delete linkedRecords[id]; setActiveStudent(current => current?.id === id ? null : current); }
            publish();
          }, () => {
            if (disposed || linkedListeners.get(id)?.code !== code) return;
            linkedListeners.get(id)!.waiting = false;
            delete linkedRecords[id]; setActiveStudent(current => current?.id === id ? null : current); publish();
          });
          linkedListeners.set(id, { code, waiting: true, unsubscribe });
        }
        publish();
      }, error => { setCloudError(readableError(error)); });
    return () => {
      disposed = true; unsubscribeOwn(); unsubscribeLinks();
      for (const listener of linkedListeners.values()) listener.unsubscribe();
    };
  }, [studentUid]);

  useEffect(() => {
    if (!isAdminLoggedIn || !teacherDb) { setTeacherRecords({}); return; }
    const db = teacherDb;
    setTeacherReady(false);
    return onSnapshot(collection(db, studentCollection), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      if (snapshot.metadata.fromCache) { setTeacherReady(false); return; }
      setTeacherReady(true);
      setTeacherRecords(Object.fromEntries(snapshot.docs.map((item) => [item.id, reviseRecord(item.data() as CloudStudentRecord)])));
      setCloudError(null);
    }, (error) => setCloudError(readableError(error)));
  }, [isAdminLoggedIn]);

  const startStudentJourney: AppContextType['startStudentJourney'] = async (name, gender, studentClass, absentNumber) => {
    if (!studentUid || !studentDb || !studentReady) throw new Error('Firebase belum siap. Tunggu sebentar lalu coba lagi.');
    const cleanName = sanitizeTextInput(name).normalize('NFKC').trim().replace(/\s+/g, ' ');
    const cleanClass = sanitizeTextInput(studentClass).trim();
    const config = appSettings.classNames.find((item) => item.className === cleanClass);
    if (!cleanName || !config || !Number.isInteger(absentNumber) ||
      absentNumber < config.absentRangeMin || absentNumber > config.absentRangeMax) throw new Error('Identitas siswa tidak valid.');
    // Recheck the server when entering, rather than relying on a previously received snapshot.
    // A failed lookup must not create an empty replacement record.
    const snapshot = await getDocsFromServer(query(collection(studentDb, studentCollection), where('ownerUid', '==', studentUid)));
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) throw new Error('Data siswa belum terkonfirmasi dari Firebase. Coba masuk kembali setelah tersambung.');
    if (studentAuth?.currentUser?.uid !== studentUid) throw new Error('Sesi login berubah. Muat ulang halaman sebelum melanjutkan.');
    const links = await getDocsFromServer(collection(studentDb, 'studentBrowserAccess', studentUid, 'students'));
    const linkedSnapshots = await Promise.all(links.docs.map(item => getDocFromServer(doc(studentDb!, studentCollection, item.id))));
    if (links.metadata.fromCache || links.metadata.hasPendingWrites || linkedSnapshots.some(item => item.metadata.fromCache || item.metadata.hasPendingWrites)) {
      throw new Error('Jawaban siswa belum terkonfirmasi dari Firebase. Tunggu penyimpanan selesai lalu coba lagi.');
    }
    if (studentAuth?.currentUser?.uid !== studentUid) throw new Error('Sesi login berubah. Muat ulang halaman sebelum melanjutkan.');
    const records = [...snapshot.docs, ...linkedSnapshots.filter(item => item.exists())]
      .map(item => reviseRecord(item.data() as CloudStudentRecord));
    const existing = findExistingStudent(records, cleanName, cleanClass, absentNumber);
    if (existing) {
      studentRecordsRef.current = { ...studentRecordsRef.current, [existing.student.id]: existing };
      setStudentRecords(studentRecordsRef.current);
      setActiveStudent(existing.student);
      return;
    }
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

  const getStudentAccessCode: AppContextType['getStudentAccessCode'] = async (studentId, renew = false) => {
    if (renew && !isAdminLoggedIn) throw new Error('Hanya guru yang boleh mengganti kode akses.');
    const db = isAdminLoggedIn ? teacherDb : studentDb;
    if (!db) throw new Error('Firebase belum siap.');
    const key = doc(db, 'studentAccessKeys', studentId);
    const newCode = crypto.randomUUID().replace(/-/g, '');
    return runTransaction(db, async transaction => {
      const student = await transaction.get(doc(db, studentCollection, studentId));
      const existing = await transaction.get(key);
      if (!student.exists()) throw new Error('Rekaman siswa sudah tidak tersedia.');
      if (existing.exists() && !renew) return normalizeStudentAccessCode(existing.data().code);
      if (existing.exists()) transaction.delete(doc(db, 'studentAccessCodes', normalizeStudentAccessCode(existing.data().code)));
      transaction.set(key, { code: newCode });
      transaction.set(doc(db, 'studentAccessCodes', newCode), { studentId });
      return newCode;
    });
  };

  const resumeStudentJourney: AppContextType['resumeStudentJourney'] = async value => {
    if (!studentUid || !studentDb || !studentReady) throw new Error('Firebase belum siap. Tunggu sebentar lalu coba lagi.');
    const uid = studentUid;
    const db = studentDb;
    try {
      const { studentId, record } = await openStudentWithAccess(value, {
        lookup: async code => {
          const snapshot = await getDocFromServer(doc(db, 'studentAccessCodes', code));
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) throw new Error('Kode akses belum terkonfirmasi dari Firebase. Coba lagi setelah tersambung.');
          return snapshot.exists() ? snapshot.data().studentId : null;
        },
        grant: async (studentId, code) => { await setDoc(doc(db, 'studentBrowserAccess', uid, 'students', studentId), { code }); },
        read: async studentId => {
          const snapshot = await getDocFromServer(doc(db, studentCollection, studentId));
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) throw new Error('Jawaban siswa belum terkonfirmasi dari Firebase. Coba lagi setelah tersambung.');
          return snapshot.exists() ? reviseRecord(snapshot.data() as CloudStudentRecord) : null;
        },
        checkSession: () => {
          if (studentAuth?.currentUser?.uid !== uid) throw new Error('Sesi login berubah. Muat ulang halaman sebelum melanjutkan.');
        },
      });
      studentLinkedIds.current.add(studentId);
      studentRecordsRef.current = { ...studentRecordsRef.current, [studentId]: record };
      setStudentRecords(studentRecordsRef.current);
      setActiveStudent(record.student);
      setCloudError(null);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'permission-denied') throw new Error('Kode akses tidak berlaku atau rekaman sudah dihapus. Minta kode kepada guru.');
      throw error;
    }
  };

  const saveStageAnswer: AppContextType['saveStageAnswer'] = async (studentId, stageId, answers, expectedStage) => {
    if (!studentUid || !studentDb || !studentReady) throw new Error('Koneksi Firebase belum siap. Jawaban belum disimpan.');
    const reference = doc(studentDb, studentCollection, studentId);
    // A stable ID across transaction retries prevents duplicate requests for one save.
    const backupJobId = crypto.randomUUID();
    await runTransaction(studentDb, async transaction => {
      const snapshot = await transaction.get(reference);
      const backupConfig = stageId === 4 || stageId === 8
        ? await transaction.get(doc(studentDb!, 'settings', 'driveBackup')) : null;
      if (!snapshot.exists()) throw new Error('Data siswa sudah dihapus. Muat ulang halaman.');
      const latest = snapshot.data() as CloudStudentRecord;
      if (latest.ownerUid !== studentUid && !studentLinkedIds.current.has(studentId)) throw new Error('Sesi siswa tidak cocok.');
      const journey = prepareStageSave(latest.journey, stageId, answers, expectedStage, new Date().toISOString());
      transaction.update(reference, { journey: JSON.parse(JSON.stringify(journey)) });
      const milestone = backupMilestone(stageId, journey);
      if (milestone && backupConfig?.data()?.enabled === true) {
        transaction.set(doc(studentDb!, 'driveBackupJobs', backupJobId), {
          ownerUid: studentUid, studentId, milestone, status: 'pending',
          createdAt: serverTimestamp(), revision: journey.updatedAt,
        });
      }
    });
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
        ? await getDocFromServer(doc(teacherDb, 'config', 'adminRoot'))
        : await getDocFromServer(doc(teacherDb, 'staffUsernames', normalized));
      if (!account.exists()) throw new Error('Nama pengguna atau kata sandi salah.');
      const email = account.data().email;
      if (typeof email !== 'string') throw new Error('Akun belum siap. Hubungi admin.');
      const { user } = await signInWithEmailAndPassword(teacherAuth, email, password);
      const currentRoot = await getDocFromServer(doc(teacherDb, 'config', 'adminRoot'));
      const isRoot = normalized === 'admin' && currentRoot.exists() && currentRoot.data().uid === user.uid;
      const staff = isRoot ? null : await getDocFromServer(doc(teacherDb, 'staff', user.uid));
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
      if (isLegacyTeacher(user) && !(await getDocFromServer(doc(teacherDb!, 'config', 'adminRoot'))).exists()) {
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
      if ((await getDocFromServer(reference)).exists()) throw new Error('Akun admin sudah dibuat. Muat ulang halaman.');
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
      if ((await getDocFromServer(doc(teacherDb, 'staffUsernames', normalized))).exists()) {
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
    if (!record || !db || (!isAdminLoggedIn && record.ownerUid !== studentUid && !studentLinkedIds.current.has(studentId))) throw new Error('Akses ditolak.');
    await updateDoc(doc(db, studentCollection, studentId), { journey: makeJourney(record.student) });

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

  const exportDatabaseBackup: AppContextType['exportDatabaseBackup'] = async () => {
    if (!isAdminLoggedIn || !teacherDb) throw new Error('Masuk sebagai guru atau admin untuk membuat backup.');
    const db = teacherDb;
    return collectDatabaseBackup({
      projectId: firebaseConfig.projectId,
      stageDefinitions: STAGES_DATA,
      defaultSettings,
      readStudents: async () => {
        const snapshot = await getDocsFromServer(collection(db, studentCollection));
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
          throw new Error('Data server belum terkonfirmasi. Tunggu sampai penyimpanan selesai lalu coba backup lagi.');
        }
        return snapshot.docs.map(item => ({ path: item.ref.path, data: item.data() }));
      },
      readSettings: async () => {
        const snapshot = await getDocFromServer(doc(db, 'settings', 'public'));
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
          throw new Error('Pengaturan server belum terkonfirmasi. Coba backup lagi setelah tersimpan.');
        }
        return snapshot.exists() ? { path: snapshot.ref.path, data: snapshot.data() } : null;
      },
    });
  };

  const prepareRestoreBackup: AppContextType['prepareRestoreBackup'] = async value => {
    const backup = validateDatabaseBackup(value, firebaseConfig.projectId);
    const current = await exportDatabaseBackup();
    return makeRestorePlan(backup, current.documents);
  };

  const prepareDeleteAllStudents: AppContextType['prepareDeleteAllStudents'] = async () => {
    const current = await exportDatabaseBackup();
    return makeDeletePlan(current.documents.filter(item => item.path.startsWith('students/')));
  };

  const applyDatabaseMaintenance: AppContextType['applyDatabaseMaintenance'] = async (plan, confirmation, onProgress) => {
    if (!isAdminLoggedIn || !teacherDb) throw new Error('Masuk sebagai guru atau admin untuk tindakan ini.');
    if (confirmation !== (plan.kind === 'restore' ? 'RESTORE' : 'HAPUS SEMUA')) throw new Error('Konfirmasi belum sesuai.');
    if (maintenanceRunning.current) throw new Error('Operasi lain sedang berjalan. Tunggu sampai selesai.');
    maintenanceRunning.current = true;
    const db = teacherDb;
    try {
      const result = await applyMaintenancePlan(plan, async operations => {
        await runTransaction(db, async transaction => {
          const snapshots = await Promise.all(operations.map(operation => transaction.get(doc(db, operation.path))));
          for (let index = 0; index < operations.length; index++) {
            const snapshot = snapshots[index];
            const current = snapshot.exists() ? snapshot.data() : null;
            if (!sameDocument(current, operations[index].expected)) {
              throw new Error(`Data ${operations[index].path} berubah sejak ringkasan dibuat. Tindakan pada kelompok ini dibatalkan.`);
            }
          }
          for (const operation of operations) {
            const reference = doc(db, operation.path);
            if (operation.data === null) transaction.delete(reference);
            else transaction.set(reference, operation.data);
          }
        });
      }, onProgress);
      setActiveStudent(current => current && plan.kind === 'delete' && plan.operations.some(item => item.path === `students/${current.id}`) ? null : current);
      return result;
    } finally { maintenanceRunning.current = false; }
  };

  const updateDriveBackupSettings: AppContextType['updateDriveBackupSettings'] = async settings => {
    if (!isAdminLoggedIn || !teacherDb) return { success: false, message: 'Masuk sebagai guru atau admin.' };
    const folderId = driveFolderId(settings.folderUrl);
    if (!folderId || typeof settings.enabled !== 'boolean') return { success: false, message: 'Gunakan tautan folder https://drive.google.com/drive/folders/...' };
    try {
      await setDoc(doc(teacherDb, 'settings', 'driveBackup'), { folderUrl: `https://drive.google.com/drive/folders/${folderId}`, enabled: settings.enabled });
      return { success: true, message: 'Pengaturan Drive tersimpan di Firebase dan berlaku untuk semua siswa. Pastikan pemroses backup sudah terpasang.' };
    } catch (error) { return { success: false, message: readableError(error) }; }
  };
  const unavailable = () => ({ success: false, message: 'Gunakan pengaturan akun Firebase.' });
  const contextValue: AppContextType = {
    activeStudent, startStudentJourney, getStudentAccessCode, resumeStudentJourney, clearActiveStudent,
    isAdminLoggedIn, adminLogin, bootstrapLogin, bootstrapNeeded: rootLoaded && !rootAccount, adminLogout,
    adminRole, staffAccounts, createAdmin, createTeacherAccount, setTeacherActive, changeOwnPassword,
    adminCredentials: { username: adminRole === 'admin' ? 'admin' : teacherAccount?.username || '', password: '' },
    updateAdminCredentials: unavailable,
    allStudents, journeys, saveStageAnswer, getStudentJourney, exportDatabaseBackup,
    prepareRestoreBackup, prepareDeleteAllStudents, applyDatabaseMaintenance,
    resetStudentProgress, deleteStudent,
    driveBackupSettings, driveBackupJobs, driveBackupWorker, updateDriveBackupSettings,
    appSettings, updateAppSettings, storageError, cloudLoading: cloudLoading || (isAdminLoggedIn && !teacherReady), cloudError,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
