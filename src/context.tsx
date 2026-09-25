import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ActiveStudent, StudentJourney, AdminCredentials, Gender, AppSettings, ClassConfig } from './types';
import { DEFAULT_ADMIN, DEFAULT_CLASS_CONFIGS } from './data';
import { sanitizeTextInput } from './utils/security';

// Define default drive folder URL here to avoid circular imports
export const DEFAULT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z?usp=sharing';

export interface StaffAccount {
  uid: string;
  username: string;
  active: boolean;
}

export type AdminRole = 'legacy' | 'admin' | 'teacher' | null;

export interface AppContextType {
  activeStudent: ActiveStudent | null;
  startStudentJourney: (name: string, gender: Gender, studentClass: string, absentNumber: number) => void | Promise<void>;
  clearActiveStudent: () => void;
  isAdminLoggedIn: boolean;
  adminLogin: (user: string, pass: string) => boolean | Promise<boolean>;
  bootstrapLogin?: () => Promise<boolean>;
  bootstrapNeeded?: boolean;
  adminLogout: () => void;
  adminCredentials: AdminCredentials;
  adminRole?: AdminRole;
  staffAccounts?: StaffAccount[];
  createAdmin?: (password: string) => Promise<{ success: boolean; message: string }>;
  createTeacherAccount?: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  setTeacherActive?: (uid: string, active: boolean) => Promise<{ success: boolean; message: string }>;
  changeOwnPassword?: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateAdminCredentials: (
    oldPass: string,
    newUsername: string,
    newPass: string
  ) => { success: boolean; message: string };
  allStudents: ActiveStudent[];
  journeys: Record<string, StudentJourney>;
  saveStageAnswer: (studentId: string, stageId: number, answers: Record<string, any>) => void | Promise<void>;
  getStudentJourney: (studentId: string) => StudentJourney;
  retryDriveSync: (studentId: string) => void;
  resetStudentProgress: (studentId: string) => void | Promise<void>;
  deleteStudent: (studentId: string) => void | Promise<void>;
  driveFolderUrl: string;
  updateDriveFolderUrl: (url: string) => { success: boolean; message: string };
  driveWebhookUrl: string;
  driveWebhookManagedByBuild: boolean;
  updateDriveWebhookUrl: (url: string) => { success: boolean; message: string };
  appSettings: AppSettings;
  updateAppSettings: (settings: AppSettings) => { success: boolean; message: string } | Promise<{ success: boolean; message: string }>;
  storageError: boolean;
  cloudLoading?: boolean;
  cloudError?: string | null;
}

const STORAGE_KEY_ACTIVE_STUDENT = 'gm_active_student_v2';
const STORAGE_KEY_ALL_STUDENTS = 'gm_all_students_v2';
const STORAGE_KEY_JOURNEYS = 'gm_journeys_v2';
const STORAGE_KEY_ADMIN_AUTH = 'gm_admin_auth_v2';
const STORAGE_KEY_DRIVE_FOLDER = 'gm_drive_folder_url_v2';
const STORAGE_KEY_DRIVE_WEBHOOK = 'gm_drive_webhook_url_v2';
const STORAGE_KEY_APP_SETTINGS = 'gm_app_settings_v2';

export const AppContext = createContext<AppContextType | undefined>(undefined);

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function readStoredString(key: string, fallback: string): string {
  try { return localStorage.getItem(key) || fallback; }
  catch { return fallback; }
}

function isValidWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' &&
      url.pathname.endsWith('/exec');
  } catch { return false; }
}

const buildWebhookUrl = import.meta.env.VITE_DRIVE_WEBHOOK_URL || '';
const driveWebhookManagedByBuild = isValidWebhookUrl(buildWebhookUrl);

