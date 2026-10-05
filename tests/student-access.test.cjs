const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const mod = { exports: {} };
new Function('module', 'exports', transformSync(fs.readFileSync('src/utils/studentAccess.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code)(mod, mod.exports);
const { openStudentWithAccess, formatStudentAccessCode } = mod.exports;
const code = 'abcd1234abcd1234abcd1234abcd1234';

test('a different browser opens the original eight-stage record without creating or rewriting a student', async () => {
  const record = { ownerUid: 'original-browser', student: { id: 'student-existing' }, journey: { stages: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 1, { completed: true, answers: { response: `Answer ${i + 1}` } }])) } };
  const before = JSON.stringify(record);
  const calls = [];
  const opened = await openStudentWithAccess(` ${formatStudentAccessCode(code)} `, {
    lookup: async supplied => { assert.equal(supplied, code); return 'student-existing'; },
    grant: async (id, secret) => { calls.push(['grant', id, secret]); },
    read: async id => { calls.push(['read', id]); return record; },
    checkSession: () => calls.push(['session']),
  });
  assert.equal(opened.record, record);
  assert.equal(opened.studentId, 'student-existing');
  assert.equal(JSON.stringify(record), before);
  assert.deepEqual(calls, [['session'], ['grant', 'student-existing', code], ['read', 'student-existing'], ['session']]);
});

test('missing, invalid, or revoked codes never open a student or create a replacement', async () => {
  let grants = 0, reads = 0;
  const server = { lookup: async () => null, grant: async () => { grants++; }, read: async () => { reads++; }, checkSession: () => {} };
  await assert.rejects(openStudentWithAccess('../other-student', server), /Kode akses/);
  await assert.rejects(openStudentWithAccess(code, server), /tidak ditemukan/);
  assert.equal(grants, 0); assert.equal(reads, 0);
  await assert.rejects(openStudentWithAccess(code, { ...server, lookup: async () => 'student-existing', grant: async () => { throw new Error('permission-denied'); } }), /permission-denied/);
  assert.equal(reads, 0);
});

test('session changes and a deleted record fail before activating a journey', async () => {
  let grants = 0;
  const server = { lookup: async () => 'student-existing', grant: async () => { grants++; }, read: async () => null, checkSession: () => { throw new Error('Sesi berubah'); } };
  await assert.rejects(openStudentWithAccess(code, server), /Sesi berubah/);
  assert.equal(grants, 0);
  await assert.rejects(openStudentWithAccess(code, { ...server, checkSession: () => {} }), /tidak tersedia/);
  let checks = 0;
  await assert.rejects(openStudentWithAccess(code, { ...server, read: async () => ({ ownerUid: 'old' }), checkSession: () => { if (++checks === 2) throw new Error('Sesi berubah'); } }), /Sesi berubah/);
});
