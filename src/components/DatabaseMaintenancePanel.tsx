import React, { useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useApp } from '../context';
import { MaintenancePlan } from '../utils/databaseMaintenance';

interface Props {
  backupBusy: boolean;
  exportBusy: boolean;
  onBackup: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}

export function DatabaseMaintenancePanel({ backupBusy, exportBusy, onBackup, onBusyChange }: Props) {
  const { prepareRestoreBackup, prepareDeleteAllStudents, applyDatabaseMaintenance } = useApp();
  const [plan, setPlan] = useState<MaintenancePlan | null>(null);
  const [fileName, setFileName] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const disabled = busy || backupBusy || exportBusy;
  const setWorking = (value: boolean) => { setBusy(value); onBusyChange(value); };
  const message = (error: unknown) => error instanceof Error ? error.message : 'Periksa koneksi Firebase dan coba lagi.';

  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled) return;
    setPlan(null); setConfirmation(''); setFeedback(null); setProgress(null);
    setWorking(true);
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error('Berkas melebihi batas 100 MB.');
      let value: unknown;
      try { value = JSON.parse(await file.text()); }
      catch { throw new Error('Berkas bukan JSON yang valid. Pilih berkas dari tombol Backup Data.'); }
      const prepared = await prepareRestoreBackup(value);
      if (!prepared.operations.length) throw new Error('Backup kosong; tidak ada data untuk dipulihkan.');
      setFileName(file.name); setPlan(prepared);
    } catch (error) { setFeedback({ error: true, text: message(error) }); }
    finally { setWorking(false); }
  };

  const prepareDelete = async () => {
    if (disabled) return;
    setPlan(null); setConfirmation(''); setFeedback(null); setProgress(null);
    setWorking(true);
    try {
      const prepared = await prepareDeleteAllStudents();
      if (!prepared.studentCount) { setFeedback({ error: false, text: 'Tidak ada data siswa untuk dihapus.' }); return; }
      setPlan(prepared);
    } catch (error) { setFeedback({ error: true, text: message(error) }); }
    finally { setWorking(false); }
  };

  const apply = async () => {
    if (!plan || disabled) return;
    const required = plan.kind === 'restore' ? 'RESTORE' : 'HAPUS SEMUA';
    if (confirmation !== required) return;
    setFeedback(null); setWorking(true);
    try {
      const count = await applyDatabaseMaintenance(plan, confirmation, (completed, total) => setProgress({ completed, total }));
      setFeedback({ error: false, text: plan.kind === 'restore'
        ? `Restore selesai: ${plan.studentCount} siswa dipulihkan${plan.restoresSettings ? ' beserta pengaturan kelas' : ''} (${count} dokumen).`
        : `${plan.studentCount} data siswa dan seluruh jawabannya berhasil dihapus. Akun dan pengaturan kelas tetap tersedia.` });
    } catch (error) { setFeedback({ error: true, text: message(error) }); }
    finally { setPlan(null); setConfirmation(''); setWorking(false); }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3" aria-label="Pemulihan dan penghapusan data">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-bold text-sm text-slate-800">Pemulihan &amp; Penghapusan Data</h2>
        <p className="text-xs text-slate-500 mt-1">Berlaku untuk semua kelas. Gunakan Backup Data untuk menyimpan cadangan sebelum mengganti atau menghapus data.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBackup}
          disabled={disabled}
          aria-busy={backupBusy}
          className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          title="Backup semua siswa, seluruh jawaban, dan pengaturan kelas dari Firebase ke JSON"
        >
          <Download className="w-4 h-4" />
          <span>{backupBusy ? 'Membuat Backup...' : 'Backup Data'}</span>
        </button>
        <label className={`relative px-3 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-800 flex items-center gap-1.5 ${disabled ? 'opacity-50' : 'hover:bg-blue-100 cursor-pointer'}`}>
          <Upload className="w-4 h-4" /> Restore Backup
          <input aria-label="Pilih backup JSON untuk restore" type="file" accept=".json,application/json" onChange={selectFile} disabled={disabled} className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-wait" />
        </label>
        <button type="button" onClick={prepareDelete} disabled={disabled} className="px-3 py-2 text-xs font-bold rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
          <Trash2 className="w-4 h-4" /> Hapus Semua Data Siswa
        </button>
      </div>
    </div>
    {busy && <p role="status" className="text-xs text-blue-800">
      {progress ? `Memproses ${progress.completed} / ${progress.total} dokumen. Jangan tutup halaman sampai selesai.` : 'Memeriksa data server Firebase...'}
    </p>}
    {plan && <div className={`rounded-xl p-4 border space-y-3 ${plan.kind === 'delete' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      <h3 className="font-bold text-sm">{plan.kind === 'restore' ? 'Konfirmasi Restore Backup' : 'Konfirmasi Hapus Semua Data Siswa'}</h3>
      <p className="text-xs leading-relaxed break-words">
        {plan.kind === 'restore'
          ? `${fileName}: ${plan.studentCount} siswa — ${plan.added} ditambahkan, ${plan.replaced} diganti dengan isi backup.${plan.restoresSettings ? ' Pengaturan kelas dan akses pos juga dipulihkan.' : ' Pengaturan kelas tetap memakai data saat ini.'} Siswa lain tetap tersedia.`
          : `${plan.studentCount} siswa di semua kelas beserta seluruh jawaban dan progresnya akan dihapus dari Firebase. Filter dashboard tidak membatasi penghapusan. Akun guru/admin dan pengaturan kelas tetap tersedia. Siswa yang baru masuk setelah ringkasan ini tidak ikut dihapus.`}
      </p>
      <label className="block text-xs font-semibold">
        Ketik <strong>{plan.kind === 'restore' ? 'RESTORE' : 'HAPUS SEMUA'}</strong> untuk mengonfirmasi:
        <input value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" spellCheck={false} className="block mt-2 px-3 py-2 rounded-lg border border-slate-300 bg-white w-full max-w-sm" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={apply} disabled={disabled || confirmation !== (plan.kind === 'restore' ? 'RESTORE' : 'HAPUS SEMUA')} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-40 cursor-pointer">
          {plan.kind === 'restore' ? 'Terapkan Restore' : 'Hapus Permanen Data Siswa'}
        </button>
        <button type="button" onClick={() => { setPlan(null); setConfirmation(''); }} disabled={busy} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold cursor-pointer">Batal</button>
      </div>
    </div>}
    {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`text-xs leading-relaxed break-words ${feedback.error ? 'text-red-700' : 'text-emerald-800'}`}>{feedback.text}</p>}
  </section>;
}
