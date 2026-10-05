import { AppSettings, StageDefinition } from '../types';

export interface BackupDocument {
  path: string;
  data: Record<string, unknown>;
}

export interface DatabaseBackup {
  format: 'journey-map-database-backup';
  version: 1;
  startedAt: string;
  exportedAt: string;
  source: { projectId: string; databaseId: '(default)'; storage: 'firebase-server' };
  scope: ['students', 'settings/public'];
  studentCount: number;
  documents: BackupDocument[];
  stageDefinitions: StageDefinition[];
  defaultSettings: AppSettings;
}

// A failed server read rejects the entire export; never download a partial backup.
export async function collectDatabaseBackup(options: {
  projectId: string;
  readStudents: () => Promise<BackupDocument[]>;
  readSettings: () => Promise<BackupDocument | null>;
  stageDefinitions: StageDefinition[];
  defaultSettings: AppSettings;
}): Promise<DatabaseBackup> {
  const startedAt = new Date().toISOString();
  const [students, settings] = await Promise.all([options.readStudents(), options.readSettings()]);
  return {
    format: 'journey-map-database-backup', version: 1, startedAt,
    exportedAt: new Date().toISOString(),
    source: { projectId: options.projectId, databaseId: '(default)', storage: 'firebase-server' },
    scope: ['students', 'settings/public'], studentCount: students.length,
    // Keep raw server fields and document IDs, including ownerUid and original stage numbers.
    documents: [...students, ...(settings ? [settings] : [])],
    stageDefinitions: options.stageDefinitions, defaultSettings: options.defaultSettings,
  };
}

export function backupFileName(exportedAt: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(exportedAt));
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `backup_peta_percaya_diri_${value('year')}-${value('month')}-${value('day')}_${value('hour')}${value('minute')}${value('second')}_WIB.json`;
}
