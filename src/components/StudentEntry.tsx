import React, { useEffect, useState } from 'react';
import { useApp } from '../context';
import { Compass, Shield, User, BookOpen, CheckCircle2 } from 'lucide-react';
import { Gender } from '../types';
import { firebaseEnabled } from '../firebase-config';

interface StudentEntryProps {
  onAdminClick: () => void;
}

export const StudentEntry: React.FC<StudentEntryProps> = ({ onAdminClick }) => {
  const { startStudentJourney, appSettings } = useApp();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('L');
  const [studentClass, setStudentClass] = useState<string>(appSettings.classNames[0]?.className || '');
  const [absentNumber, setAbsentNumber] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!appSettings.classNames.some((item) => item.className === studentClass)) {
      setStudentClass(appSettings.classNames[0]?.className || '');
      setAbsentNumber(appSettings.classNames[0]?.absentRangeMin || 1);
    }
  }, [appSettings.classNames, studentClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Harap masukkan nama lengkapmu terlebih dahulu.');
      return;
    }
    const finalClass = studentClass;
    const selectedConfig = appSettings.classNames.find(c => c.className === finalClass);
    if (!selectedConfig || !Number.isInteger(absentNumber) ||
      absentNumber < selectedConfig.absentRangeMin || absentNumber > selectedConfig.absentRangeMax) {
      setError(selectedConfig
        ? `Nomor absen kelas ${finalClass} harus ${selectedConfig.absentRangeMin}–${selectedConfig.absentRangeMax}.`
        : 'Harap pilih kelas dan nomor absen minimal 1.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await startStudentJourney(name, gender, finalClass, absentNumber);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal menyimpan data siswa. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedConfig = appSettings.classNames.find(c => c.className === studentClass);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl relative overflow-hidden">
          {/* Header decorative badge */}
          <div className="flex items-center justify-start mb-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold">
              <Compass className="w-4 h-4 animate-spin-slow text-emerald-600" />
              <span>Bimbingan Klasikal Kelas X</span>
            </div>
          </div>

          {/* Titles */}
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Growth Mindset Journey Map Percaya Diri
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Delapan pos untuk mengubah rasa ragu menjadi keberanian bertumbuh, media layanan bimbingan klasikal kelas X
            </p>
          </div>

          {/* Cara Mengisi Callout Box */}
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/90 flex gap-3 text-left">
            <Compass className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">
                Cara Mengisi Petualangan:
              </p>
              <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                Isi pos 1 sampai 4 pada pertemuan ini, lalu coba langkahmu selama satu minggu.{' '}
                {appSettings.allowEarlyPhaseTwo
                  ? 'Admin mengizinkan Pos 5 dibuka setelah Pos 4 selesai, tanpa menunggu satu minggu.'
                  : 'Pos 5 sampai 8 diisi setelah kamu mencobanya.'}{' '}
                Tidak ada jawaban benar atau salah, tulis sejujurnya tentang dirimu.
              </p>
            </div>
          </div>

          {/* Entry Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label htmlFor="student-name" className="block text-xs font-bold text-slate-700">
                Nama Lengkap Siswa <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="student-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkapmu..."
                  className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="student-gender" className="block text-xs font-bold text-slate-700">
                  Jenis Kelamin <span className="text-emerald-600">*</span>
                </label>
                <select
                  id="student-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full text-xs sm:text-sm px-3.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer bg-white"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1.5 text-left">
                <label htmlFor="student-absent" className="block text-xs font-bold text-slate-700">
                  Nomor Absen <span className="text-emerald-600">*</span>
                </label>
                <input
                  id="student-absent"
                  type="number"
                  min={selectedConfig?.absentRangeMin || 1}
                  max={selectedConfig?.absentRangeMax || 36}
                  value={absentNumber}
                  onChange={(e) => setAbsentNumber(Number(e.target.value))}
                  placeholder={`${selectedConfig?.absentRangeMin || 1} - ${selectedConfig?.absentRangeMax || 36}`}
                  className="w-full text-xs sm:text-sm px-3.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">
                Kelas <span className="text-emerald-600">*</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {appSettings.classNames.map((cls) => (
                  <button
                    key={cls.className}
                    type="button"
                    onClick={() => { setStudentClass(cls.className); setAbsentNumber(cls.absentRangeMin); }}
                    aria-pressed={studentClass === cls.className}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      studentClass === cls.className
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {cls.className}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span>{isSubmitting ? 'Menyimpan...' : 'Mulai Petualangan Refleksi'}</span>
              <BookOpen className="w-4 h-4" />
            </button>
          </form>

          {/* Guidance note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{firebaseEnabled ? 'Jawaban tersimpan di Firebase; lanjutkan di browser perangkat ini.' : 'Data petualangan tersimpan otomatis di perangkat ini'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
