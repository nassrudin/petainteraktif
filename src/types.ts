export type Role = 'student' | 'admin';
export type Gender = 'L' | 'P';

export interface ActiveStudent {
  id: string;
  name: string;
  gender: Gender;
  class: string;
  absentNumber: number;
  startedAt: string;
  avatarUrl?: string;
}

// Backward compatibility alias
export type User = ActiveStudent;

export interface AdminCredentials {
  username: string;
  password: string;
  name?: string;
}

export interface ClassConfig {
  className: string;
  absentRangeMin: number;
  absentRangeMax: number;
}

export interface AppSettings {
  classNames: ClassConfig[];
  allowEarlyPhaseTwo: boolean;
}

export interface StageField {
  id: string;
  label: string;
  sectionHeader?: string;
  helperText?: string;
  prefixText?: string;
  type: 'text' | 'textarea' | 'slider' | 'checklist' | 'radio' | 'date';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
}

export interface StageDefinition {
  id: number;
  title: string;
  subtitle: string;
  sectionTag: string; // Titik mulai, Challenge, Obstacles, Effort, Critiques, Success of others, Refleksi, Garis akhir
  etapeNumber: 1 | 2;
  etapeTitle: string; // Etape 1: Mengenali diri dan menghadapi tantangan | Etape 2: Belajar dari sekitar dan bertumbuh
  theme: string;
  islandName: string;
  meetingPhase: 1 | 2; // Phase 1: Pos 1-4, Phase 2: Pos 5-8
  color: string;
  badgeName: string;
  badgeIcon: string;
  missionDescription: string;
  fields: StageField[];
  motivationalQuote: string;
  exampleText?: string;
  reminderText?: string;
}

export interface StageAnswer {
  completed: boolean;
  completedAt?: string;
  answers: Record<string, any>;
}

export interface StudentJourney {
  studentId: string;
  studentName: string;
  studentGender: Gender;
  studentClass: string;
  studentAbsentNumber: number;
  confidenceScore: number; // 0-100
  stages: Record<number, StageAnswer>;
  lastActiveStage: number;
  updatedAt: string;
  driveSyncStatus?: 'pending' | 'unverified' | 'failed';
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}
