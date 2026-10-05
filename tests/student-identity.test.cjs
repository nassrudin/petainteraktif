const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const mod = { exports: {} };
new Function('module', 'exports', transformSync(fs.readFileSync('src/utils/studentIdentity.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code)(mod, mod.exports);
const { findExistingStudent, normalizeStudentIdentity } = mod.exports;
function record(id, name, className, absentNumber, count, updatedAt = '2026-10-05T00:00:00Z') {
  return { student: { id, name, class: className, absentNumber }, journey: { updatedAt,
    stages: Object.fromEntries(Array.from({ length: count }, (_, i) => [i + 1, { completed: true, answers: { response: 'Jawaban' } }])) } };
}

test('case, Unicode and repeated whitespace do not cause a new student journey', () => {
  const saved = record('original', '  NASS   Rudin ', 'X-1', 5, 8);
  assert.equal(normalizeStudentIdentity('ＮＡＳＳ\t Rudin'), 'nass rudin');
  assert.equal(findExistingStudent([saved], 'ＮＡＳＳ Rudin', 'x-1', 5), saved);
  assert.equal(findExistingStudent([saved], 'Nass Rudin', 'X-2', 5), undefined);
  assert.equal(findExistingStudent([saved], 'Nass Rudin', 'X-1', 6), undefined);
});

test('an empty newer duplicate cannot hide an eight-position completed record', () => {
  const complete = record('complete', 'Siswa', 'X-1', 1, 8);
  const empty = record('empty', 'Siswa', 'X-1', 1, 0, '2026-10-06T00:00:00Z');
  const records = [empty, complete];
  assert.equal(findExistingStudent(records, 'Siswa', 'X-1', 1), complete);
  assert.deepEqual(records, [empty, complete]);
});

test('partial answers are preferred over an empty duplicate and equal progress uses the latest update', () => {
  const empty = record('empty', 'Siswa', 'X-1', 1, 0);
  const partial = record('partial', 'Siswa', 'X-1', 1, 0);
  partial.journey.stages[1] = { completed: false, answers: { response: 'Draft server', optional: '' } };
  assert.equal(findExistingStudent([empty, partial], 'Siswa', 'X-1', 1), partial);
  const old = record('old', 'Siswa', 'X-1', 1, 1);
  const latest = record('latest', 'Siswa', 'X-1', 1, 1, '2026-10-06T00:00:00Z');
  assert.equal(findExistingStudent([old, latest], 'Siswa', 'X-1', 1), latest);
});
