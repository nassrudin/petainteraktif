import React, { createContext, useContext, useState, useEffect } from 'react';
import { ActiveStudent, StudentJourney, AdminCredentials, Gender, AppSettings, ClassConfig } from './types';
import { INITIAL_STUDENTS, INITIAL_JOURNEYS, DEFAULT_ADMIN, DEFAULT_CLASS_CONFIGS } from './data';

// Define default drive folder URL here to avoid circular imports
export const DEFAULT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z?usp=sharing';

interface AppContextType {
  activeStudent: ActiveStudent | null;
  startStudentJourney: (name: string, gender: Gender, studentClass: string, absentNumber: number) => void;
  clearActiveStudent: () => void;
  isAdminLoggedIn: boolean;
  adminLogin: (user: string, pass: string) => boolean;
  adminLogout: () => void;
  adminCredentials: AdminCredentials;
  updateAdminCredentials: (
    oldPass: string,
    newUsername: string,
    newPass: string
  ) => { success: boolean; message: string };
  allStudents: ActiveStudent[];
  journeys: Record<string, StudentJourney>;
  saveStageAnswer: (studentId: string, stageId: number, answers: Record<string, any>) => void;
  getStudentJourney: (studentId: string) => StudentJourney;
  simulateGoogleDriveSync: (studentId: string) => Promise<string>;
  resetStudentProgress: (studentId: string) => void;
  deleteStudent: (studentId: string) => void;
  driveFolderUrl: string;
  updateDriveFolderUrl: (url: string) => { success: boolean; message: string };
  appSettings: AppSettings;
  updateAppSettings: (settings: AppSettings) => { success: boolean; message: string };
}

