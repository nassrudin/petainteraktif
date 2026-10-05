const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const mod = { exports: {} };
const code = buildSync({ entryPoints: ['src/utils/studentCsv.ts'], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
new Function('module', 'exports', code)(mod, mod.exports);
const { buildStudentCsv, csvCell, studentCsvFileName } = mod.exports;

// Parse actual quoted CSV, including embedded newlines and doubled quotes.
function parseCsv(value) {
  const rows = []; let row = [], cell = '', quoted = false;
  const csv = value.replace(/^\ufeff/, '');
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (ch === '\r' && csv[i + 1] === '\n' && !quoted) { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += ch;
  }
  row.push(cell); rows.push(row); return rows;
}
const at = '2026-10-05T00:00:00Z';
function record(id, className, stages = {}) {
  return { path: `students/${id}`, data: { ownerUid: `owner-${id}`,
    student: { id, name: `Siswa ${id}`, gender: 'P', class: className, absentNumber: 2, startedAt: at, avatarUrl: 'original-extra-field' },
    journey: { studentId: id, updatedAt: at, stages, lastActiveStage: 1, confidenceScore: 0 } } };
}
const backup = documents => ({ exportedAt: at, documents, studentCount: documents.filter(item => item.path.startsWith('students/')).length });

test('full CSV contains all classes, current and legacy answers, incomplete stages, and raw Firebase records', () => {
  const first = record('a', 'X-1', {
    1: { completed: true, completedAt: at, answers: { situation: 'Teks, "kutipan"\nBaris dua 😀', confidence_scale: 3, archived_field: 'Jawaban lama' } },
    3: { completed: false, answers: { internal_obstacles: 'Belum selesai', extra_list: ['Pilihan A', 'Pilihan B'], extra_number: 0, extra_boolean: false } },
    5: { completed: true, completedAt: at, answers: { received_criticism: 'Kritik dari guru' } },
  });
  const second = record('b', 'X-2', {
    8: { completed: true, answers: { after_confidence_scale: 5, future_target: 'Target berikutnya', expected_confidence_scale: 4 } },
  });
  const settings = { path: 'settings/public', data: {} };
  const content = buildStudentCsv(backup([second, first, settings]));
  assert.ok(content.startsWith('\ufeff'));
  const [headers, row, other] = parseCsv(content);
  const column = marker => { const index = headers.findIndex(header => header.includes(marker)); assert.ok(index >= 0, marker); return index; };
  assert.equal(row.length, headers.length);
  assert.equal(other.length, headers.length);
  assert.equal(row[column('Nama Siswa')], 'Siswa a');
  assert.equal(other[column('Kelas')], 'X-2');
  assert.equal(row[column('[situation]')], 'Teks, "kutipan"\nBaris dua 😀');
  assert.equal(row[column('[archived_field]')], 'Jawaban lama');
  assert.equal(row[column('[internal_obstacles]')], 'Belum selesai');
  assert.equal(row[column('[extra_list]')], 'Pilihan A | Pilihan B');
  assert.equal(row[column('[extra_number]')], '0');
  assert.equal(row[column('[extra_boolean]')], 'false');
  assert.equal(row[column('Jumlah Pos Selesai')], '2');
  assert.equal(row[column('Pos 3 - Hambatan di jalan saya - Status')], 'Belum selesai');
  assert.equal(row[column('Pos 4 - Langkah kecil saya - Status')], 'Belum diisi');
  assert.equal(row[column('Pos 6 - Saat saya dikritik - Status')], 'Selesai');
  assert.equal(row[column('Pos 6 - Tanggal Selesai')], at);
  assert.equal(row[column('[received_criticism]')], 'Kritik dari guru');
  assert.equal(other[column('[after_confidence_scale]')], '5');
  assert.equal(other[column('Skor Percaya Diri')], '100');
  assert.deepEqual(JSON.parse(row[column('JSON asli Firebase')]), first.data);
});

test('spreadsheet formula-like strings are escaped without losing quoted or multiline content', () => {
  for (const value of ['=1+1', '+SUM(1,2)', '-cmd', '@SUM(A1)', ' \t=1+1']) {
    assert.equal(parseCsv(csvCell(value))[0][0], "'" + value);
  }
  assert.equal(parseCsv(csvCell('teks "asli"\r\nberikutnya'))[0][0], 'teks "asli"\r\nberikutnya');
  assert.equal(csvCell(null), '""');
});

test('empty database exports the full question headers and filename uses WIB', () => {
  const rows = parseCsv(buildStudentCsv(backup([])));
  assert.equal(rows.length, 1);
  assert.ok(rows[0].some(header => header.includes('[confidence_scale]')));
  assert.ok(rows[0].some(header => header.includes('[after_confidence_scale]')));
  assert.equal(studentCsvFileName('2026-10-04T18:03:04Z'), 'rekap_lengkap_peta_percaya_diri_2026-10-05_010304_WIB.csv');
});
