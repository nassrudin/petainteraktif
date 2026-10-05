// Server worker for FULL database backups. No public webhook is required.
// Download the generated .gs from the dashboard: build supplies JM_* constants.
function firestoreRequest(path, method, body, allowMissing) {
  var options = {
    method: method || 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    contentType: 'application/json', muteHttpExceptions: true
  };
  if (body !== undefined) options.payload = JSON.stringify(body);
  var response = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + JM_PROJECT_ID + '/databases/(default)/documents' + path, options);
  var code = response.getResponseCode();
  if (allowMissing && code === 404) return null;
  var content = JSON.parse(response.getContentText());
  if (code < 200 || code >= 300) throw new Error('Firebase HTTP ' + code + ': ' + ((content.error || {}).message || 'Permintaan gagal.'));
  return content;
}
function decodeFirestore(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('integerValue' in value || 'doubleValue' in value) {
    var number = Number('integerValue' in value ? value.integerValue : value.doubleValue);
    if (!isFinite(number) || ('integerValue' in value && !Number.isSafeInteger(number))) throw new Error('Angka database tidak dapat diekspor dengan aman.');
    return number;
  }
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestore);
  if ('mapValue' in value) {
    var result = Object.create(null);
    Object.keys(value.mapValue.fields || {}).forEach(function(key) { result[key] = decodeFirestore(value.mapValue.fields[key]); });
    return result;
  }
  throw new Error('Tipe Firestore tidak didukung. Backup dibatalkan agar tidak menghasilkan berkas sebagian.');
}
function decodeDocument(document) {
  return { path: document.name.split('/documents/')[1], data: decodeFirestore({ mapValue: { fields: document.fields || {} } }) };
}
function encodeFirestore(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestore) } };
  var fields = {};
  Object.keys(value).forEach(function(key) { fields[key] = encodeFirestore(value[key]); });
  return { mapValue: { fields: fields } };
}
function patchDocument(path, values) {
  var fields = encodeFirestore(values).mapValue.fields;
  var mask = Object.keys(values).map(function(key) { return 'updateMask.fieldPaths=' + encodeURIComponent(key); }).join('&');
  firestoreRequest('/' + path + '?' + mask, 'patch', { fields: fields });
}
function readBackupConfig() {
  var config = firestoreRequest('/settings/driveBackup', 'get', undefined, true);
  if (!config) throw new Error('Simpan folder tujuan pada Pengaturan Drive di dashboard guru terlebih dahulu.');
  var settings = decodeDocument(config).data;
  var match = /^https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]{8,100})$/.exec(settings.folderUrl || '');
  if (!match) throw new Error('Folder Drive pada pengaturan Firebase tidak valid.');
  return { enabled: settings.enabled === true, folder: DriveApp.getFolderById(match[1]) };
}
function installBackupTrigger() {
  var config = readBackupConfig();
  config.folder.getName();
  firestoreRequest('/students?pageSize=1');
  var existing = ScriptApp.getProjectTriggers().filter(function(trigger) { return trigger.getHandlerFunction() === 'processDriveBackups'; });
  if (!existing.length) ScriptApp.newTrigger('processDriveBackups').timeBased().everyMinutes(1).create();
  patchDocument('settings/driveBackupWorker', { checkedAt: new Date().toISOString(), error: '', scriptUrl: 'https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/edit' });
  processDriveBackups();
}
function listCollectionAt(collectionName, readTime) {
  var result = [], next = '';
  do {
    var page = firestoreRequest('/' + collectionName + '?pageSize=500&readTime=' + encodeURIComponent(readTime) + (next ? '&pageToken=' + encodeURIComponent(next) : ''));
    result = result.concat((page.documents || []).map(decodeDocument));
    next = page.nextPageToken || '';
  } while (next);
  return result;
}
function buildSnapshotBackup(job, readTime) {
  var startedAt = new Date().toISOString();
  var students = listCollectionAt('students', readTime);
  var settings = firestoreRequest('/settings/public?readTime=' + encodeURIComponent(readTime), 'get', undefined, true);
  var trigger = students.find(function(item) { return item.path === 'students/' + job.data.studentId; });
  if (!trigger || trigger.data.journey.updatedAt !== job.data.revision) throw new Error('Snapshot tidak cocok dengan penyimpanan pemicu; backup dibatalkan.');
  var studentIds = new Set(students.map(function(item) { return item.path.slice('students/'.length); }));
  var indexes = new Map(listCollectionAt('studentAccessCodes', readTime).map(function(item) { return [item.path.slice('studentAccessCodes/'.length), item]; }));
  var keys = listCollectionAt('studentAccessKeys', readTime).filter(function(item) { return studentIds.has(item.path.slice('studentAccessKeys/'.length)); });
  var access = [];
  keys.forEach(function(item) {
    var id = item.path.slice('studentAccessKeys/'.length), code = item.data.code, index = indexes.get(code);
    if (!/^[a-f0-9]{32}$/.test(code) || !index || index.data.studentId !== id) throw new Error('Kode akses dalam snapshot tidak cocok; backup dibatalkan.');
    access.push(item, index);
  });
  return {
    format: 'journey-map-database-backup', version: 2, startedAt: startedAt, exportedAt: new Date().toISOString(),
    source: { projectId: JM_PROJECT_ID, databaseId: '(default)', storage: 'firebase-server' },
    scope: ['students', 'settings/public', 'studentAccessKeys', 'studentAccessCodes'], studentCount: students.length, accessCodeCount: keys.length,
    documents: students.concat(settings ? [decodeDocument(settings)] : [], access),
    stageDefinitions: JM_STAGE_DEFINITIONS, defaultSettings: JM_DEFAULT_SETTINGS,
    automatic: { jobId: job.path.split('/')[1], studentId: job.data.studentId, milestone: job.data.milestone, snapshotAt: readTime }
  };
}
function processBackupJob(job, folder) {
  // Document createTime is the exact commit timestamp. The REQUEST_TIME field may
  // have millisecond precision and precede the commit, so it must never be readTime.
  var readTime = job.snapshotAt;
  var age = Date.now() - Date.parse(readTime);
  var jobId = job.path.split('/')[1];
  if (!/^[a-f0-9-]{36}$/.test(jobId) || ![4, 8].includes(job.data.milestone) || !isFinite(age)) throw new Error('Permintaan backup tidak valid.');
  var stamp = Utilities.formatDate(new Date(readTime), 'Asia/Jakarta', 'yyyy-MM-dd_HHmmss');
  var fileName = 'backup_database_Pos_' + job.data.milestone + '_' + stamp + '_WIB_' + jobId + '.json';
  var files = folder.getFilesByName(fileName), file, backup;
  if (files.hasNext()) {
    file = files.next();
    backup = JSON.parse(file.getBlob().getDataAsString());
    if (backup.format !== 'journey-map-database-backup' || ![1, 2].includes(backup.version) || backup.source.projectId !== JM_PROJECT_ID ||
        !backup.automatic || backup.automatic.jobId !== jobId || backup.automatic.snapshotAt !== readTime ||
        backup.studentCount !== backup.documents.filter(function(item) { return item.path.indexOf('students/') === 0; }).length) {
      throw new Error('Berkas dengan nama yang sama tidak cocok. Cadangan lama tidak ditimpa.');
    }
  } else {
    // Exact historical reads are retained one hour without PITR. Never substitute current data.
    if (age >= 60 * 60000) {
      patchDocument(job.path, { status: 'expired', error: 'Snapshot lebih dari satu jam dan tidak dapat diambil lagi. Gunakan Backup Data untuk cadangan keadaan saat ini.' });
      return;
    }
    backup = buildSnapshotBackup(job, readTime);
    file = folder.createFile(Utilities.newBlob(JSON.stringify(backup, null, 2) + '\n', 'application/json', fileName));
  }
  patchDocument(job.path, { status: 'complete', error: '', completedAt: new Date().toISOString(), fileUrl: file.getUrl(), studentCount: backup.studentCount, accessCodeCount: backup.accessCodeCount || 0 });
}
function processDriveBackups() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  var started = Date.now(), lastError = '';
  try {
    var config = readBackupConfig();
    config.folder.getName();
    if (config.enabled) {
      var rows = firestoreRequest(':runQuery', 'post', { structuredQuery: {
        from: [{ collectionId: 'driveBackupJobs' }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'pending' } } },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }], limit: 100
      } });
      var jobs = rows.filter(function(row) { return row.document; }).map(function(row) {
        var job = decodeDocument(row.document);
        job.snapshotAt = row.document.createTime;
        return job;
      });
      for (var i = 0; i < jobs.length && Date.now() - started < 240000; i++) {
        try { processBackupJob(jobs[i], config.folder); }
        catch (error) {
          lastError = String(error.message || error).slice(0, 800);
          patchDocument(jobs[i].path, { error: lastError });
        }
      }
    }
  } catch (error) { lastError = String(error.message || error).slice(0, 800); }
  finally {
    try { patchDocument('settings/driveBackupWorker', { checkedAt: new Date().toISOString(), error: lastError, backupFormatVersion: 2 }); }
    finally { lock.releaseLock(); }
  }
  if (lastError) throw new Error(lastError);
}