const STORAGE_KEY_ACTIVE_STUDENT = 'gm_active_student_v2';
const STORAGE_KEY_ALL_STUDENTS = 'gm_all_students_v2';
const STORAGE_KEY_JOURNEYS = 'gm_journeys_v2';
const STORAGE_KEY_ADMIN_AUTH = 'gm_admin_auth_v2';
const STORAGE_KEY_ADMIN_LOGGED_IN = 'gm_admin_logged_in_v2';
const STORAGE_KEY_DRIVE_FOLDER = 'gm_drive_folder_url_v2';
const STORAGE_KEY_APP_SETTINGS = 'gm_app_settings_v2';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Admin credentials
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH);
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN;
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_ADMIN_LOGGED_IN) === 'true';
  });

  // App settings (class configurations)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_APP_SETTINGS);
    return saved ? JSON.parse(saved) : { classNames: DEFAULT_CLASS_CONFIGS };
  });

  // Google Drive folder URL (configurable by Admin)
  const [driveFolderUrl, setDriveFolderUrlState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DRIVE_FOLDER);
    return saved || DEFAULT_DRIVE_FOLDER_URL;
  });

  // Students list (for admin dashboard viewing)
  const [allStudents, setAllStudents] = useState<ActiveStudent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ALL_STUDENTS);
    return saved ? JSON.parse(saved) : []; // Empty array!
  });

  // Currently active student filling the journey
  const [activeStudent, setActiveStudent] = useState<ActiveStudent | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_STUDENT);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Journeys map
  const [journeys, setJourneys] = useState<Record<string, StudentJourney>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_JOURNEYS);
    return saved ? JSON.parse(saved) : {}; // Empty object!
  });

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, JSON.stringify(adminCredentials));
  }, [adminCredentials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ADMIN_LOGGED_IN, String(isAdminLoggedIn));
  }, [isAdminLoggedIn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_APP_SETTINGS, JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DRIVE_FOLDER, driveFolderUrl);
  }, [driveFolderUrl]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ALL_STUDENTS, JSON.stringify(allStudents));
  }, [allStudents]);

  useEffect(() => {
    if (activeStudent) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_STUDENT, JSON.stringify(activeStudent));
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_STUDENT);
    }
  }, [activeStudent]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_JOURNEYS, JSON.stringify(journeys));
  }, [journeys]);

  // Actions
  const startStudentJourney = (name: string, gender: Gender, studentClass: string, absentNumber: number) => {
    const trimmedName = name.trim();
    const trimmedClass = studentClass.trim();
    if (!trimmedName || !trimmedClass || absentNumber < 1) return;

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
        id: `student-${Date.now()}-${absentNumber}`,
        name: trimmedName,
        gender,
        class: trimmedClass,
        absentNumber,
        startedAt: nowStr,
        avatarUrl: gender === 'L' 
          ? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}&gender=male`
          : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}&gender=female`,
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
          confidenceScore: 50,
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
    if (
      user.trim() === adminCredentials.username.trim() &&
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
    if (!newUsername.trim()) {
      return { success: false, message: 'Username baru tidak boleh kosong.' };
    }
    if (!newPass.trim() || newPass.trim().length < 4) {
      return { success: false, message: 'Password baru minimal 4 karakter.' };
    }

    setAdminCredentials({
      ...adminCredentials,
      username: newUsername.trim(),
      password: newPass.trim(),
    });

    return { success: true, message: 'Username & Password guru/admin berhasil diubah!' };
  };

  const updateDriveFolderUrl = (url: string): { success: boolean; message: string } => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { success: false, message: 'Link Google Drive tidak boleh kosong.' };
    }
    setDriveFolderUrlState(trimmed);
    return { success: true, message: 'Link folder Google Drive berhasil diperbarui!' };
  };

  const updateAppSettings = (settings: AppSettings): { success: boolean; message: string } => {
    const hasValidClasses = settings.classNames.length > 0 && 
                           settings.classNames.every(c => c.className && c.absentRangeMin >= 1 && c.absentRangeMax >= c.absentRangeMin);
    if (!hasValidClasses) {
      return { success: false, message: 'Konfigurasi kelas tidak valid.' };
    }
    setAppSettings(settings);
    return { success: true, message: 'Pengaturan kelas berhasil disimpan!' };
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
      confidenceScore: 50,
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
        confidenceScore: 50,
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

      // Recalculate confidence score based on stage answers
      let calculatedScore = 50;
      if (answers.confidence_scale !== undefined) {
        calculatedScore = Math.min(100, Math.max(10, answers.confidence_scale * 20));
      } else {
        const completedCount = Object.keys(updatedStages).length;
        calculatedScore = Math.min(100, 20 + completedCount * 10);
      }

      // Check if all 8 stages are completed: automatically mark synced to Google Drive!
      const isAllCompleted = Object.keys(updatedStages).length === 8;
      const driveExportedUrl = isAllCompleted ? driveFolderUrl : current.driveExportedUrl;
      const driveExportedAt = isAllCompleted ? (current.driveExportedAt || nowTime) : current.driveExportedAt;

      return {
        ...prev,
        [studentId]: {
          ...current,
          stages: updatedStages,
          lastActiveStage: Math.min(8, stageId + 1),
          confidenceScore: Math.round(calculatedScore),
          updatedAt: nowTime,
          driveExportedUrl,
          driveExportedAt,
        },
      };
    });
  };

  const simulateGoogleDriveSync = async (studentId: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    setJourneys((prev) => {
      const current = prev[studentId];
      if (!current) return prev;
      return {
        ...prev,
        [studentId]: {
          ...current,
          driveExportedUrl: driveFolderUrl,
          driveExportedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      };
    });
    return driveFolderUrl;
  };

  const resetStudentProgress = (studentId: string) => {
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
          confidenceScore: 40,
          lastActiveStage: 1,
          stages: {},
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          driveExportedUrl: undefined,
          driveExportedAt: undefined,
        },
      };
    });
  };

  const deleteStudent = (studentId: string) => {
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
        simulateGoogleDriveSync,
        resetStudentProgress,
        deleteStudent,
        driveFolderUrl,
        updateDriveFolderUrl,
        appSettings,
        updateAppSettings,
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
