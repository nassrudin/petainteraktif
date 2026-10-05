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

const safeId = (value: unknown): value is string => text(value) && !value.includes('/') && !value.includes('..') && value.length <= 1400;
export const isAccessKeyPath = (path: string) => path.startsWith('studentAccessKeys/') && safeId(path.slice('studentAccessKeys/'.length));
export const isAccessCodePath = (path: string) => /^studentAccessCodes\/[a-f0-9]{32}$/.test(path);
const validAccessData = (path: string, data: Record<string, any>) => isAccessKeyPath(path)
  ? Object.keys(data).length === 1 && typeof data.code === 'string' && /^[a-f0-9]{32}$/.test(data.code)
  : isAccessCodePath(path) && Object.keys(data).length === 1 && safeId(data.studentId);

function checkAccessPairs(documents: BackupDocument[]): number {
  const entries = new Map(documents.map(item => [item.path, item.data]));
  let count = 0;
  for (const item of documents) {
    if (isAccessKeyPath(item.path)) {
      const id = item.path.slice('studentAccessKeys/'.length);
      if (!entries.has(`students/${id}`) || entries.get(`studentAccessCodes/${item.data.code}`)?.studentId !== id) {
        throw new Error('Kode akses tidak cocok dengan siswa atau pemetaan kode dalam backup.');
      }
      count++;
    } else if (isAccessCodePath(item.path) && entries.get(`studentAccessKeys/${item.data.studentId}`)?.code !== item.path.slice('studentAccessCodes/'.length)) {
      throw new Error('Pemetaan kode akses tidak cocok dengan kunci siswa dalam backup.');
    }
  }
  return count;
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
  if (!object(value) || value.format !== 'journey-map-database-backup' || ![1, 2].includes(value.version) ||
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
    } else if ((isAccessKeyPath(entry.path) || isAccessCodePath(entry.path)) && value.version === 2) {
      if (!validAccessData(entry.path, entry.data)) throw new Error('Data kode akses tidak valid.');
    } else if (entry.path !== 'settings/public' || !validSettings(entry.data)) {
      throw new Error('Backup berisi dokumen di luar data siswa/pengaturan atau pengaturan tidak valid.');
    }
  }
  if (count !== value.studentCount) throw new Error('Jumlah siswa tidak cocok dengan isi backup.');
  const accessCodeCount = checkAccessPairs(value.documents);
  if (value.version === 2 && accessCodeCount !== value.accessCodeCount) throw new Error('Jumlah kode akses tidak cocok dengan isi backup.');
  return value as DatabaseBackup;
}

export interface MaintenanceOperation {
  path: string;
  expected: Record<string, unknown> | null;
  data: Record<string, unknown> | null; // null means delete
  group?: string; // A student's answers, key and code index must commit together.
}

export interface MaintenancePlan {
  kind: 'restore' | 'delete';
  studentCount: number;
  added: number;
  replaced: number;
  restoresSettings: boolean;
  accessCodeCount: number;
  operations: MaintenanceOperation[];
}

export function makeRestorePlan(backup: DatabaseBackup, current: BackupDocument[]): MaintenancePlan {
  const existing = new Map(current.map(item => [item.path, item.data]));
  const students = backup.documents.filter(item => isStudentPath(item.path));
  const added = students.filter(item => !existing.has(item.path)).length;
  const incoming = new Map(backup.documents.map(item => [item.path, item.data]));
  const operations: MaintenanceOperation[] = [];
  const operation = (path: string, data: Record<string, unknown> | null, group?: string): MaintenanceOperation =>
    ({ path, expected: existing.get(path) ?? null, data, ...(group ? { group } : {}) });
  for (const student of students) {
    const id = student.path.slice('students/'.length);
    const keyPath = `studentAccessKeys/${id}`;
    const key = incoming.get(keyPath);
    operations.push(operation(student.path, student.data, student.path));
    if (!key) continue; // A version 1 backup preserves the current code.
    const indexPath = `studentAccessCodes/${key.code}`;
    const occupied = existing.get(indexPath);
    if (occupied && occupied.studentId !== id) throw new Error('Kode dalam backup sudah dipakai siswa lain. Restore dibatalkan agar akses tidak tertukar.');
    const oldCode = existing.get(keyPath)?.code;
    if (typeof oldCode === 'string' && oldCode !== key.code) {
      const oldPath = `studentAccessCodes/${oldCode}`;
      if (existing.get(oldPath)?.studentId === id) operations.push(operation(oldPath, null, student.path));
    }
    operations.push(operation(keyPath, key, student.path), operation(indexPath, incoming.get(indexPath)!, student.path));
  }
  const settings = incoming.get('settings/public');
  if (settings) operations.push(operation('settings/public', settings));
  return {
    kind: 'restore', studentCount: students.length, added, replaced: students.length - added,
    restoresSettings: backup.documents.some(item => item.path === 'settings/public'),
    accessCodeCount: checkAccessPairs(backup.documents), operations,
  };
}

