import React, { useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA, PEGANGAN_DI_SEPANJANG_JALAN, PESAN_UNTUK_DIRI_SAYA } from '../data';
import { 
  Printer, ArrowLeft, ChevronLeft, ChevronRight, 
  MonitorPlay, LayoutGrid
} from 'lucide-react';

interface ResultViewProps {
  onBackToMap: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ onBackToMap }) => {
  const { activeStudent, getStudentJourney } = useApp();

  if (!activeStudent) {
    return null;
  }

  const journey = getStudentJourney(activeStudent.id);
  const completedCount = Object.keys(journey.stages).length;
  const isFinished = completedCount === 8;

  // View mode: 'slides' (interactive 16:9 PPT slides) or 'all' (full slide deck for print/review)
  const [viewMode, setViewMode] = useState<'slides' | 'all'>('slides');
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const totalSlides = 5;

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

  return (
    <div className="space-y-6">
      {/* Top Action & Presentation Control Bar (Hidden on print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <button
          onClick={onBackToMap}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Peta Petualangan</span>
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
            <span>Slide Presentasi PPT</span>
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
            <span>Semua Slide (5 Lembar)</span>
          </button>
        </div>

        {/* Print / Export button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handlePrintPdf}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF (Ukuran PPT 16:9)</span>
          </button>
        </div>
      </div>

      {/* Interactive Slide Navigation Controls (Only visible in 'slides' mode and hidden in print) */}
      {viewMode === 'slides' && (
        <div className="no-print flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs">
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
            <span>Slide Sebelumnya</span>
          </button>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setCurrentSlide(num)}
                className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentSlide === num
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {num}
              </button>
            ))}
            <span className="text-xs font-semibold text-slate-500 ml-2">
              Slide {currentSlide} dari {totalSlides}
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
            <span>Slide Berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PRINT-OPTIMIZED PPT 16:9 SLIDE CONTAINER */}
      <div className="space-y-8 print:space-y-0">
        
        {/* ========================================================================= */}
        {/* SLIDE 1: COVER PRESENTATION SLIDE (16:9 PPT) */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || currentSlide === 1) && (
          <div className="ppt-slide aspect-[16/9] w-full bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 text-white p-8 sm:p-14 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden border border-slate-700 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] print:h-screen print:w-screen print:break-after-page">
            {/* Background ambient accents */}
            <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>

            {/* Top header tag */}
            <div className="flex items-center justify-between relative z-10">
              <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 text-xs sm:text-sm font-bold tracking-wider uppercase">
                Bimbingan Klasikal Kelas X • Bimbingan dan Konseling
              </span>
              <span className="text-xs text-teal-300 font-mono">
                Slide 1 / 5 • Lembar Presentasi
              </span>
            </div>

            {/* Middle Title & Subtitle */}
            <div className="space-y-4 my-auto relative z-10 max-w-4xl">
              <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-teal-200">
                Growth Mindset Journey Map Percaya Diri
              </h1>
              <p className="text-base sm:text-xl text-teal-100/90 font-medium leading-relaxed">
                Delapan pos untuk mengubah rasa ragu menjadi keberanian bertumbuh, media layanan bimbingan klasikal kelas X
              </p>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
            </div>

            {/* Bottom Presenter & Slogan Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/15 relative z-10">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-1">
                <p className="text-[11px] font-extrabold uppercase text-emerald-300 tracking-wider">
                  Presenter Siswa
                </p>
                <p className="text-lg sm:text-xl font-bold text-white font-display">
                  {activeStudent.name}
                </p>
                <p className="text-xs text-teal-200">
                  Kelas: {activeStudent.class} • Absen #{activeStudent.absentNumber} • Tanggal: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
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
        )}

        {/* ========================================================================= */}
        {/* SLIDE 2: ETAPE 1 (POS 1 & POS 2) */}
        {/* ========================================================================= */}
        {(viewMode === 'all' || currentSlide === 2) && (
          <div className="ppt-slide aspect-[16/9] w-full bg-slate-50 p-6 sm:p-10 rounded-3xl shadow-xl flex flex-col justify-between border border-slate-200 print:rounded-none print:shadow-none print:border-none print:aspect-[16/9] print:h-screen print:w-screen print:break-after-page">
            {/* Slide Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider">
                  Etape 1 : Mengenali Diri
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-800">
                  Potret Percaya Diri & Tantangan Pilihan
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Slide 2 / 5 • Presenter: {activeStudent.name} ({activeStudent.class})
              </span>
            </div>

            {/* 2-Column Content: Pos 1 & Pos 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-auto">
              {/* POS 1 CARD */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <h3 className="font-extrabold text-sm text-emerald-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                    <span>Potret Percaya Diri Saya (Titik Mulai)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Pos 1
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-slate-700">Di situasi apa saya merasa kurang percaya diri?</p>
                  <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium italic border border-slate-100">
                    "{getStageAnswer(1, 'situation') || 'Belum diisi'}"
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-slate-700">Saat situasi itu terjadi:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400">Saya Berpikir:</p>
                      <p className="text-slate-800 font-medium line-clamp-3 mt-0.5">{getStageAnswer(1, 'thought') || '-'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400">Saya Merasa:</p>
                      <p className="text-slate-800 font-medium line-clamp-3 mt-0.5">{getStageAnswer(1, 'feeling') || '-'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400">Saya Lalu:</p>
                      <p className="text-slate-800 font-medium line-clamp-3 mt-0.5">{getStageAnswer(1, 'action') || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                  <span className="font-bold text-emerald-900">Percaya diri saya hari ini:</span>
                  <div className="flex items-center gap-1 font-bold">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          getStageScale(1, 'confidence_scale') === n
                            ? 'bg-emerald-600 text-white font-black'
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* POS 2 CARD */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                  <h3 className="font-extrabold text-sm text-teal-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs">2</span>
                    <span>Tantangan yang Saya Pilih (Challenge)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    Pos 2
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-slate-700">Tantangan yang paling ingin saya taklukkan:</p>
                  <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-semibold border border-slate-100">
                    {getStageAnswer(2, 'challenge_target') || 'Belum diisi'}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-slate-700">Apa yang membuat terasa berat?</p>
                  <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium italic border border-slate-100">
                    "{getStageAnswer(2, 'heavy_reason') || 'Belum diisi'}"
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-emerald-800">
                    Tukar kalimatnya:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-emerald-50/70 p-2.5 rounded-xl text-emerald-950 font-medium border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 block mb-1">Saya tidak bisa:</span>
                      {getStageAnswer(2, 'tidak_bisa') || '-'}
                    </div>
                    <div className="bg-emerald-50/70 p-2.5 rounded-xl text-emerald-950 font-medium border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 block mb-1">Saya belum bisa:</span>
                      {getStageAnswer(2, 'belum_bisa') || '-'}
                    </div>
                    <div className="bg-emerald-50/70 p-2.5 rounded-xl text-emerald-950 font-medium border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 block mb-1">Dan saya sedang belajar dengan cara:</span>
                      {getStageAnswer(2, 'growth_learning_way') || '-'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Kalimat saat takut mencoba:</p>
                  <p className="font-bold text-slate-800 italic">"{getStageAnswer(2, 'fear_motto') || '-'}</p>
                </div>
              </div>
            </div>

            {/* Slide Footer */}
            <div className="text-[11px] text-slate-400 italic pt-2 flex justify-between border-t border-slate-200">
              <span>Media Layanan Bimbingan Klasikal Kelas X</span>
              <span>Growth Mindset Journey Map</span>
            </div>
          </div>
        )}

        {/* ... (remaining slides will be added here) */}
        
      </div>
    </div>
  );
};
