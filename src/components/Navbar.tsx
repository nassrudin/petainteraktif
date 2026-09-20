import React from 'react';
import { useApp } from '../context';
import { Compass, Shield, LogOut, ArrowRightLeft, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'result' | 'admin';
  setActiveTab: (tab: 'map' | 'result' | 'admin') => void;
  onOpenAdminLogin: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAdminLogin,
  isDarkMode = false,
  onToggleDarkMode,
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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-16 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* LEFT: Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 shrink-0">
              <Compass className="w-7 h-7 animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                Petain Aktif
              </span>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden md:block max-w-md truncate leading-relaxed">
                Growth Mindset Journey Map Percaya Diri — Kelas X
              </p>
            </div>
          </div>

          {/* CENTER: Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 dark:bg-slate-700 p-1 sm:p-1.5 rounded-2xl shadow-inner">
            {isAdminLoggedIn ? (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard Guru</span>
                <span className="sm:hidden">Guru</span>
              </button>
            ) : activeStudent ? (
              <>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-4 sm:px-5 py-2 text-sm sm:text-base font-semibold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'map'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  Peta Petualangan
                </button>
                <button
                  onClick={() => setActiveTab('result')}
                  className={`px-4 sm:px-5 py-2 text-sm sm:text-base font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'result'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  <span className="hidden sm:inline">Hasil & Download</span>
                  <span className="sm:hidden">Hasil</span>
                  {isFinishedAll && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 dark:bg-emerald-400 animate-ping ml-1"></span>
                  )}
                </button>
              </>
            ) : null}
          </div>

          {/* RIGHT: Dark Mode Toggle, User Info & Admin Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Dark Mode Toggle - Always Visible */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200 group"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={isDarkMode ? "Mode Terang" : "Mode Gelap"}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-45 transition-transform duration-300" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-600 group-hover:-rotate-12 transition-transform duration-300" />
                )}
              </button>
            )}

            {/* Divider for visual separation */}
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-1 hidden sm:block"></div>

            {/* Admin Logged In State */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-200 dark:border-teal-700 rounded-xl">
                  <Shield className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                  <div className="flex flex-col">
                    <p className="text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200 leading-none">
                      Guru BK
                    </p>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 leading-none mt-0.5">
                      Admin
                    </p>
                  </div>
                </div>
                <button
                  onClick={adminLogout}
                  className="p-2 sm:p-2.5 rounded-xl border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 hover:border-red-500 text-red-600 dark:text-red-400 transition-all duration-200 group"
                  title="Keluar dari mode admin"
                  aria-label="Logout admin"
                >
                  <LogOut className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                </button>
              </div>
            ) : activeStudent ? (
              /* Active Student State */
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 py-2 sm:py-2 bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 dark:from-emerald-500 dark:to-teal-400 text-white font-bold text-sm sm:text-base flex items-center justify-center shadow-md">
                    {activeStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100 leading-tight truncate max-w-[150px] sm:max-w-[200px]">
                      {activeStudent.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-semibold leading-tight mt-0.5">
                      {activeStudent.class} • Absen {activeStudent.absentNumber}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={clearActiveStudent}
                  className="p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all duration-200 group"
                  title="Ganti Siswa"
                  aria-label="Ganti siswa"
                >
                  <ArrowRightLeft className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                </button>

                <button
                  onClick={onOpenAdminLogin}
                  className="p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all duration-200 group"
                  title="Login Guru / Admin"
                  aria-label="Login guru"
                >
                  <Shield className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                </button>
              </div>
            ) : (
              /* Not Logged In - Show Admin Login Button */
              <button
                onClick={onOpenAdminLogin}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl group"
              >
                <Shield className="w-5 h-5 text-teal-300 dark:text-teal-400 group-hover:scale-110 transition-transform duration-200" />
                <span className="hidden sm:inline">Login Guru / Admin</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
