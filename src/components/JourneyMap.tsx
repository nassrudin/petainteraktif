import React, { useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA, PEGANGAN_DI_SEPANJANG_JALAN, PESAN_UNTUK_DIRI_SAYA } from '../data';
import { StageDefinition } from '../types';
import { StageModal } from './StageModal';
import { 
  Sparkles, Award, Lock, CheckCircle2, Trophy, 
  MapPin, ArrowRight, Play, RefreshCw, Star, Info, Calendar, User, HeartHandshake, Compass
} from 'lucide-react';

interface JourneyMapProps {
  onGoToResult: () => void;
  isDarkMode?: boolean;
}

export const JourneyMap: React.FC<JourneyMapProps> = ({ 
  onGoToResult,
  isDarkMode = false 
}) => {
  const { activeStudent, getStudentJourney, resetStudentProgress } = useApp();
  
  if (!activeStudent) {
    return null;
  }

  const journey = getStudentJourney(activeStudent.id);
  const [selectedStage, setSelectedStage] = useState<StageDefinition | null>(null);

  const completedCount = Object.keys(journey.stages).length;
  const progressPercent = Math.round((completedCount / 8) * 100);

  // Gamified status level
  let levelTitle = 'Level 1: Benih Growth';
  let levelDesc = 'Kamu baru menabur benih kesadaran diri. Teruskan langkah!';
  let levelColor = 'from-lime-500 to-emerald-500';

  if (completedCount >= 7) {
    levelTitle = 'Level 3: Pohon Percaya Diri';
    levelDesc = 'Luar biasa! Akarmu kokoh, siap menghadapi segala rintangan masa depan.';
    levelColor = 'from-emerald-600 to-teal-700';
  } else if (completedCount >= 4) {
    levelTitle = 'Level 2: Tunas Perubahan';
    levelDesc = 'Tunas barumu mulai tumbuh mekar dari langkah-langkah konsisten.';
    levelColor = 'from-teal-500 to-cyan-600';
  }

  // Island coordinates along an adventure S-curve path
  const stagePositions = [
    { left: '12%', top: '82%' }, // Stage 1 (Mulai dari lembah bawah)
    { left: '38%', top: '78%' }, // Stage 2
    { left: '68%', top: '70%' }, // Stage 3
    { left: '85%', top: '52%' }, // Stage 4
    { left: '60%', top: '40%' }, // Stage 5
    { left: '30%', top: '34%' }, // Stage 6
    { left: '16%', top: '20%' }, // Stage 7
    { left: '50%', top: '10%' }, // Stage 8 (Puncak di atas)
  ];

  const handleOpenStage = (stage: StageDefinition) => {
    const isUnlocked = stage.id === 1 || Boolean(journey.stages[stage.id - 1]?.completed);
    if (isUnlocked) {
      setSelectedStage(stage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Student Details & Gamification Level */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {/* Student details */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${levelColor} text-white font-extrabold text-xl flex items-center justify-center border-2 border-white dark:border-slate-600 shadow-md`}>
                {activeStudent.name.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-${levelColor.split('-')[1]}-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-600 shadow-xs`}>
                {completedCount}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Petualang Kelas X</span>
              <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">{activeStudent.name}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kelas: <span className="font-bold text-emerald-700 dark:text-emerald-400">{activeStudent.class}</span></p>
            </div>
          </div>

          {/* Gamification Level status */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${levelColor} flex items-center justify-center text-white shrink-0 shadow-sm`}>
              <Trophy className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                Status Mindset
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-0.5">{levelTitle}</p>
              <p className="text-[11px] text-slate-500 line-clamp-1">{levelDesc}</p>
            </div>
          </div>

          {/* Progress bar and Quick action */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Kemajuan Pos
              </span>
              <span className="font-extrabold text-emerald-600">{completedCount} / 8 Pos ({progressPercent}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1">
              <button
                onClick={() => resetStudentProgress(activeStudent.id)}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset progress untuk mengisi ulang"
              >
                <RefreshCw className="w-3 h-3" /> Reset Jawaban
              </button>

              {completedCount === 8 ? (
                <button
                  onClick={onGoToResult}
                  className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-transform hover:translate-x-0.5 cursor-pointer"
                >
                  Lihat Sertifikat Akhir <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-slate-400 font-medium">Selesaikan seluruh 8 pos</span>
              )}
            </div>
          </div>
        </div>
      </div>

       {/* Cara Mengisi Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-amber-400/20 dark:via-emerald-400/20 dark:to-teal-400/20 rounded-2xl p-4 sm:p-5 border border-amber-300/80 dark:border-amber-500/60 shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500 dark:bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-100 tracking-wider">
              Petunjuk Cara Mengisi
            </span>
            <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold px-2 py-0.5 rounded-full">
              Penting
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
            Isi pos 1 sampai 4 pada pertemuan ini, lalu coba langkahmu selama satu minggu. Pos 5 sampai 8 diisi setelah kamu mencobanya. Tidak ada jawaban benar atau salah, tulis sejujurnya tentang dirimu.
          </p>
        </div>
      </div>

      {/* Etape Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Etape 1 Info */}
        <div className="bg-gradient-to-br from-emerald-50 dark:from-emerald-900/30 to-teal-50/50 dark:to-teal-900/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
              Etape 1
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">Mengenali diri dan menghadapi tantangan</span>
          </div>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300 mt-1">
            Pos 1 (Titik mulai) • Pos 2 (Challenge) • Pos 3 (Obstacles) • Pos 4 (Effort)
          </p>
        </div>

        {/* Etape 2 Info */}
        <div className="bg-gradient-to-br from-indigo-50 dark:from-indigo-900/30 to-sky-50/50 dark:to-sky-900/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider">
              Etape 2
            </span>
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-100">Belajar dari sekitar dan bertumbuh</span>
          </div>
          <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300 mt-1">
            Pos 5 (Critiques) • Pos 6 (Success of others) • Pos 7 (Refleksi) • Pos 8 (Garis akhir)
          </p>
        </div>
      </div>

      {/* Interactive Visual Map Section */}
      <div className={`relative bg-gradient-to-b from-sky-100 dark:from-sky-900/40 via-emerald-50/60 dark:via-emerald-900/40 to-amber-50/50 dark:to-amber-900/40 rounded-3xl p-4 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden min-h-[640px] sm:min-h-[720px]`}>
        {/* Background terrain decorative art */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 800">
            <path d="M0,800 L200,600 L450,800 Z" fill="#99f6e4" opacity="0.3" />
            <path d="M600,800 L850,550 L1000,800 Z" fill="#a7f3d0" opacity="0.4" />
            <path d="M300,300 L500,100 L700,300 Z" fill="#bae6fd" opacity="0.5" />
            
            {/* Winding Adventure Path curve */}
            <path
              d="M 120,660 C 250,640 380,620 400,610 C 550,600 680,560 700,530 C 850,480 880,420 850,400 C 750,340 600,320 560,300 C 400,280 280,260 260,220 C 200,160 350,110 500,80"
              fill="none"
              stroke="#64748b"
              strokeWidth="4"
              strokeDasharray="8 8"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Map Header Overlay */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 dark:border-slate-700 shadow-xs">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display flex items-center gap-2">
              <span>🗺️ Peta Petualangan Growth Mindset Percaya Diri</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Klik setiap pulau pos refleksi untuk membuka misi belajarmu secara bertahap.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-800 dark:text-emerald-100 bg-emerald-100/80 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Selesai
            </span>
            <span className="flex items-center gap-1 text-amber-800 dark:text-amber-100 bg-amber-100/80 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg">
              <Play className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Pos Aktif
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Terkunci
            </span>
          </div>
        </div>

        {/* Floating Stage Nodes / Islands */}
        <div className="relative z-10 w-full h-[540px] sm:h-[600px]">
          {STAGES_DATA.map((stage, idx) => {
            const isCompleted = Boolean(journey.stages[stage.id]?.completed);
            const isUnlocked = stage.id === 1 || Boolean(journey.stages[stage.id - 1]?.completed);
            const isCurrentActive = isUnlocked && !isCompleted;
            const pos = stagePositions[idx];

            return (
              <div
                key={stage.id}
                style={{ left: pos.left, top: pos.top }}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group"
              >
                {/* Ping ring for current active stage */}
                {isCurrentActive && (
                  <div className="absolute inset-0 w-16 h-16 -left-1 -top-1 rounded-full bg-amber-400 animate-ping opacity-75 pointer-events-none"></div>
                )}

                {/* Main clickable Island Node */}
                <button
                  onClick={() => handleOpenStage(stage)}
                  disabled={!isUnlocked}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                    isCompleted
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white ring-4 ring-emerald-200 hover:scale-110'
                      : isCurrentActive
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white ring-4 ring-amber-300 hover:scale-110 shadow-amber-200'
                      : 'bg-slate-200/90 text-slate-400 ring-2 ring-slate-300/50 cursor-not-allowed opacity-80'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm" />
                  ) : isCurrentActive ? (
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white drop-shadow-sm" />
                  ) : (
                    <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                  <span className="text-[10px] font-black mt-0.5">Pos {stage.id}</span>
                </button>

                {/* Floating Tooltip Label */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-44 sm:w-52 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/90 shadow-xl text-center pointer-events-none transition-all group-hover:scale-105 z-20">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      {stage.islandName}
                    </span>
                    <span className="text-[8px] bg-slate-100 text-slate-600 px-1 rounded font-semibold">
                      Etape {stage.etapeNumber}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 leading-tight mt-0.5">
                    {stage.id}. {stage.title}
                  </h4>
                  <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[9px]">
                      {stage.sectionTag}
                    </span>
                    <span className="font-semibold flex items-center gap-0.5">
                      <Award className="w-3 h-3 text-amber-500 inline" />
                      {stage.badgeName}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom summary floating bar */}
        {completedCount === 8 && (
          <div className="relative z-20 mt-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">Selamat! Semua 8 Pos Telah Dituntaskan!</h3>
                <p className="text-xs text-emerald-100">
                  Kamu telah resmi meraih gelar <strong>Growth Master</strong>. Unduh Journey Map dan sertifikatmu sekarang!
                </p>
              </div>
            </div>
            <button
              onClick={onGoToResult}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs sm:text-sm hover:bg-emerald-50 shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Buka Dokumen & Unduh</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Motivational Quotes Banner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <Compass className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">Pegangan di sepanjang jalan</span>
          </div>
          <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
            "{PEGANGAN_DI_SEPANJANG_JALAN}"
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-teal-700 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">Pesan untuk diri saya</span>
          </div>
          <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
            "{PESAN_UNTUK_DIRI_SAYA}"
          </p>
        </div>
      </div>

      {/* Stage Detail / Reflection Form Modal */}
      {selectedStage && (
        <StageModal
          stage={selectedStage}
          initialData={journey.stages[selectedStage.id]}
          onClose={() => setSelectedStage(null)}
          onCompletedNext={(nextId) => {
            const nextStage = STAGES_DATA.find((s) => s.id === nextId);
            if (nextStage) {
              setSelectedStage(nextStage);
            }
          }}
        />
      )}
    </div>
  );
};
