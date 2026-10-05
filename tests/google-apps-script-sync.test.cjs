const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('google-apps-script-sync.js', 'utf8');

test('the backup worker has no public endpoint that accepts untrusted student data', () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.equal(context.doPost, undefined);
  assert.equal(context.doGet, undefined);
  assert.equal(typeof context.processDriveBackups, 'function');
});

test('the target folder is read from Firebase and unsupported Firestore types abort the export', () => {
  const lookups = [];
  const context = vm.createContext({ DriveApp: { getFolderById: id => { lookups.push(id); return {}; } } });
  vm.runInContext(source, context);
  context.firestoreRequest = () => ({ name: 'projects/test/databases/(default)/documents/settings/driveBackup',
    fields: context.encodeFirestore({ folderUrl: 'https://drive.google.com/drive/folders/server-folder', enabled: true }).mapValue.fields });
  assert.equal(context.readBackupConfig().enabled, true);
  assert.deepEqual(lookups, ['server-folder']);
  assert.throws(() => context.decodeFirestore({ referenceValue: 'another/document' }), /tidak didukung/);
  assert.throws(() => context.decodeFirestore({ integerValue: '9007199254740993' }), /aman/);
});
