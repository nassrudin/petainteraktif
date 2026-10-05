import { STAGES_DATA } from '../data';
import { ActiveStudent, StudentJourney } from '../types';
import { DatabaseBackup, backupFileName } from './databaseBackup';
import { reviseJourney } from './journeyRevision';
import { formatStudentAccessCode } from './studentAccess';

// Quote every cell, preserve line breaks/Unicode, and prevent answers being executed as spreadsheet formulas.
export function csvCell(value: unknown): string {
  let text = value === undefined || value === null ? ''
    : Array.isArray(value) ? value.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' | ')
    : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^\s*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function studentCsvFileName(exportedAt: string): string {
  return backupFileName(exportedAt).replace('backup_peta_', 'rekap_lengkap_peta_').replace(/\.json$/, '.csv');
}

export function buildStudentCsv(backup: DatabaseBackup): string {
  const accessCodes = new Map(backup.documents.filter(item => item.path.startsWith('studentAccessKeys/'))
    .map(item => [item.path.slice('studentAccessKeys/'.length), formatStudentAccessCode(String(item.data.code))]));
  const records = backup.documents.filter(document => document.path.startsWith('students/')).map(document => {
    const student = document.data.student as ActiveStudent;
    const original = document.data.journey as StudentJourney;
    return { document, student, journey: reviseJourney(original) };
  }).sort((a, b) => a.student.class.localeCompare(b.student.class) || a.student.absentNumber - b.student.absentNumber || a.student.name.localeCompare(b.student.name));

  // Include stored questions that no longer appear in the form as additional columns.
  const stageColumns = STAGES_DATA.map(stage => {
    const currentIds = new Set(stage.fields.map(field => field.id));
    const extraIds = new Set<string>();
    for (const { journey } of records) {
      for (const id of Object.keys(journey.stages[stage.id]?.answers || {})) if (!currentIds.has(id)) extraIds.add(id);
    }
    return { stage, fields: [
      ...stage.fields.map(field => ({ id: field.id, label: field.label })),
      ...[...extraIds].sort().map(id => ({ id, label: `Jawaban tambahan (${id})` })),
    ] };
  });
  const headers = [
    'ID Siswa', 'Nama Siswa', 'Jenis Kelamin', 'Kelas', 'Nomor Absen', 'Kode Akses Siswa', 'Mulai Mengisi',
    'Skor Percaya Diri (0–100)', 'Jumlah Pos Selesai', 'Pos Aktif', 'Terakhir Update',
    'ID Pemilik Firebase', 'Dokumen Firebase', 'Penyimpanan', 'Waktu Ekspor',
    ...stageColumns.flatMap(({ stage, fields }) => [
      `Pos ${stage.id} - ${stage.title} - Status`, `Pos ${stage.id} - Tanggal Selesai`,
      ...fields.map(field => `Pos ${stage.id} - ${field.label} [${field.id}]`),
    ]),
    'Data Siswa Lengkap (JSON asli Firebase)',
  ];
  const rows = records.map(({ document, student, journey }) => [
    student.id, student.name, student.gender, student.class, student.absentNumber, accessCodes.get(student.id) || 'Belum dibuat', student.startedAt,
    journey.confidenceScore, Object.values(journey.stages).filter(stage => stage.completed).length,
    journey.lastActiveStage, journey.updatedAt, document.data.ownerUid, document.path, 'Firebase', backup.exportedAt,
    ...stageColumns.flatMap(({ stage, fields }) => {
      const answer = journey.stages[stage.id];
      return [answer?.completed ? 'Selesai' : answer ? 'Belum selesai' : 'Belum diisi', answer?.completedAt || '',
        ...fields.map(field => answer?.answers?.[field.id])];
    }),
    document.data,
  ]);
  return '\ufeff' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