export function makeDeletePlan(current: BackupDocument[]): MaintenancePlan {
  if (current.some(item => !isStudentPath(item.path) && !isAccessKeyPath(item.path) && !isAccessCodePath(item.path))) throw new Error('Penghapusan hanya boleh mencakup data siswa dan kode aksesnya.');
  const accessCodeCount = checkAccessPairs(current);
  const operations: MaintenanceOperation[] = [];
  for (const student of current.filter(item => isStudentPath(item.path))) {
    const id = student.path.slice('students/'.length);
    const related = current.filter(item => item.path === student.path || item.path === `studentAccessKeys/${id}` ||
      (isAccessCodePath(item.path) && item.data.studentId === id));
    operations.push(...related.map(item => ({ path: item.path, expected: item.data, data: null, group: student.path })));
  }
  return { kind: 'delete', studentCount: current.filter(item => isStudentPath(item.path)).length, added: 0, replaced: 0, restoresSettings: false, accessCodeCount, operations };
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
  const units: MaintenanceOperation[][] = [];
  for (const operation of plan.operations) {
    const access = isAccessKeyPath(operation.path) || isAccessCodePath(operation.path);
    const removesOldCode = plan.kind === 'restore' && isAccessCodePath(operation.path) && operation.data === null && Boolean(operation.group);
    if ((!isStudentPath(operation.path) && operation.path !== 'settings/public' && !access) ||
        (plan.kind === 'delete' && ((!isStudentPath(operation.path) && !access) || operation.data !== null)) ||
        (plan.kind === 'restore' && !removesOldCode && (!object(operation.data) ||
          !(isStudentPath(operation.path) ? validStudent(operation.path, operation.data) : access ? validAccessData(operation.path, operation.data) : validSettings(operation.data))))) {
      throw new Error('Rencana operasi berisi dokumen di luar cakupan.');
    }
    const previous = units[units.length - 1];
    if (operation.group && previous?.[0].group === operation.group) previous.push(operation);
    else units.push([operation]);
  }
  // Validate associated credentials before any transaction is sent to Firebase.
  for (const unit of units) {
    if (!unit.some(item => isAccessKeyPath(item.path) || isAccessCodePath(item.path))) continue;
    const student = unit.find(item => isStudentPath(item.path));
    if (!student || !unit.every(item => item.group === student.path)) throw new Error('Kode akses harus diproses bersama rekaman siswa.');
    if (plan.kind === 'restore') checkAccessPairs(unit.filter(item => item.data !== null).map(item => ({ path: item.path, data: item.data! })));
    else checkAccessPairs(unit.map(item => ({ path: item.path, data: item.expected! })));
    for (const item of unit.filter(item => item.data === null && isAccessCodePath(item.path))) {
      if (item.expected?.studentId !== student.path.slice('students/'.length)) throw new Error('Penghapusan kode akses tidak sesuai dengan siswa.');
    }
  }
  for (const unit of units) {
    const size = new TextEncoder().encode(JSON.stringify(unit)).length;
    if (unit.length > 50 || size > 2 * 1024 * 1024) throw new Error('Data satu siswa melebihi batas transaksi.');
    if (chunk.length && (chunk.length + unit.length > 50 || bytes + size > 2 * 1024 * 1024)) {
      chunks.push(chunk); chunk = []; bytes = 0;
    }
    chunk.push(...unit); bytes += size;
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
