const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'google-apps-script-sync.js'), 'utf8');

function createScript() {
  const files = new Map();
  let folderLookups = [];
  const folder = {
    getFilesByName(name) {
      return { hasNext: () => files.has(name), next: () => files.get(name) };
    },
    createFile(name, content) {
      const file = {
        content,
        setContent(next) { this.content = next; },
        getId: () => name,
        getUrl: () => `https://drive.google.com/file/d/${name}`,
      };
      files.set(name, file);
      return file;
    },
  };
  const sandbox = {
    DriveApp: { getFolderById(id) { folderLookups.push(id); return folder; } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MimeType: { PLAIN_TEXT: 'text/plain' },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: text => ({
        text,
        setMimeType() { return this; },
      }),
    },
  };
  vm.runInNewContext(source, sandbox);
  return { post: payload => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(payload) } }).text), files, folderLookups };
}

const completeStages = Object.fromEntries(Array.from({ length: 8 }, (_, i) =>
  [i + 1, { completed: true, answers: { example: 'jawaban' } }]));

test('repeat delivery updates the same file and ignores a client-supplied folder', () => {
  const script = createScript();
  const payload = {
    studentId: 'student-12345678', studentName: 'Siswa', studentClass: 'X-1',
    folderId: 'other-folder', stages: completeStages,
  };
  assert.equal(script.post(payload).status, 'success');
  assert.equal(script.post({ ...payload, studentName: 'Siswa Baru' }).status, 'success');
  assert.equal(script.files.size, 1);
  assert.equal(JSON.parse(script.files.values().next().value.content).studentName, 'Siswa Baru');
  assert.deepEqual(script.folderLookups, [
    '1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z',
    '1Slmi-qS--PbmWZh7KzFoMVG3iE5QqD_Z',
  ]);
});

test('incomplete journey is rejected without creating a file', () => {
  const script = createScript();
  const result = script.post({
    studentId: 'student-12345678', studentName: 'Siswa', studentClass: 'X-1',
    stages: { ...completeStages, 8: { completed: false, answers: {} } },
  });
  assert.equal(result.status, 'error');
  assert.equal(script.files.size, 0);
});
