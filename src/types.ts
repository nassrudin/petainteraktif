export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  class?: string;
  avatarUrl?: string;
}

export interface StageField {
  id: string;
  label: string;
  helperText?: string;
  type: 'text' | 'textarea' | 'slider' | 'checklist' | 'radio';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface StageDefinition {
  id: number;
  title: string;
  subtitle: string;
  theme: string;
  islandName: string;
  color: string;
  badgeName: string;
  badgeIcon: string;
  missionDescription: string;
  fields: StageField[];
  motivationalQuote: string;
}

export interface StageAnswer {
  completed: boolean;
  completedAt?: string;
  answers: Record<string, any>;
}

export interface StudentJourney {
  userId: string;
  confidenceScore: number; // 0-100
  stages: Record<number, StageAnswer>;
  lastActiveStage: number;
  driveExportedUrl?: string;
  driveExportedAt?: string;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}