function getConfidenceScore(stages: StudentJourney['stages']): number {
  const answer = stages[8]?.answers?.future_confidence_scale ?? stages[1]?.answers?.confidence_scale;
  return typeof answer === 'number' && answer >= 1 && answer <= 5 ? answer * 20 : 0;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Admin credentials
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    const saved = readStoredJson(STORAGE_KEY_ADMIN_AUTH, DEFAULT_ADMIN);
    return saved && typeof saved.username === 'string' && typeof saved.password === 'string'
      ? saved : DEFAULT_ADMIN;
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const persist = (key: string, value: string) => {
    try { localStorage.setItem(key, value); }
    catch { setStorageError(true); }
  };

  // App settings, including class configurations and phase-two access
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = readStoredJson<Partial<AppSettings>>(STORAGE_KEY_APP_SETTINGS, { classNames: DEFAULT_CLASS_CONFIGS });
    return saved && Array.isArray(saved.classNames) && saved.classNames.length &&
      saved.classNames.every(c => c && typeof c.className === 'string' &&
        Number.isInteger(c.absentRangeMin) && Number.isInteger(c.absentRangeMax))
      ? { classNames: saved.classNames, allowEarlyPhaseTwo: saved.allowEarlyPhaseTwo === true }
      : { classNames: DEFAULT_CLASS_CONFIGS, allowEarlyPhaseTwo: false };
  });

  // Google Drive folder URL (configurable by Admin)
  const [driveFolderUrl, setDriveFolderUrlState] = useState<string>(() => {
    return readStoredString(STORAGE_KEY_DRIVE_FOLDER, DEFAULT_DRIVE_FOLDER_URL);
  });

  // Google Apps Script Webhook URL for auto-uploading actual files to Google Drive
  const [driveWebhookUrl, setDriveWebhookUrlState] = useState<string>(() => {
    const value = driveWebhookManagedByBuild ? buildWebhookUrl : readStoredString(STORAGE_KEY_DRIVE_WEBHOOK, '');
    return isValidWebhookUrl(value) ? value : '';
  });

  // Students list (for admin dashboard viewing)
  const [allStudents, setAllStudents] = useState<ActiveStudent[]>(() => {
    const saved = readStoredJson<ActiveStudent[]>(STORAGE_KEY_ALL_STUDENTS, []);
    return Array.isArray(saved) ? saved.filter(s => s && typeof s.id === 'string' &&
      typeof s.name === 'string' && typeof s.class === 'string') : [];
  });

  // Currently active student filling the journey
  const [activeStudent, setActiveStudent] = useState<ActiveStudent | null>(() => {
    const saved = readStoredJson<ActiveStudent | null>(STORAGE_KEY_ACTIVE_STUDENT, null);
    return saved && typeof saved.id === 'string' && typeof saved.name === 'string' &&
      typeof saved.class === 'string' ? saved : null;
  });

  // Journeys map
  const [journeys, setJourneys] = useState<Record<string, StudentJourney>>(() => {
    const saved = readStoredJson<Record<string, StudentJourney>>(STORAGE_KEY_JOURNEYS, {});
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, journey]) => journey && typeof journey === 'object').map(([id, journey]) => [id, {
      ...journey,
      stages: journey.stages && typeof journey.stages === 'object' ? journey.stages : {},
      confidenceScore: getConfidenceScore(journey.stages || {}),
      driveSyncStatus: journey.driveSyncStatus ||
        (driveWebhookUrl && Array.from({ length: 8 }, (_, i) => i + 1)
          .every(stageId => journey.stages?.[stageId]?.completed) ? 'pending' : undefined),
    }]));
  });
  const syncInFlight = useRef(new Set<string>());

  // Apps Script responses are opaque in no-cors mode. Delivery cannot be confirmed here.
  useEffect(() => {
    if (!driveWebhookUrl) return;
    for (const journey of Object.values(journeys)) {
      if (journey.driveSyncStatus !== 'pending' || syncInFlight.current.has(journey.studentId)) continue;
      syncInFlight.current.add(journey.studentId);
      fetch(driveWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          studentId: journey.studentId,
          studentName: journey.studentName,
          studentGender: journey.studentGender,
          studentClass: journey.studentClass,
          studentAbsentNumber: journey.studentAbsentNumber,
          confidenceScore: journey.confidenceScore,
          stages: journey.stages,
          completedAt: journey.updatedAt,
        }),
      }).then(() => {
        setJourneys(prev => {
          const current = prev[journey.studentId];
          if (!current || current.stages !== journey.stages) return prev;
          return { ...prev, [journey.studentId]: { ...current, driveSyncStatus: 'unverified' } };
        });
      }).catch(() => {
        setJourneys(prev => {
          const current = prev[journey.studentId];
          if (!current || current.stages !== journey.stages) return prev;
          return { ...prev, [journey.studentId]: { ...current, driveSyncStatus: 'failed' } };
        });
      }).finally(() => {
        syncInFlight.current.delete(journey.studentId);
        setJourneys(prev => {
          const current = prev[journey.studentId];
          return current?.driveSyncStatus === 'pending' && current.stages !== journey.stages
            ? { ...prev } : prev;
        });
      });
    }
  }, [journeys, driveWebhookUrl]);

  // Sync to LocalStorage
  useEffect(() => {
    persist(STORAGE_KEY_ADMIN_AUTH, JSON.stringify(adminCredentials));
  }, [adminCredentials]);

  useEffect(() => {
    persist(STORAGE_KEY_APP_SETTINGS, JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    persist(STORAGE_KEY_DRIVE_FOLDER, driveFolderUrl);
  }, [driveFolderUrl]);

  useEffect(() => {
    if (driveWebhookManagedByBuild) {
      try { localStorage.removeItem(STORAGE_KEY_DRIVE_WEBHOOK); } catch { setStorageError(true); }
    } else {
      persist(STORAGE_KEY_DRIVE_WEBHOOK, driveWebhookUrl);
    }
  }, [driveWebhookUrl]);

  useEffect(() => {
    persist(STORAGE_KEY_ALL_STUDENTS, JSON.stringify(allStudents));
  }, [allStudents]);

  useEffect(() => {
    if (activeStudent) {
        persist(STORAGE_KEY_ACTIVE_STUDENT, JSON.stringify(activeStudent));
    } else {
        try { localStorage.removeItem(STORAGE_KEY_ACTIVE_STUDENT); } catch { setStorageError(true); }
    }
  }, [activeStudent]);

  useEffect(() => {
    persist(STORAGE_KEY_JOURNEYS, JSON.stringify(journeys));
  }, [journeys]);

  // Actions
  const startStudentJourney = (name: string, gender: Gender, studentClass: string, absentNumber: number) => {
    // SECURITY FIX: Sanitize inputs to prevent XSS attacks
    const sanitizedName = sanitizeTextInput(name);
    const trimmedName = sanitizedName.trim();
    
    const sanitizedClass = sanitizeTextInput(studentClass);
    const trimmedClass = sanitizedClass.trim();
    
    const classConfig = appSettings.classNames.find(c => c.className === trimmedClass);
    if (!trimmedName || !classConfig || !Number.isInteger(absentNumber) ||
      absentNumber < classConfig.absentRangeMin || absentNumber > classConfig.absentRangeMax) return;

    // Look for existing student record or create new
    const existing = allStudents.find(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase() && 
             s.class.toLowerCase() === trimmedClass.toLowerCase() &&
             s.absentNumber === absentNumber
    );

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    let currentStudent: ActiveStudent;
    if (existing) {
      currentStudent = existing;
    } else {
      currentStudent = {
        id: `student-${crypto.randomUUID()}`,
        name: trimmedName,
        gender,
        class: trimmedClass,
        absentNumber,
        startedAt: nowStr,
      };
      setAllStudents((prev) => [currentStudent, ...prev]);
    }

    // Ensure journey exists
    if (!journeys[currentStudent.id]) {
      setJourneys((prev) => ({
        ...prev,
        [currentStudent.id]: {
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          studentGender: currentStudent.gender,
          studentClass: currentStudent.class,
          studentAbsentNumber: currentStudent.absentNumber,
          confidenceScore: 0,
          stages: {},
          lastActiveStage: 1,
          updatedAt: nowStr,
        },
      }));
    }

    setActiveStudent(currentStudent);
  };

  const clearActiveStudent = () => {
    setActiveStudent(null);
  };

  const adminLogin = (user: string, pass: string): boolean => {
    // SECURITY FIX: Sanitize username input (password is compared directly)
    const sanitizedUser = sanitizeTextInput(user);
    if (
      sanitizedUser.trim() === adminCredentials.username.trim() &&
      pass.trim() === adminCredentials.password.trim()
    ) {
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdminLoggedIn(false);
  };

  const updateAdminCredentials = (
    oldPass: string,
    newUsername: string,
    newPass: string
  ): { success: boolean; message: string } => {
    if (oldPass.trim() !== adminCredentials.password.trim()) {
      return { success: false, message: 'Password lama tidak cocok.' };
    }
    
    const sanitizedNewUsername = sanitizeTextInput(newUsername);
    if (!sanitizedNewUsername.trim()) {
      return { success: false, message: 'Username baru tidak boleh kosong.' };
    }
    if (!newPass.trim() || newPass.trim().length < 8) {
      return { success: false, message: 'Password baru minimal 8 karakter.' };
    }
    
    // SECURITY: Validate password strength
    const hasUpperCase = /[A-Z]/.test(newPass);
    const hasLowerCase = /[a-z]/.test(newPass);
    const hasNumbers = /\d/.test(newPass);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return { 
        success: false, 
        message: 'Password harus mengandung huruf besar, kecil, dan angka.' 
      };
    }

    setAdminCredentials({
      ...adminCredentials,
      username: sanitizedNewUsername.trim(),
      password: newPass.trim(),
    });

    return { success: true, message: 'Username & Password guru/admin berhasil diubah!' };
  };

  const updateDriveFolderUrl = (url: string): { success: boolean; message: string } => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { success: false, message: 'Link Google Drive tidak boleh kosong.' };
    }
    
    // SECURITY FIX: Validate URL format to prevent XSS/phishing
    try {
      const urlObj = new URL(trimmed);
      const allowedHosts = ['drive.google.com', 'www.drive.google.com'];
      if (urlObj.protocol !== 'https:' || !allowedHosts.some(host => urlObj.hostname === host)) {
        return { 
          success: false, 
          message: 'Hanya link Google Drive yang diperbolehkan.' 
        };
      }
      
      // Only allow folder URLs, not file download links
      if (!urlObj.pathname.includes('/folders/')) {
        return { 
          success: false, 
          message: 'URL harus merupakan link ke folder Google Drive.' 
        };
      }
    } catch (e) {
      return { 
        success: false, 
        message: 'Format URL tidak valid. Gunakan link Google Drive sharing.' 
      };
    }
    
    setDriveFolderUrlState(trimmed);
    return { success: true, message: 'Link referensi disimpan di browser ini. Ubah FOLDER_ID di Apps Script untuk mengganti tujuan unggahan.' };
  };

  const updateDriveWebhookUrl = (url: string): { success: boolean; message: string } => {
    if (driveWebhookManagedByBuild) {
      return { success: false, message: 'Webhook diatur melalui GitHub Actions. Ubah DRIVE_WEBHOOK_URL dan deploy ulang.' };
    }
    const trimmed = url.trim();
    if (!trimmed) {
      setDriveWebhookUrlState('');
      return { success: true, message: 'Link Webhook Google Apps Script dikosongkan.' };
    }
    
    if (!isValidWebhookUrl(trimmed)) {
      return { success: false, message: 'URL harus berupa Google Apps Script Web App HTTPS yang berakhir dengan /exec.' };
    }

    setDriveWebhookUrlState(trimmed);
    if (trimmed !== driveWebhookUrl) {
      setJourneys(prev => Object.fromEntries(Object.entries(prev).map(([id, journey]) => [id, {
        ...journey,
        driveSyncStatus: Array.from({ length: 8 }, (_, i) => i + 1).every(stageId => journey.stages[stageId]?.completed)
          ? 'pending' : journey.driveSyncStatus,
      }])));
    }
    return { success: true, message: 'Link Webhook Google Apps Script berhasil disimpan!' };
  };

  const updateAppSettings = (settings: AppSettings): { success: boolean; message: string } => {
    const names = settings.classNames.map(c => c.className.trim().toLowerCase());
    const hasValidClasses = settings.classNames.length > 0 && new Set(names).size === names.length &&
      settings.classNames.every(c => c.className.trim() && Number.isInteger(c.absentRangeMin) &&
        Number.isInteger(c.absentRangeMax) && c.absentRangeMin >= 1 && c.absentRangeMax >= c.absentRangeMin);
    if (!hasValidClasses || typeof settings.allowEarlyPhaseTwo !== 'boolean') {
      return { success: false, message: 'Pengaturan tidak valid.' };
    }
    setAppSettings({
      classNames: settings.classNames.map(c => ({ ...c, className: c.className.trim() })),
      allowEarlyPhaseTwo: settings.allowEarlyPhaseTwo,
    });
    return { success: true, message: 'Pengaturan berhasil disimpan!' };
  };

  const getStudentJourney = (studentId: string): StudentJourney => {
    if (journeys[studentId]) {
      return journeys[studentId];
    }
    const student = allStudents.find((s) => s.id === studentId);
    return {
      studentId,
      studentName: student?.name || 'Siswa',
      studentGender: student?.gender || 'L',
      studentClass: student?.class || 'Kelas X',
      studentAbsentNumber: student?.absentNumber || 1,
      confidenceScore: 0,
      lastActiveStage: 1,
      stages: {},
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
  };

  const saveStageAnswer = (studentId: string, stageId: number, answers: Record<string, any>) => {
    setJourneys((prev) => {
      const student = allStudents.find((s) => s.id === studentId);
      const current = prev[studentId] || {
        studentId,
        studentName: student?.name || activeStudent?.name || 'Siswa',
        studentGender: student?.gender || activeStudent?.gender || 'L',
        studentClass: student?.class || activeStudent?.class || 'Kelas X',
        studentAbsentNumber: student?.absentNumber || activeStudent?.absentNumber || 1,
        confidenceScore: 0,
        lastActiveStage: 1,
        stages: {},
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const updatedStages = {
        ...current.stages,
        [stageId]: {
          completed: true,
          completedAt: nowTime,
          answers,
        },
      };

      const isAllCompleted = Array.from({ length: 8 }, (_, i) => i + 1)
        .every(id => updatedStages[id]?.completed);

      return {
        ...prev,
        [studentId]: {
          ...current,
          stages: updatedStages,
          lastActiveStage: Math.min(8, stageId + 1),
          confidenceScore: getConfidenceScore(updatedStages),
          updatedAt: nowTime,
          driveSyncStatus: isAllCompleted && driveWebhookUrl ? 'pending' : undefined,
        },
      };
    });
  };

  const retryDriveSync = (studentId: string): void => {
    setJourneys((prev) => {
      const current = prev[studentId];
      if (!current || !driveWebhookUrl ||
        !Array.from({ length: 8 }, (_, i) => i + 1).every(id => current.stages[id]?.completed)) return prev;
      return {
        ...prev,
        [studentId]: {
          ...current,
          driveSyncStatus: 'pending',
        },
      };
    });
  };

  const resetStudentProgress = (studentId: string) => {
    for (let stageId = 1; stageId <= 8; stageId++) {
      try { localStorage.removeItem(`gm_stage_draft_${studentId}_${stageId}`); } catch { setStorageError(true); }
    }
    setJourneys((prev) => {
      const student = allStudents.find((s) => s.id === studentId);
      return {
        ...prev,
        [studentId]: {
          studentId,
          studentName: student?.name || 'Siswa',
          studentGender: student?.gender || 'L',
          studentClass: student?.class || 'Kelas X',
          studentAbsentNumber: student?.absentNumber || 1,
          confidenceScore: 0,
          lastActiveStage: 1,
          stages: {},
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          driveSyncStatus: undefined,
        },
      };
    });
  };

  const deleteStudent = (studentId: string) => {
    for (let stageId = 1; stageId <= 8; stageId++) {
      try { localStorage.removeItem(`gm_stage_draft_${studentId}_${stageId}`); } catch { setStorageError(true); }
    }
    setJourneys((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setAllStudents((prev) => prev.filter((s) => s.id !== studentId));
    if (activeStudent?.id === studentId) {
      setActiveStudent(null);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeStudent,
        startStudentJourney,
        clearActiveStudent,
        isAdminLoggedIn,
        adminLogin,
        adminLogout,
        adminCredentials,
        updateAdminCredentials,
        allStudents,
        journeys,
        saveStageAnswer,
        getStudentJourney,
        retryDriveSync,
        resetStudentProgress,
        deleteStudent,
        driveFolderUrl,
        updateDriveFolderUrl,
        driveWebhookUrl,
        driveWebhookManagedByBuild,
        updateDriveWebhookUrl,
        appSettings,
        updateAppSettings,
        storageError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
