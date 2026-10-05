const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const compiled = transformSync(fs.readFileSync('src/utils/databaseMaintenance.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const mod = { exports: {} };
new Function('module', 'exports', compiled)(mod, mod.exports);
const { validateDatabaseBackup, makeRestorePlan, makeDeletePlan, applyMaintenancePlan, sameDocument } = mod.exports;
const settings = { path: 'settings/public', data: { classNames: [{ className: 'X-1', absentRangeMin: 1, absentRangeMax: 36 }], allowEarlyPhaseTwo: false } };
function student(id, name = 'Siswa') {
  return { path: `students/${id}`, data: { ownerUid: 'owner-original',
    student: { id, name, gender: 'L', class: 'X-1', absentNumber: 1, startedAt: '2026-10-01T00:00:00Z' },
    journey: { studentId: id, stages: { 5: { completed: true, completedAt: '2026-10-01 10:30', answers: { received_criticism: 'Guru' } } }, lastActiveStage: 6, updatedAt: '2026-10-01T00:00:00Z' } } };
}
function backup(documents) {
  return { format: 'journey-map-database-backup', version: 1, exportedAt: '2026-10-01T00:00:00Z',
    source: { projectId: 'test', databaseId: '(default)', storage: 'firebase-server' },
    studentCount: documents.filter(item => item.path.startsWith('students/')).length, documents, stageDefinitions: [] };
}

test('restore accepts original numbering and ownership; retains unrelated records', () => {
  const selected = JSON.parse(JSON.stringify(backup([student('a', 'Backup'), student('b'), settings])));
  validateDatabaseBackup(selected, 'test');
  const plan = makeRestorePlan(selected, [student('a', 'Terbaru'), student('outside'), settings]);
  assert.equal(plan.added, 1);
  assert.equal(plan.replaced, 1);
  assert.equal(plan.restoresSettings, true);
  assert.equal(plan.operations[0].data.ownerUid, 'owner-original');
  assert.equal(plan.operations[0].data.journey.stages[5].answers.received_criticism, 'Guru');
  assert.ok(plan.operations.every(item => item.path !== 'students/outside'));
});

test('rejects different projects, corrupted counts, duplicate IDs, malformed students and forbidden paths', () => {
  assert.throws(() => validateDatabaseBackup(backup([student('a')]), 'other'), /proyek/);
  assert.throws(() => validateDatabaseBackup({ ...backup([student('a')]), studentCount: 9 }, 'test'), /Jumlah/);
  assert.throws(() => validateDatabaseBackup(backup([student('a'), student('a')]), 'test'), /duplikat/);
  assert.throws(() => validateDatabaseBackup(backup([{ ...student('a'), data: { ...student('a').data, ownerUid: '' } }]), 'test'), /tidak valid/);
  assert.throws(() => validateDatabaseBackup(backup([{ path: 'config/adminRoot', data: {} }]), 'test'), /di luar/);
  assert.throws(() => validateDatabaseBackup(backup([{ path: 'students/a/private/b', data: student('a').data }]), 'test'), /di luar/);
  const unsafe = JSON.parse(JSON.stringify(backup([student('a')])).replace('"owner-original"', '{"__proto__":{"admin":true}}'));
  assert.throws(() => validateDatabaseBackup(unsafe, 'test'), /Berkas/);
});

test('delete plans include only the confirmed student IDs and preserve settings', () => {
  assert.throws(() => makeDeletePlan([settings]), /hanya/);
  const plan = makeDeletePlan([student('a'), student('b')]);
  assert.equal(plan.studentCount, 2);
  assert.ok(plan.operations.every(item => item.data === null));
  assert.deepEqual(plan.operations.map(item => item.path), ['students/a', 'students/b']);
});

test('large operations stop on failure and report committed progress', async () => {
  const plan = makeDeletePlan(Array.from({ length: 121 }, (_, i) => student(String(i))));
  const committed = [];
  const progress = [];
  await assert.rejects(applyMaintenancePlan(plan, async ops => {
    if (committed.length) throw new Error('offline');
    committed.push(...ops);
  }, (done, total) => progress.push([done, total])), /50 dari 121.*offline/);
  assert.equal(committed.length, 50);
  assert.deepEqual(progress, [[0, 121], [50, 121]]);
});

test('a changed document cancels its group before any data in that group is written', async () => {
  const plan = makeDeletePlan([student('a'), student('b')]);
  const server = new Map([student('a', 'Diubah'), student('b')].map(item => [item.path, item.data]));
  await assert.rejects(applyMaintenancePlan(plan, async ops => {
    for (const op of ops) if (!sameDocument(server.get(op.path), op.expected)) throw new Error('berubah');
    for (const op of ops) server.delete(op.path);
  }), /0 dari 2.*berubah/);
  assert.equal(server.size, 2);
  assert.equal(sameDocument({ b: 2, a: 1 }, { a: 1, b: 2 }), true);
});

test('forbidden operations are rejected before any group is committed', async () => {
  const plan = makeDeletePlan([student('a')]);
  plan.operations.push({ path: 'settings/public', data: null, expected: settings.data });
  let writes = 0;
  await assert.rejects(applyMaintenancePlan(plan, async () => { writes++; }), /di luar/);
  assert.equal(writes, 0);
});

test('restore re-creates missing students while leaving existing unrelated students intact', async () => {
  const selected = backup([student('missing'), student('a', 'Backup'), settings]);
  const current = [student('a', 'Saat ini'), student('unrelated')];
  const server = new Map(current.map(item => [item.path, item.data]));
  const plan = makeRestorePlan(validateDatabaseBackup(selected, 'test'), current);
  const result = await applyMaintenancePlan(plan, async ops => {
    for (const op of ops) assert.ok(sameDocument(server.get(op.path) ?? null, op.expected));
    for (const op of ops) server.set(op.path, op.data);
  });
  assert.equal(result, 3);
  assert.equal(server.get('students/a').student.name, 'Backup');
  assert.equal(server.get('students/missing').ownerUid, 'owner-original');
  assert.ok(server.has('students/unrelated'));
});

const access = (id, code) => [{ path: `studentAccessKeys/${id}`, data: { code } }, { path: `studentAccessCodes/${code}`, data: { studentId: id } }];
const codeA = 'abcd1234abcd1234abcd1234abcd1234';
const codeB = 'ffff1234abcd1234abcd1234abcd1234';
function v2(documents) { return { ...backup(documents), version: 2, accessCodeCount: documents.filter(item => item.path.startsWith('studentAccessKeys/')).length }; }

test('restore reinstates an original code and its answers atomically, removes the newer code, and preserves unrelated students', async () => {
  const selected = validateDatabaseBackup(v2([student('a', 'Backup'), ...access('a', codeA)]), 'test');
  const current = [student('a', 'Terbaru'), ...access('a', codeB), student('outside')];
  const server = new Map(current.map(item => [item.path, item.data]));
  const plan = makeRestorePlan(selected, current);
  assert.equal(plan.accessCodeCount, 1);
  let commits = 0;
  await applyMaintenancePlan(plan, async operations => {
    commits++;
    for (const op of operations) assert.ok(sameDocument(server.get(op.path) ?? null, op.expected));
    for (const op of operations) if (op.data === null) server.delete(op.path); else server.set(op.path, op.data);
  });
  assert.equal(commits, 1);
  assert.equal(server.get(`studentAccessCodes/${codeA}`).studentId, 'a');
  assert.equal(server.get('studentAccessKeys/a').code, codeA);
  assert.equal(server.get('students/a').ownerUid, 'owner-original');
  assert.equal(server.get('students/a').journey.stages[5].answers.received_criticism, 'Guru');
  assert.ok(!server.has(`studentAccessCodes/${codeB}`));
  assert.ok(server.has('students/outside'));
});

test('legacy backups preserve the current code and missing metadata is recreated by v2 restore', async () => {
  const current = [student('a'), ...access('a', codeB)];
  const oldPlan = makeRestorePlan(validateDatabaseBackup(backup([student('a')]), 'test'), current);
  assert.equal(oldPlan.accessCodeCount, 0);
  assert.ok(oldPlan.operations.every(item => item.path.startsWith('students/')));
  const fresh = makeRestorePlan(validateDatabaseBackup(v2([student('a'), ...access('a', codeA)]), 'test'), []);
  await applyMaintenancePlan(fresh, async operations => {
    assert.equal(operations.length, 3);
    assert.ok(operations.every(item => item.expected === null));
  });
});

test('restore compares orphan keys left by older deletions instead of assuming metadata is absent', async () => {
  const oldMetadata = access('a', codeB);
  const plan = makeRestorePlan(validateDatabaseBackup(v2([student('a'), ...access('a', codeA)]), 'test'), oldMetadata);
  const server = new Map(oldMetadata.map(item => [item.path, item.data]));
  await applyMaintenancePlan(plan, async operations => {
    for (const op of operations) assert.ok(sameDocument(server.get(op.path) ?? null, op.expected));
    for (const op of operations) if (op.data === null) server.delete(op.path); else server.set(op.path, op.data);
  });
  assert.equal(server.get('studentAccessKeys/a').code, codeA);
  assert.ok(server.has('students/a'));
  assert.ok(!server.has(`studentAccessCodes/${codeB}`));
});

test('mismatched, duplicate, orphan, malformed, or conflicting credentials cannot change student access', () => {
  const pair = access('a', codeA);
  assert.throws(() => validateDatabaseBackup(v2([student('a'), pair[0]]), 'test'), /Kode akses/);
  assert.throws(() => validateDatabaseBackup(v2([student('a'), pair[1]]), 'test'), /Pemetaan/);
  assert.throws(() => validateDatabaseBackup(v2([student('b'), ...pair]), 'test'), /Kode akses/);
  assert.throws(() => validateDatabaseBackup(v2([student('a'), { path: 'studentAccessKeys/a', data: { code: '../unsafe' } }]), 'test'), /tidak valid/);
  assert.throws(() => validateDatabaseBackup({ ...v2([student('a'), ...pair]), accessCodeCount: 9 }, 'test'), /Jumlah kode/);
  assert.throws(() => validateDatabaseBackup(v2([student('a'), ...pair, pair[0]]), 'test'), /duplikat/);
  const selected = validateDatabaseBackup(v2([student('a'), ...pair]), 'test');
  assert.throws(() => makeRestorePlan(selected, [student('outside'), ...access('outside', codeA)]), /siswa lain/);
});

test('large restore batches never split student documents from their code credentials', async () => {
  const documents = Array.from({ length: 40 }, (_, i) => [student(String(i)), ...access(String(i), i.toString(16).padStart(32, '0'))]).flat();
  const plan = makeRestorePlan(validateDatabaseBackup(v2(documents), 'test'), []);
  let commits = 0;
  await applyMaintenancePlan(plan, async operations => {
    commits++;
    assert.ok(operations.length <= 50);
    for (const op of operations.filter(item => item.path.startsWith('studentAccessKeys/'))) {
      const id = op.path.slice('studentAccessKeys/'.length);
      assert.ok(operations.some(item => item.path === `students/${id}`));
      assert.ok(operations.some(item => item.path === `studentAccessCodes/${op.data.code}`));
    }
  });
  assert.equal(commits, 3);
});

test('deletion includes keys and mappings while forged code removal is rejected before writes', async () => {
  const plan = makeDeletePlan([student('a'), ...access('a', codeA)]);
  assert.equal(plan.studentCount, 1);
  assert.equal(plan.accessCodeCount, 1);
  await applyMaintenancePlan(plan, async operations => assert.equal(operations.length, 3));
  const restore = makeRestorePlan(validateDatabaseBackup(v2([student('a'), ...access('a', codeA)]), 'test'), []);
  restore.operations.push({ path: `studentAccessCodes/${codeB}`, expected: { studentId: 'outside' }, data: null, group: 'students/a' });
  let commits = 0;
  await assert.rejects(applyMaintenancePlan(restore, async () => commits++), /tidak sesuai/);
  assert.equal(commits, 0);
});
