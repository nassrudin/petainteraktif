import React from 'react';
import { useApp } from '../context';
import { Compass, Shield, LogOut, ArrowRightLeft } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'result' | 'admin';
  setActiveTab: (tab: 'map' | 'result' | 'admin') => void;
  onOpenAdminLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAdminLogin,
}) => {
  const {
    activeStudent,
    clearActiveStudent,
    isAdminLoggedIn,
    adminLogout,
    getStudentJourney,
  } = useApp();

  const journey = activeStudent ? getStudentJourney(activeStudent.id) : null;
  const completedCount = journey ? Object.keys(journey.stages).length : 0;
  const isFinishedAll = completedCount === 8;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-200 shrink-0">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight flex flex-wrap items-center gap-1.5">
              Growth Mindset <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">Journey Map Percaya Diri</span>
            </span>
            <p className="text-[11px] text-slate-500 hidden md:block max-w-xl truncate">
              Delapan pos untuk mengubah rasa ragu menjadi keberanian bertumbuh — media layanan bimbingan klasikal kelas X
            </p>
          </div>
        </div>

        {/* Center Nav tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {isAdminLoggedIn ? (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>Dashboard Guru BK</span>
            </button>
          ) : activeStudent ? (
            <>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Peta Petualangan
              </button>
              <button
                onClick={() => setActiveTab('result')}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'result'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Cetak Hasil/Download</span>
                {isFinishedAll && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </button>
            </>
          ) : null}
        </div>

        {/* User profile & quick action */}
        <div className="flex items-center gap-2">
          {isAdminLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-left">
                <Shield className="w-4 h-4 text-teal-700" />
                <div className="text-xs">
                  <p className="font-bold text-teal-900">Guru Pembimbing</p>
                  <p className="text-[10px] text-teal-700">Admin BK</p>
                </div>
              </div>
              <button
                onClick={adminLogout}
                title="Keluar dari mode admin"
                className="px-3 py-1.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout Admin</span>
              </button>
            </div>
          ) : activeStudent ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  {activeStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950 leading-tight">
                    {activeStudent.name}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    Kelas {activeStudent.class} • Absen {activeStudent.absentNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={clearActiveStudent}
                title="Ganti Siswa"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ganti Siswa</span>
              </button>
              <button
                onClick={onOpenAdminLogin}
                title="Login Guru / Admin"
                className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Shield className="w-3.5 h-3.5 text-teal-300" />
              <span>Login Guru / Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
