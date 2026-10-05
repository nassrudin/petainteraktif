const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

function tsModule(path) {
  const mod = { exports: {} };
  new Function('module', 'exports', transformSync(fs.readFileSync(path, 'utf8'), { loader: 'ts', format: 'cjs' }).code)(mod, mod.exports);
  return mod.exports;
}
const { backupMilestone, driveFolderId } = tsModule('src/utils/driveBackup.ts');
const { validateDatabaseBackup, makeRestorePlan } = tsModule('src/utils/databaseMaintenance.ts');
const settings = { classNames: [{ className: 'X-1', absentRangeMin: 1, absentRangeMax: 36 }], allowEarlyPhaseTwo: false };
const revision = '2026-10-05T00:00:00.123Z';
function student(id) {
  return { ownerUid: `owner-${id}`, student: { id, name: `Siswa ${id}`, class: 'X-1', absentNumber: 1, gender: 'P', startedAt: revision },
    journey: { studentId: id, updatedAt: revision, lastActiveStage: 5,
      stages: Object.fromEntries([1, 2, 3, 4].map(id => [id, { completed: true, completedAt: revision, answers: { response: `Jawaban ${id}` } }])) } };
}
function fixture() {
  const context = vm.createContext({ JM_PROJECT_ID: 'test', JM_STAGE_DEFINITIONS: [], JM_DEFAULT_SETTINGS: settings,
    Utilities: { formatDate: () => '2026-10-05_070000', newBlob: (content, type, name) => ({ content, type, name }) } });
  vm.runInContext(fs.readFileSync('google-apps-script-sync.js', 'utf8'), context);
  const createdAt = new Date(Date.now() - 1000).toISOString().replace('Z', '123Z');
  const job = { path: 'driveBackupJobs/00000000-0000-4000-8000-000000000001', snapshotAt: createdAt,
    data: { studentId: 'a', milestone: 4, createdAt: new Date(Date.now() - 3000).toISOString(), revision } };
  const reads = [], updates = [], files = new Map();
  const document = (path, data) => ({ name: `projects/test/databases/(default)/documents/${path}`, fields: context.encodeFirestore(data).mapValue.fields });
  context.firestoreRequest = (path) => {
    reads.push(path);
    if (path.startsWith('/students?')) {
      if (path.includes('pageToken=')) return { documents: [document('students/b', student('b'))] };
      return { documents: [document('students/a', student('a'))], nextPageToken: 'next page' };
    }
    if (path.startsWith('/settings/public?')) return document('settings/public', settings);
    if (path.startsWith('/studentAccessKeys?')) return { documents: [document('studentAccessKeys/a', { code: 'abcd1234abcd1234abcd1234abcd1234' })] };
    if (path.startsWith('/studentAccessCodes?')) return { documents: [document('studentAccessCodes/abcd1234abcd1234abcd1234abcd1234', { studentId: 'a' })] };
    throw new Error(`Unexpected request ${path}`);
  };
  context.patchDocument = (path, values) => updates.push({ path, values: JSON.parse(JSON.stringify(values)) });
  const folder = {
    getFilesByName: name => ({ hasNext: () => files.has(name), next: () => files.get(name) }),
    createFile: blob => { const file = { getBlob: () => ({ getDataAsString: () => blob.content }), getUrl: () => 'https://drive.google.com/file/d/backup-file/view' }; files.set(blob.name, file); return file; },
  };
  return { context, job, reads, updates, files, folder, document };
}

test('queues only completed Pos 4 or Pos 8 with all previous positions filled', () => {
  const journey = student('a').journey;
  assert.equal(backupMilestone(4, journey), 4);
  assert.equal(backupMilestone(3, journey), null);
  assert.equal(backupMilestone(8, journey), null);
  delete journey.stages[2];
  assert.equal(backupMilestone(4, journey), null);
  for (let id = 1; id <= 8; id++) journey.stages[id] = { completed: true, answers: {} };
  assert.equal(backupMilestone(8, journey), 8);
});

test('Drive settings accept only a real Google Drive folder URL', () => {
  assert.equal(driveFolderId('https://drive.google.com/drive/folders/abcdefgh?usp=sharing'), 'abcdefgh');
  assert.equal(driveFolderId('https://drive.google.com/drive/u/0/folders/abcdefgh'), 'abcdefgh');
  for (const value of ['http://drive.google.com/drive/folders/abcdefgh', 'https://drive.google.com.evil.test/drive/folders/abcdefgh', 'https://drive.google.com/open?id=abcdefgh', 'javascript:alert(1)']) assert.equal(driveFolderId(value), null);
});

