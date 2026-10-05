import { BackupDocument, DatabaseBackup } from './databaseBackup';

const object = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const date = (value: unknown) => text(value) && Number.isFinite(Date.parse(value));
const integer = (value: unknown, min: number, max: number) => Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 30) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => safeJson(item, depth + 1));
  return object(value) && Object.entries(value).every(([key, item]) =>
    !['__proto__', 'constructor', 'prototype'].includes(key) && safeJson(item, depth + 1));
}

export function isStudentPath(path: string): boolean {
  return /^students\/[^/]+$/.test(path) && !path.slice(9).includes('..') && path.length <= 1509;
}

function validSettings(data: Record<string, any>): boolean {
  if (Object.keys(data).some(key => !['classNames', 'allowEarlyPhaseTwo'].includes(key))) return false;
  if (typeof data.allowEarlyPhaseTwo !== 'boolean' || !Array.isArray(data.classNames) || !data.classNames.length) return false;
  const names = new Set<string>();
  return data.classNames.every(item => {
    if (!object(item) || !text(item.className) || !integer(item.absentRangeMin, 1, 10000) ||
        !integer(item.absentRangeMax, item.absentRangeMin, 10000)) return false;
    const name = item.className.trim().toLowerCase();
    if (names.has(name)) return false;
    names.add(name);
    return true;
  });
}

function validStudent(path: string, data: Record<string, any>): boolean {
  const { student, journey, ownerUid } = data;
  if (Object.keys(data).some(key => !['ownerUid', 'student', 'journey'].includes(key)) || !text(ownerUid) ||
      !object(student) || !object(journey) || student.id !== path.slice(9) || journey.studentId !== student.id ||
      !text(student.name) || !text(student.class) || !['L', 'P'].includes(student.gender) ||
      !integer(student.absentNumber, 1, 10000) || !date(student.startedAt) || !date(journey.updatedAt) ||
      !integer(journey.lastActiveStage, 1, 8) || !object(journey.stages)) return false;
  return Object.entries(journey.stages).every(([id, stage]) =>
    /^[1-8]$/.test(id) && object(stage) && typeof stage.completed === 'boolean' && object(stage.answers) &&
    (stage.completedAt === undefined || date(stage.completedAt)));
}

export function validateDatabaseBackup(value: unknown, projectId: string): DatabaseBackup {
  if (!object(value) || value.format !== 'journey-map-database-backup' || value.version !== 1 ||
      !object(value.source) || value.source.projectId !== projectId || value.source.databaseId !== '(default)' ||
      value.source.storage !== 'firebase-server' || !date(value.exportedAt) ||
      !Array.isArray(value.documents) || !Array.isArray(value.stageDefinitions) || !safeJson(value)) {
    throw new Error('Berkas bukan backup JSON yang didukung atau berasal dari proyek Firebase lain.');
  }
  const paths = new Set<string>();
  let count = 0;
  for (const entry of value.documents) {
    if (!object(entry) || !text(entry.path) || !object(entry.data) || paths.has(entry.path)) {
      throw new Error('Dokumen backup tidak valid atau memiliki ID duplikat.');
    }
    paths.add(entry.path);
    if (isStudentPath(entry.path)) {
      if (!validStudent(entry.path, entry.data)) throw new Error(`Data siswa tidak valid: ${entry.path}`);
      count++;
    } else if (entry.path !== 'settings/public' || !validSettings(entry.data)) {
      throw new Error('Backup berisi dokumen di luar data siswa/pengaturan atau pengaturan tidak valid.');
    }
  }
  if (count !== value.studentCount) throw new Error('Jumlah siswa tidak cocok dengan isi backup.');
  return value as DatabaseBackup;
}

export interface MaintenanceOperation {
  path: string;
  expected: Record<string, unknown> | null;
  data: Record<string, unknown> | null; // null means delete
}

export interface MaintenancePlan {
  kind: 'restore' | 'delete';
  studentCount: number;
  added: number;
  replaced: number;
  restoresSettings: boolean;
  operations: MaintenanceOperation[];
}

export function makeRestorePlan(backup: DatabaseBackup, current: BackupDocument[]): MaintenancePlan {
  const existing = new Map(current.map(item => [item.path, item.data]));
  const students = backup.documents.filter(item => isStudentPath(item.path));
  const added = students.filter(item => !existing.has(item.path)).length;
  return {
    kind: 'restore', studentCount: students.length, added, replaced: students.length - added,
    restoresSettings: backup.documents.some(item => item.path === 'settings/public'),
    operations: backup.documents.map(item => ({ path: item.path, expected: existing.get(item.path) ?? null, data: item.data })),
  };
}

export function makeDeletePlan(current: BackupDocument[]): MaintenancePlan {
  if (current.some(item => !isStudentPath(item.path))) throw new Error('Penghapusan hanya boleh mencakup data siswa.');
  return { kind: 'delete', studentCount: current.length, added: 0, replaced: 0, restoresSettings: false,
    operations: current.map(item => ({ path: item.path, expected: item.data, data: null })) };
}

export function sameDocument(a: unknown, b: unknown): boolean {
  const encode = (value: unknown) => JSON.stringify(value, (_key, item) =>
    object(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  return encode(a) === encode(b);
}

// Small transactions keep requests bounded. Earlier chunks remain committed if a later chunk fails.
export async function applyMaintenancePlan(plan: MaintenancePlan,
  commit: (operations: MaintenanceOperation[]) => Promise<void>,
  onProgress?: (completed: number, total: number) => void): Promise<number> {
  if (!['restore', 'delete'].includes(plan.kind)) throw new Error('Jenis operasi tidak valid.');
  let completed = 0;
  onProgress?.(0, plan.operations.length);
  const chunks: MaintenanceOperation[][] = [];
  let chunk: MaintenanceOperation[] = [];
  let bytes = 0;
  for (const operation of plan.operations) {
    if ((!isStudentPath(operation.path) && operation.path !== 'settings/public') ||
        (plan.kind === 'delete' && (!isStudentPath(operation.path) || operation.data !== null)) ||
        (plan.kind === 'restore' && (!object(operation.data) ||
          !(isStudentPath(operation.path) ? validStudent(operation.path, operation.data) : validSettings(operation.data))))) {
      throw new Error('Rencana operasi berisi dokumen di luar cakupan.');
    }
    const size = new TextEncoder().encode(JSON.stringify(operation)).length;
    if (chunk.length && (chunk.length >= 50 || bytes + size > 2 * 1024 * 1024)) {
      chunks.push(chunk); chunk = []; bytes = 0;
    }
    chunk.push(operation); bytes += size;
  }
  if (chunk.length) chunks.push(chunk);
  for (const operations of chunks) {
    try { await commit(operations); }
    catch (error) {
      throw new Error(`${completed} dari ${plan.operations.length} dokumen sudah diproses. Operasi dihentikan. ${error instanceof Error ? error.message : 'Koneksi Firebase gagal.'} Muat ulang ringkasan sebelum mencoba lagi.`);
    }
    completed += operations.length;
    onProgress?.(completed, plan.operations.length);
  }
  return completed;
}
