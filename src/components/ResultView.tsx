import React, { useState } from 'react';
import { useApp } from '../context';
import { STAGES_DATA } from '../data';
import { 
  Download, Printer, Share2, Sparkles, Trophy, 
  CheckCircle2, CloudUpload, ExternalLink, Calendar,
  Award, ShieldCheck, ArrowLeft, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResultViewProps {
  onBackToMap: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ onBackToMap }) => {
  const { currentUser, getStudentJourney, simulateGoogleDriveSync } = useApp();
  const journey = getStudentJourney(currentUser.id);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(journey.driveExportedUrl || null);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);

  const completedCount = Object.keys(journey.stages).length;
  const isFinished = completedCount === 8;

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadPng = () => {
    setIsGeneratingPng(true);
    // Draw canvas client-side to generate real PNG file
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 1200, 1600);
        gradient.addColorStop(0, '#064e3b');
        gradient.addColorStop(0.3, '#0f766e');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1200, 1600);

        // Header Card
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(60, 60, 1080, 240, 20);
        ctx.fill();

        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('GROWTH MINDSET JOURNEY MAP', 100, 130);

        ctx.fillStyle = '#334155';
        ctx.font = '22px sans-serif';
        ctx.fillText(`Nama Siswa : ${currentUser.name}`, 100, 180);
        ctx.fillText(`Kelas      : ${currentUser.class || '-'}`, 100, 215);
        ctx.fillText(`Skor Usaha : ${journey.confidenceScore}/100 | Status: Growth Master`, 100, 250);

        // Grid of 8 Stages Summary
        let cardY = 330;
        STAGES_DATA.forEach((stage, i) => {
          const stAnswer = journey.stages[stage.id];
          ctx.fillStyle = stAnswer?.completed ? '#f0fdf4' : '#f8fafc';
          ctx.roundRect(60, cardY, 1080, 130, 12);
          ctx.fill();

          ctx.fillStyle = stAnswer?.completed ? '#059669' : '#64748b';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(`Tahap ${stage.id}: ${stage.title} (${stage.islandName})`, 90, cardY + 35);

          ctx.fillStyle = '#334155';
          ctx.font = '15px sans-serif';
          let summary = 'Belum diselesaikan';
          if (stAnswer?.answers) {
            const firstKey = Object.keys(stAnswer.answers)[0];
            const rawVal = stAnswer.answers[firstKey];
            summary = Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal);
          }
          const truncated = summary.length > 90 ? summary.substring(0, 90) + '...' : summary;
          ctx.fillText(`Refleksi: "${truncated}"`, 90, cardY + 75);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px sans-serif';
          ctx.fillText(`Motto/Nilai: ${stage.badgeName}`, 90, cardY + 105);

          cardY += 150;
        });

        // Trigger Download
        const link = document.createElement('a');
        link.download = `Journey_Map_${currentUser.name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handleSyncGoogleDrive = async () => {
    setIsUploading(true);
    try {
      const url = await simulateGoogleDriveSync(currentUser.id);
      setUploadedUrl(url);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Navigation & Action Controls (Hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <button
          onClick={onBackToMap}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Peta Petualangan</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleDownloadPng}
            disabled={isGeneratingPng}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPng ? 'Memproses PNG...' : 'Unduh Gambar PNG'}</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-200 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <button
            onClick={handleSyncGoogleDrive}
            disabled={isUploading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all cursor-pointer"
          >
            <CloudUpload className="w-4 h-4 text-teal-600" />
            <span>{isUploading ? 'Sinkronisasi...' : 'Upload Google Drive'}</span>
          </button>
        </div>
      </div>

      {/* Google Drive notification banner */}
      {uploadedUrl && (
        <div className="no-print p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Dokumen Tersimpan di Google Drive!</p>
              <p className="text-emerald-700 font-mono text-[11px] truncate max-w-md sm:max-w-xl">
                {uploadedUrl}
              </p>
            </div>
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert(`Simulasi Google Drive URL:\n${uploadedUrl}`);
            }}
            className="text-emerald-800 underline font-semibold flex items-center gap-1 shrink-0 hover:text-emerald-950"
          >
            <span>Buka Tautan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Warning if journey not complete */}
      {!isFinished && (
        <div className="no-print p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Kamu baru menyelesaikan <strong>{completedCount} dari 8 tahap</strong>. Kamu tetap dapat melihat dan mencetak dokumen sementara ini, atau menyelesaikan tahap tersisa di peta perjalanan.
          </span>
        </div>
      )}

      {/* THE OFFICIAL PRINTABLE JOURNEY MAP SHEET */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl max-w-4xl mx-auto space-y-8">
        {/* Certificate / Sheet Header */}
        <div className="border-b-2 border-slate-800/10 pb-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600">
                Dokumen Hasil Pembelajaran
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                Growth Mindset Journey Map
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Portofolio Petualangan Refleksi & Komitmen Pengembangan Diri
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200 w-full sm:w-auto">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Pencapaian</p>
            <p className="text-lg font-black text-emerald-700">
              {isFinished ? '🏆 Growth Master' : '🌱 Dalam Petualangan'}
            </p>
            <p className="text-[11px] text-slate-400">
              {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Student Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</p>
            <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Kelas</p>
            <p className="text-sm font-bold text-slate-800">{currentUser.class || 'Siswa'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Tahap Selesai</p>
            <p className="text-sm font-bold text-emerald-600">{completedCount} / 8 Misi</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Skor Usaha / Keyakinan</p>
            <p className="text-sm font-bold text-teal-600">{journey.confidenceScore} / 100 Poin</p>
          </div>
        </div>

        {/* All 8 Stages Answer Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Catatan Refleksi 8 Tahap Petualangan
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STAGES_DATA.map((stage) => {
              const stData = journey.stages[stage.id];
              const answers = stData?.answers || {};

              return (
                <div
                  key={stage.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    stData?.completed
                      ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
                      : 'bg-slate-50/70 border-dashed border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                        {stage.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">{stage.title}</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {stage.badgeName}
                    </span>
                  </div>

                  {stData?.completed ? (
                    <div className="space-y-2 mt-3 text-xs">
                      {stage.fields.map((f) => {
                        const val = answers[f.id];
                        if (val === undefined) return null;
                        return (
                          <div key={f.id} className="bg-slate-50 p-2.5 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{f.label}</p>
                            <p className="text-xs text-slate-700 font-medium mt-0.5">
                              {Array.isArray(val) ? val.join(', ') : String(val)}
                            </p>
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-slate-400 text-right pt-1">
                        Selesai: {stData.completedAt}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-4 text-center">
                      Belum diisi oleh siswa.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivational Commitment Footer Section */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
              Ikrar Mindset
            </span>
            <p className="text-xs sm:text-sm font-bold text-emerald-950 italic">
              "Kesalahan bukan tanda kelemahan, melainkan bukti nyata keberanian untuk belajar dan bertumbuh."
            </p>
          </div>
          <div className="text-center sm:text-right shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tanda Tangan Komitmen</p>
            <p className="text-sm font-black text-slate-800 font-display mt-2 border-b-2 border-slate-300 pb-1 inline-block min-w-[140px]">
              {currentUser.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
