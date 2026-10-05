const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const compiled = transformSync(fs.readFileSync('src/utils/databaseBackup.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const mod = { exports: {} };
new Function('module', 'exports', compiled)(mod, mod.exports);
const { collectDatabaseBackup, backupFileName } = mod.exports;
const defaults = { classNames: [], allowEarlyPhaseTwo: false };

test('backup JSON retains all records, ownership, incomplete answers, original numbering and settings', async () => {
  const students = [
    { path: 'students/id-a', data: { ownerUid: 'owner-a', student: { id: 'id-a', class: 'X-1' }, journey: { stages: { 5: { completed: true, answers: { received_criticism: 'Guru\n"Catatan" 😀' } } } } } },
    { path: 'students/id-b', data: { ownerUid: 'owner-b', student: { id: 'id-b', class: 'X-2' }, journey: { stages: {} } } },
  ];
  const settings = { path: 'settings/public', data: { classNames: [{ className: 'X-2', absentRangeMin: 1, absentRangeMax: 36 }], allowEarlyPhaseTwo: true } };
  const backup = await collectDatabaseBackup({ projectId: 'test-project', readStudents: async () => students, readSettings: async () => settings, stageDefinitions: [], defaultSettings: defaults });
  const restored = JSON.parse(JSON.stringify(backup));
  assert.equal(restored.studentCount, 2);
  assert.deepEqual(restored.documents, [...students, settings]);
  assert.equal(restored.source.projectId, 'test-project');
  assert.equal(restored.source.storage, 'firebase-server');
  assert.equal(restored.version, 2);
  assert.ok(Date.parse(restored.exportedAt) >= Date.parse(restored.startedAt));
});

test('failure of either server read rejects the complete backup', async () => {
  const options = { projectId: 'test', stageDefinitions: [], defaultSettings: defaults };
  await assert.rejects(collectDatabaseBackup({ ...options, readStudents: async () => { throw new Error('offline'); }, readSettings: async () => null }), /offline/);
  await assert.rejects(collectDatabaseBackup({ ...options, readStudents: async () => [], readSettings: async () => { throw new Error('permission-denied'); } }), /permission-denied/);
});

test('empty database is exported without fabricating a settings document', async () => {
  const backup = await collectDatabaseBackup({ projectId: 'test', readStudents: async () => [], readSettings: async () => null, stageDefinitions: [], defaultSettings: defaults });
  assert.equal(backup.studentCount, 0);
  assert.deepEqual(backup.documents, []);
  assert.deepEqual(backup.defaultSettings, defaults);
});

test('backup filename uses Jakarta date and time across UTC midnight', () => {
  assert.equal(backupFileName('2026-10-04T18:03:04Z'), 'backup_peta_percaya_diri_2026-10-05_010304_WIB.json');
});

test('backup includes issued access keys and mappings, and fails if their server read fails', async () => {
  const students = [{ path: 'students/a', data: { ownerUid: 'original', student: { id: 'a' } } }];
  const code = 'abcd1234abcd1234abcd1234abcd1234';
  const credentials = [{ path: 'studentAccessKeys/a', data: { code } }, { path: `studentAccessCodes/${code}`, data: { studentId: 'a' } }];
  const options = { projectId: 'test', readStudents: async () => students, readSettings: async () => null, stageDefinitions: [], defaultSettings: defaults };
  const backup = await collectDatabaseBackup({ ...options, readAccess: async supplied => { assert.deepEqual(supplied, students); return credentials; } });
  assert.equal(backup.accessCodeCount, 1);
  assert.deepEqual(backup.documents, [...students, ...credentials]);
  assert.equal(backup.studentCount, 1);
  await assert.rejects(collectDatabaseBackup({ ...options, readAccess: async () => { throw new Error('access read failed'); } }), /access read failed/);
});
