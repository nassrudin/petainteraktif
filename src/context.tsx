import { createContext, useContext } from 'react';
import { ActiveStudent, StudentJourney, StageAnswer, AdminCredentials, Gender, AppSettings } from './types';

export const DEFAULT_DRIVE_FOLDER_URL = '';

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
  saveStageAnswer: (studentId: string, stageId: number, answers: Record<string, any>, expectedStage: StageAnswer | undefined) => void | Promise<void>;
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

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
