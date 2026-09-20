import React from 'react';
import { useApp } from '../context';
import { User } from '../types';
import { Compass, Shield, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'result' | 'admin';
  setActiveTab: (tab: 'map' | 'result' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, users, switchUser, getStudentJourney } = useApp();
  const journey = getStudentJourney(currentUser.id);
  const completedCount = Object.keys(journey.stages).length;
  const isFinishedAll = completedCount === 8;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-2">
              Growth Mindset <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">Journey Map</span>
            </span>
            <p className="text-xs text-slate-500 hidden sm:block">Petualangan Refleksi Diri Siswa Interaktif</p>
          </div>
        </div>

        {/* Center Nav tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {currentUser.role === 'student' ? (
            <>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'map'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Peta Petualangan
              </button>
              <button
                onClick={() => setActiveTab('result')}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'result'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Hasil & Sertifikat</span>
                {isFinishedAll && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveTab('admin')}
              className="px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-white text-teal-700 shadow-xs"
            >
              Dashboard Guru / Admin
            </button>
          )}
        </div>

        {/* User profile & switcher */}
        <div className="flex items-center gap-3">
          {/* Quick Role switch dropdown */}
          <div className="relative group">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white cursor-pointer shadow-xs">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-emerald-300"
              />
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                  {currentUser.name}
                  {currentUser.role === 'admin' ? (
                    <Shield className="w-3 h-3 text-indigo-600 inline" />
                  ) : null}
                </p>
                <p className="text-[10px] text-slate-500">
                  {currentUser.role === 'admin' ? 'Guru Pembimbing' : currentUser.class || 'Siswa'}
                </p>
              </div>
            </div>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 hidden group-hover:block transition-all z-50 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ganti Akun Pengguna</p>
                <p className="text-[11px] text-slate-400">Pilih role siswa atau guru penguji</p>
              </div>
              <div className="py-1 space-y-1">
                {users.map((u: User) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      if (u.role === 'admin') setActiveTab('admin');
                      else setActiveTab('map');
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                      u.id === currentUser.id
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <img src={u.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold">{u.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {u.role === 'admin' ? 'Guru' : u.class}
                      </p>
                    </div>
                    {u.id === currentUser.id && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
