import React, { useEffect, useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import { useApp } from '../context';
import { formatStudentAccessCode } from '../utils/studentAccess';

export function StudentAccessPanel({ studentId }: { studentId: string }) {
  const { getStudentAccessCode, isAdminLoggedIn } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [renewing, setRenewing] = useState(false);
  useEffect(() => {
    let active = true;
    setCode(''); setError(''); setCopied(false);
    getStudentAccessCode(studentId).then(value => { if (active) setCode(formatStudentAccessCode(value)); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Kode belum dapat dimuat.'); });
    return () => { active = false; };
  }, [studentId, attempt]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setError('Salin kode dari kotak di atas secara manual.'); }
  };
  const renew = async () => {
    if (renewing || !window.confirm('Ganti kode akses? Kode lama dan akses browser yang memakai kode lama akan dicabut. Jawaban siswa tetap tersimpan.')) return;
    setRenewing(true); setError(''); setCopied(false);
    try { setCode(formatStudentAccessCode(await getStudentAccessCode(studentId, true))); }
    catch (error) { setError(error instanceof Error ? error.message : 'Gagal mengganti kode.'); }
    finally { setRenewing(false); }
  };
  return <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2 no-print" aria-label="Kode akses siswa">
    <h2 className="text-sm font-bold text-blue-900 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Kode akses siswa</h2>
    <p className="text-xs text-blue-900">Simpan kode ini untuk membuka jawaban yang sama di browser atau perangkat lain. Pada halaman awal, pilih <strong>Lanjutkan dengan kode akses</strong>. Berikan kode hanya kepada siswa pemilik jawaban.</p>
    {code ? <div className="flex flex-wrap gap-2 items-center">
      <input aria-label="Kode akses siswa" readOnly value={code} onFocus={event => event.target.select()} className="font-mono text-xs sm:text-sm bg-white border border-blue-200 rounded-lg p-2 w-full sm:w-96" />
      <button type="button" onClick={copy} className="text-xs font-bold flex items-center gap-1 rounded-lg bg-blue-700 text-white px-3 py-2 cursor-pointer"><Copy className="w-3.5 h-3.5" />{copied ? 'Tersalin' : 'Salin Kode'}</button>
      {isAdminLoggedIn && <button type="button" onClick={renew} disabled={renewing} className="text-xs font-bold border border-blue-300 rounded-lg px-3 py-2 cursor-pointer disabled:opacity-50">{renewing ? 'Mengganti...' : 'Ganti Kode'}</button>}
    </div> : !error && <p role="status" className="text-xs text-blue-800">Memuat kode dari Firebase...</p>}
    {error && <div role="alert" className="text-xs text-red-700">{error} {!code && <button type="button" onClick={() => setAttempt(value => value + 1)} className="font-bold underline cursor-pointer">Coba lagi</button>}</div>}
  </section>;
}
