import React, { useEffect, useState } from 'react';
import { useApp } from '../context';
import { DEFAULT_BACKUP_FOLDER_URL } from '../utils/driveBackup';

const showDate = (value: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB' : 'Belum tersedia';

export function DriveBackupPanel() {
  const { driveBackupSettings, updateDriveBackupSettings, driveBackupJobs, driveBackupWorker, allStudents } = useApp();
  const [folderUrl, setFolderUrl] = useState(driveBackupSettings.folderUrl || DEFAULT_BACKUP_FOLDER_URL);
  const [enabled, setEnabled] = useState(driveBackupSettings.enabled);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  useEffect(() => { setFolderUrl(driveBackupSettings.folderUrl || DEFAULT_BACKUP_FOLDER_URL); setEnabled(driveBackupSettings.enabled); }, [driveBackupSettings]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const workerActive = driveBackupWorker && now - Date.parse(driveBackupWorker.checkedAt) < 5 * 60000;
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setFeedback(null);
    try { setFeedback(await updateDriveBackupSettings({ folderUrl, enabled })); }
    catch (error) { setFeedback({ success: false, message: error instanceof Error ? error.message : 'Pengaturan gagal disimpan.' }); }
    finally { setBusy(false); }
  };
  return <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-5">
    <div>
      <h2 className="text-lg font-bold text-slate-800">Backup Otomatis ke Google Drive</h2>
      <p className="text-xs text-slate-600 mt-2 leading-relaxed">Setelah siswa menyelesaikan Pos 1–4 atau Pos 1–8, seluruh data siswa dari semua kelas dan pengaturan aplikasi dicadangkan ke JSON. Setiap penyimpanan ulang Pos 4 atau Pos 8 juga membuat cadangan baru. Berkas dapat dipakai melalui Restore Backup.</p>
    </div>
    <form onSubmit={save} className="space-y-3">
      <label className="block text-xs font-bold text-slate-700">Folder tujuan Google Drive
        <input type="url" required value={folderUrl} onChange={event => setFolderUrl(event.target.value)} disabled={busy} placeholder="https://drive.google.com/drive/folders/..." className="block mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={busy} /> Aktifkan backup otomatis saat Pos 4 dan Pos 8 disimpan</label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className="rounded-xl bg-teal-700 text-white px-4 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer">{busy ? 'Menyimpan...' : 'Simpan Pengaturan Drive'}</button>
        {driveBackupSettings.folderUrl && <a href={driveBackupSettings.folderUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-teal-700 underline">Buka Folder Drive</a>}
      </div>
    </form>
    {feedback && <p role={feedback.success ? 'status' : 'alert'} className={`text-xs ${feedback.success ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.message}</p>}
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
      <p className="font-bold">{driveBackupSettings.enabled ? 'Backup otomatis diaktifkan' : 'Backup otomatis belum diaktifkan'}</p>
      <p className="font-bold">{!workerActive ? 'Pemroses backup belum terhubung atau tidak aktif' : driveBackupWorker?.error ? 'Pemroses aktif, tetapi ada kesalahan' : 'Pemroses backup terhubung'}</p>
      <p>Pemeriksaan terakhir: {showDate(driveBackupWorker?.checkedAt || '')}</p>
      {driveBackupWorker?.error && <p role="alert" className="text-red-700 break-words">{driveBackupWorker.error}</p>}
      <p>Antrean tersimpan di Firebase dan diproses sekitar setiap menit. Status berhasil muncul setelah berkas tersimpan di Drive. Jika pemrosesan tertunda lebih dari satu jam, snapshot lama ditandai kedaluwarsa; unduh Backup Data untuk membuat cadangan keadaan saat ini.</p>
    </div>
    <details className="rounded-xl border border-slate-200 p-4 text-xs space-y-3">
      <summary className="font-bold cursor-pointer">Pengaturan awal pemroses Google Drive</summary>
      <ol className="list-decimal ml-5 mt-3 space-y-2 leading-relaxed">
        <li>Simpan folder tujuan di atas. Gunakan akun Google yang dapat mengelola proyek Firebase dan menulis ke folder tersebut.</li>
        <li>Buka <a href="https://script.google.com/home/start" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">Google Apps Script</a>. Salin <a href={`${import.meta.env.BASE_URL}drive-backup-worker.gs`} download className="text-teal-700 underline">skrip backup</a> ke Code.gs.</li>
        <li>Pada pengaturan proyek Apps Script, tampilkan manifest appsscript.json, lalu ganti isinya dengan <a href={`${import.meta.env.BASE_URL}drive-backup-manifest.json`} download className="text-teal-700 underline">manifest backup</a>.</li>
        <li>Jalankan fungsi <strong>installBackupTrigger</strong> sekali dan izinkan akses Firebase serta Drive. Tidak perlu membuat webhook publik. Tunggu status pemroses terhubung, lalu aktifkan backup otomatis.</li>
      </ol>
      <p className="mt-3">Pengaturan berlaku untuk semua perangkat melalui Firebase. Cadangan tidak mencakup akun/kata sandi login. Saat dinonaktifkan, antrean yang belum diproses akan menunggu.</p>
    </details>
    <div className="overflow-x-auto">
      <h3 className="font-bold text-sm mb-3">100 permintaan backup terbaru</h3>
      <table className="w-full text-xs text-left"><thead><tr className="border-b"><th className="py-2 pr-3">Pemicu</th><th className="py-2 pr-3">Waktu</th><th className="py-2">Status</th></tr></thead>
        <tbody>{driveBackupJobs.map(job => <tr key={job.id} className="border-b align-top">
          <td className="py-3 pr-3">{allStudents.find(student => student.id === job.studentId)?.name || 'Siswa'} · Pos {job.milestone}</td>
          <td className="py-3 pr-3 whitespace-nowrap">{showDate(job.createdAt)}</td>
          <td className="py-3">{job.status === 'complete' ? 'Berhasil' : job.status === 'expired' ? 'Snapshot kedaluwarsa' : job.error ? 'Gagal, menunggu percobaan ulang' : 'Menunggu'}
            {job.status === 'complete' && /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+/.test(job.fileUrl || '') && <a href={job.fileUrl} target="_blank" rel="noopener noreferrer" className="block text-teal-700 underline mt-1">Buka Backup</a>}
            {job.error && <p className="text-red-700 mt-1 break-words">{job.error}</p>}
          </td>
        </tr>)}{!driveBackupJobs.length && <tr><td colSpan={3} className="py-4 text-slate-500">Belum ada permintaan backup yang ditampilkan.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