test('automatic backup includes every page and settings at the exact same server timestamp, and can be restored', () => {
  const { context, job, reads, updates, files, folder } = fixture();
  context.processBackupJob(job, folder);
  const contents = JSON.parse([...files.values()][0].getBlob().getDataAsString());
  const backup = validateDatabaseBackup(contents, 'test');
  assert.equal(backup.studentCount, 2);
  assert.equal(backup.version, 2);
  assert.equal(backup.accessCodeCount, 1);
  assert.equal(backup.documents.find(item => item.path === 'studentAccessKeys/a').data.code, 'abcd1234abcd1234abcd1234abcd1234');
  assert.equal(backup.documents[0].data.ownerUid, 'owner-a');
  assert.equal(backup.documents[1].data.student.id, 'b');
  assert.equal(backup.documents[2].path, 'settings/public');
  assert.equal(contents.automatic.snapshotAt, job.snapshotAt);
  assert.notEqual(contents.automatic.snapshotAt, job.data.createdAt);
  assert.ok(reads.every(path => path.includes(`readTime=${encodeURIComponent(job.snapshotAt)}`)));
  assert.ok(reads[1].includes('pageToken=next%20page'));
  assert.equal(makeRestorePlan(backup, []).added, 2);
  assert.equal(updates[0].values.status, 'complete');
});

test('a failed acknowledgement retries the same immutable file without exporting again', () => {
  const { context, job, folder, files, reads } = fixture();
  context.patchDocument = () => { throw new Error('ack failed'); };
  assert.throws(() => context.processBackupJob(job, folder), /ack failed/);
  const firstReads = reads.length;
  let complete = false;
  context.patchDocument = (_path, values) => { complete = values.status === 'complete'; };
  context.processBackupJob(job, folder);
  assert.equal(complete, true);
  assert.equal(files.size, 1);
  assert.equal(reads.length, firstReads);
});

test('server read failure or mismatched snapshot creates no partial backup', () => {
  for (const failure of ['page', 'settings', 'revision', 'access']) {
    const { context, job, folder, files, updates } = fixture();
    const read = context.firestoreRequest;
    context.firestoreRequest = (path) => {
      if ((failure === 'page' && path.includes('pageToken=')) || (failure === 'settings' && path.startsWith('/settings/')) || (failure === 'access' && path.startsWith('/studentAccess'))) throw new Error('server failed');
      return read(path);
    };
    if (failure === 'revision') job.data.revision = 'changed';
    assert.throws(() => context.processBackupJob(job, folder), /server failed|tidak cocok/);
    assert.equal(files.size, 0);
    assert.equal(updates.length, 0);
  }
});

test('a mismatched access code cancels the Drive file and existing version 1 backups remain retryable', () => {
  const mismatch = fixture();
  const read = mismatch.context.firestoreRequest;
  mismatch.context.firestoreRequest = path => path.startsWith('/studentAccessCodes?')
    ? { documents: [mismatch.document('studentAccessCodes/abcd1234abcd1234abcd1234abcd1234', { studentId: 'b' })] } : read(path);
  assert.throws(() => mismatch.context.processBackupJob(mismatch.job, mismatch.folder), /Kode akses/);
  assert.equal(mismatch.files.size, 0);
  assert.equal(mismatch.updates.length, 0);
  const legacy = fixture();
  legacy.context.processBackupJob(legacy.job, legacy.folder);
  const [fileName, file] = [...legacy.files.entries()][0];
  const original = JSON.parse(file.getBlob().getDataAsString());
  original.version = 1; delete original.accessCodeCount;
  original.documents = original.documents.filter(item => !item.path.startsWith('studentAccess'));
  legacy.files.set(fileName, { getBlob: () => ({ getDataAsString: () => JSON.stringify(original) }), getUrl: () => 'https://drive.google.com/file/d/backup-file/view' });
  const before = legacy.reads.length;
  legacy.context.processBackupJob(legacy.job, legacy.folder);
  assert.equal(legacy.reads.length, before);
});

test('expired snapshots are reported without silently substituting current database data', () => {
  const { context, job, folder, reads, files, updates } = fixture();
  job.snapshotAt = new Date(Date.now() - 61 * 60000).toISOString();
  context.processBackupJob(job, folder);
  assert.equal(updates[0].values.status, 'expired');
  assert.equal(reads.length, 0);
  assert.equal(files.size, 0);
});

test('failed uploads do not mark a job successful', () => {
  const { context, job, folder, updates } = fixture();
  folder.createFile = () => { throw new Error('Drive full'); };
  assert.throws(() => context.processBackupJob(job, folder), /Drive full/);
  assert.equal(updates.length, 0);
});

test('the queue processor reads the commit time from Firestore metadata rather than the rounded createdAt field', () => {
  const { context, job, document, folder } = fixture();
  let processed;
  context.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  context.readBackupConfig = () => ({ enabled: true, folder: { ...folder, getName: () => 'Backup' } });
  context.firestoreRequest = () => [{ document: { ...document(job.path, job.data), createTime: job.snapshotAt } }];
  context.processBackupJob = value => { processed = value; };
  context.processDriveBackups();
  assert.equal(processed.snapshotAt, job.snapshotAt);
  assert.notEqual(processed.snapshotAt, processed.data.createdAt);
});
