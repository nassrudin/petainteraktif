import React, { useState } from 'react';
import { useApp } from '../context';

type Feedback = { success: boolean; message: string } | null;

export const StaffAccountsPanel: React.FC = () => {
  const {
    adminRole, adminCredentials, staffAccounts = [], createAdmin,
    createTeacherAccount, setTeacherActive, changeOwnPassword,
  } = useApp();
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherConfirm, setTeacherConfirm] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const setupRoot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (setupPassword !== setupConfirm) return setFeedback({ success: false, message: 'Konfirmasi kata sandi tidak cocok.' });
    if (!createAdmin) return;
    setBusy(true);
    const result = await createAdmin(setupPassword);
    setBusy(false);
    setFeedback(result);
    if (result.success) {
      setSetupPassword('');
      setSetupConfirm('');
      window.alert(result.message);
    }
  };

  const addTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    if (teacherPassword !== teacherConfirm) return setFeedback({ success: false, message: 'Konfirmasi kata sandi tidak cocok.' });
    if (!createTeacherAccount) return;
    setBusy(true);
    const result = await createTeacherAccount(teacherUsername, teacherPassword);
    setBusy(false);
    setFeedback(result);
    if (result.success) { setTeacherUsername(''); setTeacherPassword(''); setTeacherConfirm(''); }
  };

  const toggleTeacher = async (uid: string, active: boolean) => {
    if (!setTeacherActive) return;
    if (!active && !window.confirm('Nonaktifkan akses guru ini ke seluruh jawaban siswa?')) return;
    setBusy(true);
    setFeedback(await setTeacherActive(uid, active));
    setBusy(false);
  };

  const updateOwnPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== newConfirm) return setFeedback({ success: false, message: 'Konfirmasi kata sandi tidak cocok.' });
    if (!changeOwnPassword) return;
    setBusy(true);
    const result = await changeOwnPassword(currentPassword, newPassword);
    setBusy(false);
    setFeedback(result);
    if (result.success) { setCurrentPassword(''); setNewPassword(''); setNewConfirm(''); }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
  const buttonClass = 'rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60';

  return <div className="mx-auto max-w-2xl space-y-5">
    {feedback && <p role="status" className={`rounded-xl border p-3 text-sm ${feedback.success
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-800'}`}>{feedback.message}</p>}

    {adminRole === 'legacy' && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Buat akun admin</h2>
      <p className="mt-2 text-sm text-slate-600">Nama pengguna pertama adalah <strong>admin</strong>. Tentukan kata sandinya sendiri. Setelah akun dibuat, akses Google lama berhenti dan Anda masuk memakai akun baru.</p>
      <form onSubmit={(event) => void setupRoot(event)} className="mt-5 space-y-3">
        <label className="block text-sm font-semibold text-slate-700">Kata sandi admin
          <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={12} value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Ulangi kata sandi
          <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={12} value={setupConfirm} onChange={(event) => setSetupConfirm(event.target.value)} required />
        </label>
        <button className={buttonClass} disabled={busy} type="submit">Buat admin</button>
      </form>
    </section>}

    {adminRole === 'admin' && <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Buat akun guru</h2>
        <p className="mt-2 text-sm text-slate-600">Guru masuk dengan nama pengguna dan kata sandi. Mereka tidak memerlukan akun Google atau alamat email pribadi.</p>
        <form onSubmit={(event) => void addTeacher(event)} className="mt-5 space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Nama pengguna guru
            <input className={`${inputClass} mt-1`} type="text" autoComplete="off" minLength={3} maxLength={32} pattern="[a-z][a-z0-9._-]{2,31}" placeholder="Contoh: guru_bk_1" value={teacherUsername} onChange={(event) => setTeacherUsername(event.target.value.toLowerCase())} required />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Kata sandi awal
            <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={12} value={teacherPassword} onChange={(event) => setTeacherPassword(event.target.value)} required />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Ulangi kata sandi
            <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={12} value={teacherConfirm} onChange={(event) => setTeacherConfirm(event.target.value)} required />
          </label>
          <button className={buttonClass} disabled={busy} type="submit">Buat akun guru</button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Daftar guru</h2>
        <div className="mt-4 space-y-3">
          {staffAccounts.length === 0 && <p className="text-sm text-slate-500">Belum ada akun guru.</p>}
          {staffAccounts.map((account) => <div key={account.uid} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <div><p className="text-sm font-semibold text-slate-800">{account.username}</p><p className="text-xs text-slate-500">{account.active ? 'Aktif' : 'Tidak aktif'}</p></div>
            <button type="button" disabled={busy} onClick={() => void toggleTeacher(account.uid, !account.active)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {account.active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>)}
        </div>
      </section>
    </>}

    {(adminRole === 'admin' || adminRole === 'teacher') && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Ubah kata sandi sendiri</h2>
      <p className="mt-1 text-sm text-slate-600">Akun: <strong>{adminCredentials.username}</strong>. Simpan kata sandi baru di tempat yang aman.</p>
      <form onSubmit={(event) => void updateOwnPassword(event)} className="mt-5 space-y-3">
        <label className="block text-sm font-semibold text-slate-700">Kata sandi saat ini
          <input className={`${inputClass} mt-1`} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Kata sandi baru
          <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Ulangi kata sandi baru
          <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" minLength={12} value={newConfirm} onChange={(event) => setNewConfirm(event.target.value)} required />
        </label>
        <button className={buttonClass} disabled={busy} type="submit">Simpan kata sandi baru</button>
      </form>
      <p className="mt-4 text-xs text-slate-500">Jika seorang guru lupa kata sandinya, admin dapat menonaktifkan akun lama dan membuat akun pengganti.</p>
    </section>}
  </div>;
};
