export function normalizeStudentAccessCode(value: string): string {
  const code = value.trim().replace(/[\s-]/g, '').toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(code)) throw new Error('Kode akses harus berisi 32 huruf/angka. Salin kode dari halaman siswa atau minta kepada guru.');
  return code;
}

export function formatStudentAccessCode(code: string): string {
  return normalizeStudentAccessCode(code).match(/.{8}/g)!.join('-').toUpperCase();
}

// Resolve a code to an existing record; this flow never creates a student document.
export async function openStudentWithAccess<T>(value: string, server: {
  lookup: (code: string) => Promise<string | null>;
  grant: (studentId: string, code: string) => Promise<void>;
  read: (studentId: string) => Promise<T | null>;
  checkSession: () => void;
}): Promise<{ studentId: string; record: T }> {
  const code = normalizeStudentAccessCode(value);
  const studentId = await server.lookup(code);
  if (!studentId) throw new Error('Kode akses tidak ditemukan. Periksa kode atau minta kode kepada guru.');
  if (!/^[a-zA-Z0-9_-]+$/.test(studentId)) throw new Error('Kode akses tidak valid.');
  server.checkSession();
  await server.grant(studentId, code);
  const record = await server.read(studentId);
  if (!record) throw new Error('Rekaman siswa sudah tidak tersedia. Hubungi guru.');
  server.checkSession();
  return { studentId, record };
}
