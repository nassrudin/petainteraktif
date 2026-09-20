import React, { useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA } from '../data';
import { StageDefinition } from '../types';
import { StageModal } from './StageModal';
import { 
  Sparkles, Award, Lock, CheckCircle2, Trophy, 
  MapPin, ArrowRight, Play, RefreshCw, Star
} from 'lucide-react';

interface JourneyMapProps {
  onGoToResult: () => void;
}

export const JourneyMap: React.FC<JourneyMapProps> = ({ onGoToResult }) => {
  const { currentUser, getStudentJourney, resetStudentProgress } = useApp();
  const journey = getStudentJourney(currentUser.id);
  const [selectedStage, setSelectedStage] = useState<StageDefinition | null>(null);

  const completedCount = Object.keys(journey.stages).length;
  const progressPercent = Math.round((completedCount / 8) * 100);

  // Determine user gamified level according to PRD section 10
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
    // Stage 1 is always unlocked. Others require the previous stage to be completed.
    const isUnlocked = stage.id === 1 || Boolean(journey.stages[stage.id - 1]?.completed);
    if (isUnlocked) {
      setSelectedStage(stage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Student Progress & Gamification Level */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {/* Student details */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={currentUser.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
              />
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-xs">
                {completedCount}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Petualang</span>
              <h1 className="text-xl font-black text-slate-800 leading-tight">{currentUser.name}</h1>
              <p className="text-xs text-slate-500 font-medium">{currentUser.class || 'Kelas Siswa'}</p>
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
                Kemajuan Misi
              </span>
              <span className="font-extrabold text-emerald-600">{completedCount} / 8 Tahap ({progressPercent}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1">
              <button
                onClick={() => resetStudentProgress(currentUser.id)}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                title="Reset progress untuk demonstrasi"
              >
                <RefreshCw className="w-3 h-3" /> Reset Ulang
              </button>

              {completedCount === 8 ? (
                <button
                  onClick={onGoToResult}
                  className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-transform hover:translate-x-0.5"
                >
                  Lihat Sertifikat Akhir <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-slate-400 font-medium">Selesaikan seluruh 8 tahap</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Visual Map Section */}
      <div className="relative bg-gradient-to-b from-sky-100 via-emerald-50/60 to-amber-50/50 rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-md overflow-hidden min-h-[640px] sm:min-h-[720px]">
        {/* Background terrain decorative art */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 800">
            {/* Mountain silhouettes */}
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
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-xs">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 font-display flex items-center gap-2">
              <span>🗺️ Peta Petualangan Growth Mindset</span>
            </h2>
            <p className="text-xs text-slate-600">
              Klik setiap pulau atau pos refleksi untuk membuka misi belajarmu secara bertahap.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
            </span>
            <span className="flex items-center gap-1 text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-lg">
              <Play className="w-3.5 h-3.5" /> Misi Aktif
            </span>
            <span className="flex items-center gap-1 text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-lg">
              <Lock className="w-3.5 h-3.5" /> Terkunci
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
                  <div className="absolute inset-0 w-16 h-16 -left-1 -top-1 rounded-full bg-amber-400 animate-pulse-ring pointer-events-none"></div>
                )}

                {/* Main clickable Island Node */}
                <button
                  type="button"
                  onClick={() => handleOpenStage(stage)}
                  disabled={!isUnlocked}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-transform cursor-pointer shadow-lg active:scale-95 ${
                    isCompleted
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white hover:scale-105 ring-4 ring-emerald-200'
                      : isCurrentActive
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white hover:scale-110 ring-4 ring-amber-200 animate-float'
                      : 'bg-white/80 border border-slate-300 text-slate-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  ) : isUnlocked ? (
                    <span className="font-extrabold text-xl font-display">{stage.id}</span>
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}

                  {/* Stage Number Mini Tag */}
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                    {stage.id}
                  </span>
                </button>

                {/* Island Label Tooltip / Card below */}
                <div
                  className={`mt-2 text-center transition-all min-w-[120px] sm:min-w-[140px] pointer-events-none ${
                    isCurrentActive ? 'scale-105' : ''
                  }`}
                >
                  <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm inline-block">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                      {stage.islandName}
                    </p>
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                      {stage.title}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                      <Award className="w-3 h-3 text-amber-500 inline" />
                      {stage.badgeName}
                    </p>
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
                <h3 className="font-extrabold text-base sm:text-lg">Selamat! Semua Tahap Telah Dituntaskan!</h3>
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
