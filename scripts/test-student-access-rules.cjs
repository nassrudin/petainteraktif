// Read-only Rules API test: compiles/evaluates local rules against mock documents.
// Does not release rules or read/write any real student record.
// Usage: node scripts/test-student-access-rules.cjs <firebase-tools/lib/auth.js>
const fs = require('node:fs');
const assert = require('node:assert/strict');
const auth = require(process.argv[2]);
const base = '/databases/(default)/documents/';
const code = 'abcd1234abcd1234abcd1234abcd1234';
const otherCode = 'ffff1234abcd1234abcd1234abcd1234';
const studentId = 'student-test';
const student = { ownerUid: 'owner', student: { id: studentId, name: 'Test', class: 'X-1', absentNumber: 1 }, journey: { studentId, updatedAt: 'old', stages: {} } };
const documents = {
  [`students/${studentId}`]: student,
  [`studentAccessKeys/${studentId}`]: { code },
  [`studentAccessCodes/${code}`]: { studentId },
  [`studentBrowserAccess/browser/students/${studentId}`]: { code },
  'config/adminRoot': { uid: 'admin' },
  'staff/teacher': { role: 'teacher', active: true },
};
const cases = [];
function add(name, expected, method, path, uid, resource, next, overrides = {}, after = {}, time) {
  const docs = { ...documents, ...overrides };
  const mock = (fn, path, value) => ({ function: fn, args: [{ exactValue: base + path }], result: value === undefined ? { undefined: {} } : { value } });
  const mocks = [{ function: 'exists', args: [{ anyValue: {} }], result: { value: false } },
    { function: 'get', args: [{ anyValue: {} }], result: { undefined: {} } },
    { function: 'getAfter', args: [{ anyValue: {} }], result: { undefined: {} } }];
  for (const [path, data] of Object.entries(docs)) {
    mocks.push(mock('exists', path, data !== null));
    mocks.push(mock('get', path, data === null ? undefined : { data }));
    mocks.push(mock('getAfter', path, after[path] ? { data: after[path] } : data === null ? undefined : { data }));
  }
  const token = { email: '', email_verified: false, firebase: { sign_in_provider: ['admin', 'teacher'].includes(uid) ? 'password' : 'anonymous' } };
  cases.push({ name, test: { expectation: expected, request: { auth: uid ? { uid, token } : null, method, path: base + path, ...(time ? { time } : {}), ...(next ? { resource: { data: next } } : {}) },
    ...(resource ? { resource: { data: resource } } : {}), functionMocks: mocks, expressionReportLevel: 'NONE' } });
}
const studentPath = `students/${studentId}`;
add('original browser can read', 'ALLOW', 'get', studentPath, 'owner', student);
add('unlinked browser cannot read', 'DENY', 'get', studentPath, 'stranger', student);
add('linked browser can read', 'ALLOW', 'get', studentPath, 'browser', student);
add('revoked code cannot read', 'DENY', 'get', studentPath, 'browser', student, null, { [`studentAccessKeys/${studentId}`]: { code: otherCode } });
add('anonymous visitor cannot read', 'DENY', 'get', studentPath, null, student);
add('teacher can read', 'ALLOW', 'get', studentPath, 'teacher', student);
add('owner can obtain key', 'ALLOW', 'get', `studentAccessKeys/${studentId}`, 'owner', { code });
add('stranger cannot obtain key by student ID', 'DENY', 'get', `studentAccessKeys/${studentId}`, 'stranger', { code });
add('key enumeration is denied', 'DENY', 'list', `studentAccessKeys/${studentId}`, 'owner', { code });
add('owner can create key', 'ALLOW', 'create', `studentAccessKeys/${studentId}`, 'owner', null, { code });
add('stranger cannot create key', 'DENY', 'create', `studentAccessKeys/${studentId}`, 'stranger', null, { code });
add('owner cannot rotate key', 'DENY', 'update', `studentAccessKeys/${studentId}`, 'owner', { code }, { code: otherCode });
add('teacher can rotate key', 'ALLOW', 'update', `studentAccessKeys/${studentId}`, 'teacher', { code }, { code: otherCode });
add('teacher can delete old code index', 'ALLOW', 'delete', `studentAccessCodes/${code}`, 'teacher', { studentId });
add('known code can be resolved', 'ALLOW', 'get', `studentAccessCodes/${code}`, 'stranger', { studentId });
add('code enumeration is denied', 'DENY', 'list', `studentAccessCodes/${code}`, 'stranger', { studentId });
add('stale code cannot be resolved', 'DENY', 'get', `studentAccessCodes/${code}`, 'stranger', { studentId }, null, { [`studentAccessKeys/${studentId}`]: { code: otherCode } });
add('owner can index matching key atomically', 'ALLOW', 'create', `studentAccessCodes/${code}`, 'owner', null, { studentId });
add('owner cannot index a mismatched key', 'DENY', 'create', `studentAccessCodes/${otherCode}`, 'owner', null, { studentId });
add('stranger cannot index another student', 'DENY', 'create', `studentAccessCodes/${code}`, 'stranger', null, { studentId });
add('valid code grants the new browser access', 'ALLOW', 'create', `studentBrowserAccess/stranger/students/${studentId}`, 'stranger', null, { code });
add('wrong code cannot grant access', 'DENY', 'create', `studentBrowserAccess/stranger/students/${studentId}`, 'stranger', null, { code: otherCode });
add('grant cannot be written for a different browser', 'DENY', 'create', `studentBrowserAccess/browser/students/${studentId}`, 'stranger', null, { code });
add('code cannot grant access to a different student', 'DENY', 'create', 'studentBrowserAccess/stranger/students/student-other', 'stranger', null, { code });
add('deleted student cannot receive a grant', 'DENY', 'create', `studentBrowserAccess/stranger/students/${studentId}`, 'stranger', null, { code }, { [studentPath]: null });
add('browser can list its own grants', 'ALLOW', 'list', `studentBrowserAccess/browser/students/${studentId}`, 'browser', { code });
add('browser cannot list another browser grants', 'DENY', 'list', `studentBrowserAccess/browser/students/${studentId}`, 'stranger', { code });
const updated = { ...student, journey: { ...student.journey, updatedAt: 'new', stages: { 1: { completed: true, answers: { response: 'Test' } } } } };
add('linked browser can save the same record', 'ALLOW', 'update', studentPath, 'browser', student, updated);
add('linked browser cannot change ownership', 'DENY', 'update', studentPath, 'browser', student, { ...updated, ownerUid: 'browser' });
add('linked browser cannot change student identity', 'DENY', 'update', studentPath, 'browser', student, { ...updated, student: { ...student.student, absentNumber: 2 } });
add('revoked browser cannot save', 'DENY', 'update', studentPath, 'browser', student, updated, { [`studentAccessKeys/${studentId}`]: { code: otherCode } });
add('linked browser cannot delete the record', 'DENY', 'delete', studentPath, 'browser', student);
const time = '2026-10-06T00:00:00Z';
const completed = { ...student, journey: { ...student.journey, updatedAt: 'new', stages: Object.fromEntries([1, 2, 3, 4].map(id => [id, { completed: true }])) } };
const job = { ownerUid: 'browser', studentId, milestone: 4, status: 'pending', createdAt: time, revision: 'new' };
const jobPath = 'driveBackupJobs/00000000-0000-4000-8000-000000000001';
const driveSettings = { 'settings/driveBackup': { enabled: true } };
add('linked browser can queue the full backup with Pos 4 save', 'ALLOW', 'create', jobPath, 'browser', null, job, driveSettings, { [studentPath]: completed }, time);
add('unlinked browser cannot queue another student backup', 'DENY', 'create', jobPath, 'stranger', null, { ...job, ownerUid: 'stranger' }, driveSettings, { [studentPath]: completed }, time);
add('revoked browser cannot queue a backup', 'DENY', 'create', jobPath, 'browser', null, job, { ...driveSettings, [`studentAccessKeys/${studentId}`]: { code: otherCode } }, { [studentPath]: completed }, time);
add('original browser still queues backups', 'ALLOW', 'create', jobPath, 'owner', null, { ...job, ownerUid: 'owner' }, driveSettings, { [studentPath]: completed }, time);
add('teacher can list keys for a complete backup', 'ALLOW', 'list', `studentAccessKeys/${studentId}`, 'teacher', { code });
add('teacher can list code mappings for a complete backup', 'ALLOW', 'list', `studentAccessCodes/${code}`, 'teacher', { studentId });
add('teacher can restore an existing mapping with the matching key', 'ALLOW', 'update', `studentAccessCodes/${code}`, 'teacher', { studentId }, { studentId });
add('teacher cannot reassign an existing code to another student', 'DENY', 'update', `studentAccessCodes/${code}`, 'teacher', { studentId }, { studentId: 'student-other' }, { 'studentAccessKeys/student-other': { code } });
add('student cannot overwrite a code mapping', 'DENY', 'update', `studentAccessCodes/${code}`, 'owner', { studentId }, { studentId });

(async () => {
  const account = auth.getGlobalDefaultAccount();
  const token = account.tokens.expires_at > Date.now() ? account.tokens : await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const response = await fetch('https://firebaserules.googleapis.com/v1/projects/growth-mindset-percaya-diri:test', {
    method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: fs.readFileSync('firestore.rules', 'utf8') }] }, testSuite: { testCases: cases.map(item => item.test) } }),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result.error));
  const issues = result.issues || [];
  const results = result.testResults || [];
  assert.equal(issues.filter(item => item.severity === 'ERROR').length, 0, JSON.stringify(issues));
  const failed = results.flatMap((item, index) => item.state === 'SUCCESS' ? [] : [{ name: cases[index].name, state: item.state, messages: item.debugMessages, calls: item.functionCalls }]);
  console.log(JSON.stringify({ tested: results.length, passed: results.length - failed.length, issues, failures: failed }, null, 2));
  assert.equal(results.length, cases.length);
  assert.equal(failed.length, 0, 'Rules access tests failed');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
