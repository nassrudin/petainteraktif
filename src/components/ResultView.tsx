import React, { useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA, PEGANGAN_DI_SEPANJANG_JALAN, PESAN_UNTUK_DIRI_SAYA } from '../data';
import { ActiveStudent } from '../types';
import { 
  Printer, ArrowLeft, ChevronLeft, ChevronRight, 
  MonitorPlay, LayoutGrid, Award, CheckCircle2, Trophy
} from 'lucide-react';

interface ResultViewProps {
  onBackToMap: () => void;
  targetStudent?: ActiveStudent | null;
  isTeacherView?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({ 
  onBackToMap, 
  targetStudent, 
  isTeacherView = false 
}) => {
  const { activeStudent: currentActiveStudent, getStudentJourney } = useApp();
  const activeStudent = targetStudent || currentActiveStudent;

  if (!activeStudent) {
    return null;
  }

  const journey = getStudentJourney(activeStudent.id);
  const totalSlides = 10;

  const [viewMode, setViewMode] = useState<'slides' | 'all'>('slides');
  const [currentSlide, setCurrentSlide] = useState<number>(1);

  const handlePrintPdf = () => {
    window.print();
  };

  const getStageAnswer = (stageId: number, fieldId: string): string => {
    const st = journey.stages[stageId];
    if (!st?.answers) return '';
    const val = st.answers[fieldId];
    if (val === undefined || val === null) return '';
    return Array.isArray(val) ? val.join(', ') : String(val);
  };

  const getStageScale = (stageId: number, fieldId: string): number => {
    const st = journey.stages[stageId];
    if (!st?.answers) return 3;
    const val = st.answers[fieldId];
    return typeof val === 'number' ? val : 3;
  };

  const formattedDate = new Date().toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-6">
      {/* Top Action & Presentation Control Bar (Hidden on print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <button
          onClick={onBackToMap}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isTeacherView ? 'Kembali ke Dashboard Guru BK' : 'Kembali ke Peta Petualangan'}</span>
        </button>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-stretch md:self-auto justify-center">
          <button
            onClick={() => setViewMode('slides')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'slides'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Slide Presentasi PPT (10 Slide)</span>
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'all'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Semua Slide (10 Lembar)</span>
          </button>
        </div>

        {/* Print / Export button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handlePrintPdf}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF (10 Slide PPT 16:9)</span>
          </button>
        </div>
      </div>

      {/* Interactive Slide Navigation Controls (Only visible in 'slides' mode and hidden in print) */}
      {viewMode === 'slides' && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setCurrentSlide((prev) => Math.max(1, prev - 1))}
            disabled={currentSlide === 1}
            className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentSlide === 1
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>

          <div className="flex flex-wrap items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setCurrentSlide(num)}
                className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentSlide === num
                    ? 'bg-emerald-600 text-white shadow-xs scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {num}
              </button>
            ))}
            <span className="text-xs font-semibold text-slate-500 ml-2">
              Slide {currentSlide} / {totalSlides}
            </span>
          </div>

          <button
            onClick={() => setCurrentSlide((prev) => Math.min(totalSlides, prev + 1))}
            disabled={currentSlide === totalSlides}
            className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentSlide === totalSlides
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
            }`}
          >
            <span>Berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PRINT-OPTIMIZED PPT 16:9 SLIDE CONTAINER */}
      <div className="space-y-8 print:space-y-0">
        
        {/* ========================================================================= */}
        {/* SLIDE 1: COVER PRESENTATION SLIDE (16:9 PPT) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 text-white p-6 sm:p-8 md:p-14 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-visible border border-slate-700 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 1 ? 'hidden' : ''}`}>
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between relative z-10">
            <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 text-xs sm:text-sm font-bold tracking-wider uppercase">
              Bimbingan Klasikal Kelas X • Bimbingan dan Konseling
            </span>
            <span className="text-xs text-teal-300 font-mono">
              Slide 1 / 10 • Lembar Presentasi
            </span>
          </div>

          <div className="space-y-4 my-auto relative z-10 max-w-4xl">
            <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-teal-200">
              Growth Mindset Journey Map Percaya Diri
            </h1>
            <p className="text-base sm:text-xl text-teal-100/90 font-medium leading-relaxed">
              Delapan pos untuk mengubah rasa ragu menjadi keberanian bertumbuh, media layanan bimbingan klasikal kelas X
            </p>
            <div className="h-1 w-24 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/15 relative z-10">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-1">
              <p className="text-[11px] font-extrabold uppercase text-emerald-300 tracking-wider">
                Presenter Siswa
              </p>
              <p className="text-lg sm:text-xl font-bold text-white font-display">
                {activeStudent.name}
              </p>
              <p className="text-xs text-teal-200">
                Kelas: {activeStudent.class} • Absen #{activeStudent.absentNumber} • Tanggal: {formattedDate}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-1 flex flex-col justify-center">
              <p className="text-[11px] font-extrabold uppercase text-amber-300 tracking-wider">
                Pesan Untuk Diri Saya
              </p>
              <p className="text-xs sm:text-sm font-semibold italic text-white leading-relaxed">
                "{PESAN_UNTUK_DIRI_SAYA}"
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 2: POS 1 - POTRET PERCAYA DIRI SAYA (TITIK MULAI) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 2 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider">
                Etape 1 • Titik Mulai
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 1: Potret Percaya Diri Saya
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 2 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700 text-sm">Di situasi apa saya merasa kurang percaya diri?</p>
                <div className="bg-emerald-50/70 p-3.5 rounded-xl text-emerald-950 font-medium italic border border-emerald-200 text-sm min-h-[90px] leading-relaxed break-all">
                  "{getStageAnswer(1, 'situation') || 'Belum diisi'}"
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Skala Percaya Diri Hari Ini:</span>
                <div className="flex items-center gap-1.5 font-bold">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                        getStageScale(1, 'confidence_scale') === n
                          ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-300'
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <p className="font-bold text-slate-700 text-xs uppercase tracking-wider text-emerald-800 border-b pb-1">
                Saat situasi itu terjadi:
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Saya Berpikir:</p>
                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">{getStageAnswer(1, 'thought') || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Saya Merasa:</p>
                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">{getStageAnswer(1, 'feeling') || '-'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Saya Lalu:</p>
                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">{getStageAnswer(1, 'action') || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>"{PEGANGAN_DI_SEPANJANG_JALAN}"</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 3: POS 2 - TANTANGAN YANG SAYA PILIH (CHALLENGE) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 3 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-teal-600 text-white font-black text-xs uppercase tracking-wider">
                Etape 1 • Challenge
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 2: Tantangan yang Saya Pilih
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 3 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700 text-sm">Satu tantangan yang paling ingin saya taklukkan:</p>
                <div className="bg-teal-50/70 p-3.5 rounded-xl text-teal-950 font-bold text-sm border border-teal-200 min-h-[90px] leading-relaxed break-all">
                  "{getStageAnswer(2, 'challenge_target') || 'Belum diisi'}"
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Apa yang membuat terasa berat?</p>
                <div className="bg-slate-50 p-3 rounded-xl text-slate-800 font-medium italic border border-slate-200 leading-relaxed break-all">
                  "{getStageAnswer(2, 'heavy_reason') || 'Belum diisi'}"
                </div>
              </div>

              <div className="space-y-1 text-xs bg-amber-50 p-3 rounded-xl border border-amber-200">
                <p className="text-[10px] font-bold text-amber-800 uppercase">Mantra saat takut mencoba:</p>
                <p className="font-bold text-amber-950 italic break-words">"{getStageAnswer(2, 'fear_motto') || '-'}"</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <p className="font-bold text-xs uppercase tracking-wider text-teal-800 border-b pb-1">
                Tukar Kalimat Menjadi Growth Mindset:
              </p>
              <div className="space-y-3 text-xs">
                <div className="bg-red-50/70 p-3 rounded-xl text-red-950 font-medium border border-red-200">
                  <span className="text-[10px] font-bold text-red-700 block mb-1">Saya tidak bisa :</span>
                  {getStageAnswer(2, 'tidak_bisa') || '-'}
                </div>
                <div className="bg-teal-50/70 p-3 rounded-xl text-teal-950 font-medium border border-teal-200">
                  <span className="text-[10px] font-bold text-teal-700 block mb-1">Saya belum bisa :</span>
                  {getStageAnswer(2, 'belum_bisa') || '-'}
                </div>
                <div className="bg-emerald-50/70 p-3 rounded-xl text-emerald-950 font-medium border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block mb-1">Dan saya sedang belajar dengan cara :</span>
                  {getStageAnswer(2, 'growth_learning_way') || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>"{PESAN_UNTUK_DIRI_SAYA}"</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 4: POS 3 - HAMBATAN DI JALAN SAYA (OBSTACLES) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 4 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-sky-600 text-white font-black text-xs uppercase tracking-wider">
                Etape 1 • Obstacles
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 3: Hambatan di Jalan Saya
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 4 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Hambatan dari dalam diri saya (pikiran, perasaan):</p>
                <div className="bg-slate-50 p-3.5 rounded-xl text-slate-800 font-medium italic border border-slate-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(3, 'internal_obstacles') || 'Belum diisi'}"
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Hambatan dari luar (lingkungan, orang lain):</p>
                <div className="bg-slate-50 p-3.5 rounded-xl text-slate-800 font-medium italic border border-slate-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(3, 'external_obstacles') || 'Belum diisi'}"
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-700">Mengapa hambatan itu muncul?</p>
                <div className="bg-slate-50 p-3 rounded-xl text-slate-800 font-medium border border-slate-200 leading-relaxed break-all">
                  "{getStageAnswer(3, 'why_obstacle_arises') || 'Belum diisi'}"
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-700">Cara saya melewatinya:</p>
                <div className="bg-sky-50 p-3 rounded-xl text-sky-950 font-bold border border-sky-200 leading-relaxed break-all">
                  "{getStageAnswer(3, 'how_to_overcome') || 'Belum diisi'}"
                </div>
              </div>

              <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 text-xs">
                <p className="text-[10px] font-bold text-sky-700 mb-0.5 block uppercase">Mantra saat ingin menyerah:</p>
                <p className="font-semibold text-sky-950 italic break-words">"{getStageAnswer(3, 'giveup_motto') || '-'}"</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>"Menyadari hambatan adalah setengah jalan dari menemukan jalan keluar."</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 5: POS 4 - LANGKAH KECIL SAYA (EFFORT) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 5 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-wider">
                Etape 1 • Effort
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 4: Langkah Kecil Saya
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 5 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <p className="font-bold text-xs uppercase tracking-wider text-blue-800 border-b pb-1">
                Tiga Langkah Menuju Tantangan (Dari yang Paling Mudah):
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 block">Langkah Pertama (Paling Mudah):</span>
                    <p className="text-slate-800 font-medium mt-0.5 leading-relaxed break-all">{getStageAnswer(4, 'step_1') || 'Belum diisi'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 block">Langkah Kedua:</span>
                    <p className="text-slate-800 font-medium mt-0.5 leading-relaxed break-all">{getStageAnswer(4, 'step_2') || 'Belum diisi'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-400 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 block">Langkah Ketiga:</span>
                    <p className="text-slate-800 font-medium mt-0.5 leading-relaxed break-all">{getStageAnswer(4, 'step_3') || 'Belum diisi'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-700">Mulai Tanggal:</p>
                <div className="bg-slate-50 p-3 rounded-xl text-slate-800 font-bold border border-slate-200 break-words">
                  {getStageAnswer(4, 'start_date') || 'Belum diisi'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 mb-1 block uppercase">Agar Konsisten:</p>
                  <p className="text-slate-800 font-medium leading-relaxed break-all">{getStageAnswer(4, 'consistency_strategy') || '-'}</p>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 mb-1 block uppercase">Yang Membantu:</p>
                  <p className="text-slate-800 font-medium leading-relaxed break-all">{getStageAnswer(4, 'helper_person') || '-'}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs">
                <p className="text-[10px] font-bold text-blue-700 mb-0.5 block uppercase">Apresiasi Untuk Diri Sendiri:</p>
                <p className="font-semibold text-blue-950 italic leading-relaxed break-all">"{getStageAnswer(4, 'step_done_motto') || '-'}"</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>"Kamu tidak perlu melihat seluruh anak tangga, cukup ambil langkah pertama."</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 6: POS 5 - SAAT SAYA DIKRITIK (CRITIQUES) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 6 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider">
                Etape 2 • Critiques
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 5: Saat Saya Dikritik
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 6 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700 text-sm">Masukan yang pernah saya terima:</p>
                <div className="bg-slate-50 p-3.5 rounded-xl text-slate-800 font-medium italic border border-slate-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(5, 'received_criticism') || 'Belum diisi'}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-800 mb-1 block uppercase">✅ Membangun:</p>
                  <p className="text-slate-800 font-medium leading-relaxed">{getStageAnswer(5, 'constructive_aspect') || '-'}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <p className="text-[10px] font-bold text-rose-800 mb-1 block uppercase">❌ Menjatuhkan:</p>
                  <p className="text-slate-800 font-medium leading-relaxed break-all">{getStageAnswer(5, 'destructive_aspect') || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Yang saya ambil dan saya perbaiki:</p>
                <div className="bg-indigo-50/70 p-3.5 rounded-xl text-indigo-950 font-medium border border-indigo-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(5, 'what_i_improve') || 'Belum diisi'}"
                </div>
              </div>

              <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 text-xs">
                <p className="text-[10px] font-bold text-indigo-800 mb-1 block uppercase">Mulai sekarang, respons saya terhadap kritik:</p>
                <p className="font-bold text-indigo-950 italic leading-relaxed break-all">"{getStageAnswer(5, 'response_strategy') || '-'}"</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>"Kritik bukan penilaian harga dirimu, melainkan petunjuk arah menuju karya yang lebih baik."</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 7: POS 6 - BELAJAR DARI ORANG LAIN (SUCCESS OF OTHERS) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 7 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-violet-600 text-white font-black text-xs uppercase tracking-wider">
                Etape 2 • Success of Others
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 6: Belajar dari Orang Lain
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 7 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700 text-sm">Siapa yang saya kagumi keberaniannya, dan siapa dia bagi saya?</p>
                <div className="bg-violet-50/70 p-3.5 rounded-xl text-violet-950 font-bold text-sm border border-violet-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(6, 'admired_figure') || 'Belum diisi'}"
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Apa yang ia lakukan sehingga terlihat percaya diri?</p>
                <div className="bg-slate-50 p-3.5 rounded-xl text-slate-800 font-medium border border-slate-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(6, 'confidence_actions') || 'Belum diisi'}"
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700 text-sm">Satu hal darinya yang bisa saya tiru minggu ini:</p>
                <div className="bg-emerald-50 p-3.5 rounded-xl text-emerald-950 font-bold text-sm border border-emerald-200 min-h-[95px] leading-relaxed break-all">
                  "{getStageAnswer(6, 'imitation_action') || '-'}"
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs">
                <p className="text-[10px] font-bold text-amber-800 mb-1 block uppercase">Prinsip Emas:</p>
                <p className="font-semibold text-amber-950 italic leading-relaxed break-all">
                  "Keberhasilan orang lain bukan ukuran kegagalan saya. Itu bukti bahwa hal itu bisa dicapai."
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>Growth Mindset Journey Map</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 8: POS 7 - MELIHAT KEMBALI USAHA SAYA (REFLEKSI) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 8 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs uppercase tracking-wider">
                Etape 2 • Refleksi
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 7: Melihat Kembali Usaha Saya
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 8 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Setelah mencoba langkah saya, apa yang sudah berhasil?</p>
                <div className="bg-emerald-50 p-3.5 rounded-xl text-emerald-950 font-semibold border border-emerald-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(7, 'what_succeeded') || 'Belum diisi'}"
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Bagian mana yang masih kurang berhasil, dan mengapa?</p>
                <div className="bg-amber-50 p-3.5 rounded-xl text-amber-950 font-medium border border-amber-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(7, 'what_failed_and_why') || 'Belum diisi'}"
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Hal baru yang saya ketahui tentang diri saya:</p>
                <div className="bg-purple-50/70 p-3.5 rounded-xl text-purple-950 font-medium border border-purple-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(7, 'new_self_knowledge') || '-'}"
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">Perubahan kecil yang sudah saya rasakan:</p>
                <div className="bg-slate-50 p-3.5 rounded-xl text-slate-800 font-medium border border-slate-200 min-h-[75px] leading-relaxed break-all">
                  "{getStageAnswer(7, 'felt_changes') || '-'}"
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>"{PEGANGAN_DI_SEPANJANG_JALAN}"</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 9: POS 8 - KOMITMEN DAN TARGET SAYA (GARIS AKHIR) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-slate-50 p-3 sm:p-5 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 9 ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-white font-black text-xs uppercase tracking-wider">
                Etape 2 • Garis Akhir
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Pos 8: Komitmen dan Target Saya
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Slide 9 / 10 • Presenter: {activeStudent.name} ({activeStudent.class})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <p className="font-bold text-xs uppercase tracking-wider text-amber-800 border-b pb-1">
                Target Satu Minggu ke Depan:
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <p className="text-slate-800 font-medium leading-relaxed break-all">{getStageAnswer(8, 'target_week_1') || 'Belum diisi'}</p>
                </div>
                <div className="flex items-start gap-2 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <p className="text-slate-800 font-medium leading-relaxed break-all">{getStageAnswer(8, 'target_week_2') || 'Belum diisi'}</p>
                </div>
                <div className="flex items-start gap-2 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <p className="text-slate-800 font-medium leading-relaxed break-all">{getStageAnswer(8, 'target_week_3') || 'Belum diisi'}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Keyakinan Terhadap Perubahan:</span>
                <div className="flex items-center gap-1.5 font-bold">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                        getStageScale(8, 'future_confidence_scale') === n
                          ? 'bg-amber-500 text-white font-black ring-2 ring-amber-300'
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="space-y-2">
                <p className="font-bold text-xs uppercase tracking-wider text-amber-800 border-b pb-1">
                  Ikrar Komitmen Kesungguhan Diri:
                </p>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 text-xs">
                <p className="text-xs sm:text-sm font-bold text-amber-950 italic leading-relaxed whitespace-pre-wrap break-words">
                  "{getStageAnswer(8, 'final_commitment') || 'Saya berkomitmen untuk terus berani mencoba dan tidak takut melakukan kesalahan dalam proses belajar.'}"
                </p>
              </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Dinyatakan dengan penuh kesadaran</span>
                <span className="font-bold text-slate-700">{activeStudent.name}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
            <span>Media Layanan Bimbingan Klasikal Kelas X</span>
            <span>"{PESAN_UNTUK_DIRI_SAYA}"</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 10: SERTIFIKAT KEBERANIAN GROWTH MINDSET (PIAGAM KELULUSAN 8 POS) */}
        {/* ========================================================================= */}
        <div className={`ppt-slide aspect-[16/9] w-full bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6 sm:p-8 md:p-12 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-visible border-4 border-amber-400 print:rounded-none print:shadow-none print:border-4 print:aspect-[16/9] min-h-[70vh] max-h-[95vh] print:h-screen print:w-screen print:break-after-page ${viewMode === 'slides' && currentSlide !== 10 ? 'hidden' : ''}`}>
          {/* Decorative Certificate Corner Accents */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-amber-500"></div>
          <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-amber-500"></div>
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-amber-500"></div>
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-amber-500"></div>

          <div className="flex items-center justify-between relative z-10">
            <span className="px-4 py-1 rounded-full bg-amber-200/80 text-amber-900 text-xs font-black tracking-wider uppercase">
              Piagam Penghargaan Refleksi Diri
            </span>
            <span className="text-xs text-amber-800 font-mono">
              Slide 10 / 10 • Sertifikat Keberanian
            </span>
          </div>

          <div className="text-center my-auto space-y-3 relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-300">
              <Trophy className="w-10 h-10" />
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black font-display text-amber-950 tracking-tight">
              SERTIFIKAT KEBERANIAN BERTUMBUH
            </h1>
            
            <p className="text-xs sm:text-sm text-amber-900/80 font-medium break-words">
              Diberikan sebagai pengakuan atas ketulusan, keberanian menghadapi keraguan diri, dan tekad bertumbuh melalui seluruh 8 Pos Media Layanan Bimbingan Klasikal:
            </p>

            <div className="py-2">
              <p className="text-2xl sm:text-4xl font-black text-emerald-900 font-display underline decoration-amber-400 decoration-4 underline-offset-8">
                {activeStudent.name}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-700 mt-2">
                Kelas {activeStudent.class} • Nomor Presensi #{activeStudent.absentNumber}
              </p>
            </div>

            <p className="text-xs sm:text-sm font-semibold italic text-amber-950 max-w-xl mx-auto leading-relaxed bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-amber-200/60 break-words">
              "{PEGANGAN_DI_SEPANJANG_JALAN}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-amber-200/80 relative z-10 text-center">
            <div>
              <p className="text-xs text-amber-900 font-medium">Peserta / Siswa</p>
              <div className="h-10"></div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide border-t border-slate-400/40 pt-1 inline-block min-w-[160px]">
                {activeStudent.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-amber-900 font-medium">Guru Bimbingan dan Konseling</p>
              <div className="h-10"></div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide border-t border-slate-400/40 pt-1 inline-block min-w-[160px]">
                Guru BK Kelas X
              </p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};



