import { StudentJourney } from '../types';

export interface DriveBackupSettings { folderUrl: string; enabled: boolean }
export interface DriveBackupJob {
  id: string;
  studentId: string;
  milestone: 4 | 8;
  status: 'pending' | 'complete' | 'expired';
  createdAt: string;
  completedAt?: string;
  fileUrl?: string;
  error?: string;
  accessCodeCount?: number;
}
export interface DriveBackupWorker { checkedAt: string; error: string; scriptUrl?: string; backupFormatVersion?: number }

export const DEFAULT_BACKUP_FOLDER_URL = 'https://drive.google.com/drive/folders/1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z';
export function driveFolderId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com') return null;
    return /^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{8,100})\/?$/.exec(url.pathname)?.[1] ?? null;
  } catch { return null; }
}
export function backupMilestone(stageId: number, journey: StudentJourney): 4 | 8 | null {
  if (stageId !== 4 && stageId !== 8) return null;
  return Array.from({ length: stageId }, (_, i) => i + 1).every(id => journey.stages[id]?.completed) ? stageId : null;
}
