import React, { useState, useEffect } from 'react';
  import { StageDefinition, StageAnswer } from '../types';
  import { useApp } from '../context';
  import { 
    X, Sparkles, ArrowRight, Award, Lightbulb, BookmarkCheck
  } from 'lucide-react';
  import confetti from 'canvas-confetti';
  
  interface StageModalProps {
    stage: StageDefinition;
    initialData?: StageAnswer;
    onClose: () => void;
    onCompletedNext?: (nextStageId: number) => void;
  }
  
  export const StageModal: React.FC<StageModalProps> = ({
    stage,
    initialData,
    onClose,
    onCompletedNext,
  }) => {
     const { activeStudent, saveStageAnswer, appSettings } = useApp();
     const draftKey = activeStudent ? `gm_stage_draft_${activeStudent.id}_${stage.id}` : '';
    
    // Initialize formData from initialData answers or empty object
    const [formData, setFormData] = useState<Record<string, any>>({});
    
     // Sync formData with initialData when initialData changes
     useEffect(() => {
       try {
         const draft = draftKey ? localStorage.getItem(draftKey) : null;
         setFormData(draft ? JSON.parse(draft) : initialData?.answers || {});
       } catch { setFormData(initialData?.answers || {}); }
     }, [initialData, draftKey]);

     const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (fieldId: string, value: any) => {
    const next = { ...formData, [fieldId]: value };
    setFormData(next);
    if (draftKey) {
      try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
    }
    setErrorMsg(null);
  };

  const handleChecklistToggle = (fieldId: string, option: string) => {
    const currentList: string[] = formData[fieldId] || [];
    const updated = currentList.includes(option)
      ? currentList.filter((item) => item !== option)
      : [...currentList, option];
    handleInputChange(fieldId, updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation check
    for (const field of stage.fields) {
      const val = formData[field.id];
       if (val === undefined || (typeof val === 'string' && !val.trim()) ||
           (Array.isArray(val) && val.length === 0)) {
        setErrorMsg(`Harap lengkapi pertanyaan: "${field.label}"`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6'],
      });
    } catch {
      // ignore
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!activeStudent) throw new Error('Sesi siswa tidak ditemukan.');
      await saveStageAnswer(activeStudent.id, stage.id, formData);
      try { localStorage.removeItem(draftKey); } catch { /* storage unavailable */ }
      onClose();
       if (stage.id === 4) {
         window.alert(appSettings.allowEarlyPhaseTwo
           ? 'Etape 1 selesai. Admin mengizinkan Pos 5 dibuka sekarang. Tetap praktikkan langkah kecilmu selama satu minggu.'
           : 'Etape 1 selesai. Coba langkah kecilmu selama satu minggu sebelum mengisi pos 5–8.');
      } else if (stage.id < 8 && onCompletedNext) {
        onCompletedNext(stage.id + 1);
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Jawaban belum tersimpan. Periksa koneksi dan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Pos ${stage.id}: ${stage.title}`} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }} className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header with Stage Island Theme */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 relative shrink-0">
           <button
             onClick={onClose}
             aria-label="Tutup pos"
             autoFocus
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              {stage.etapeTitle}
            </span>
            <span className="text-emerald-100 text-xs font-semibold bg-emerald-800/40 px-2.5 py-0.5 rounded-full">
              Pos {stage.id} • {stage.sectionTag}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
            {stage.id}. {stage.title}
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">{stage.subtitle}</p>

          {/* Badge Preview */}
          <div className="mt-3 flex items-center gap-2.5 bg-black/15 backdrop-blur-sm px-3.5 py-1.5 rounded-2xl w-fit border border-white/10">
            <Award className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-semibold text-white">
              Reward Pos: <span className="text-amber-200 font-bold">{stage.badgeName}</span>
            </span>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1">
          {/* Mission Card Banner */}
          <div className="bg-amber-50/80 border-b border-amber-100/80 px-6 py-3.5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-900 uppercase">Petunjuk Pos:</p>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">{stage.missionDescription}</p>
            </div>
          </div>

          {/* Example Callout Box if available */}
          {stage.exampleText && (
            <div className="mx-6 mt-4 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950">
              <Lightbulb className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Contoh: </span>
                <span className="italic">{stage.exampleText}</span>
              </div>
            </div>
          )}

          {/* Reminder Callout Box if available */}
          {stage.reminderText && (
            <div className="mx-6 mt-4 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-950">
              <BookmarkCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Ingat: </span>
                <span className="italic font-medium">{stage.reminderText}</span>
              </div>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} id="stage-form" className="p-6 space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span>{errorMsg}</span>
              </div>
            )}

            {stage.fields.map((field, idx) => (
              <div key={field.id} className="space-y-2">
                {/* Section Header if available */}
                {field.sectionHeader && (
                  <div className="pt-3 pb-1 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg inline-block">
                      {field.sectionHeader}
                    </h4>
                  </div>
                )}

                {field.type === 'text' || field.type === 'textarea'
                  ? <label htmlFor={`field-${field.id}`} className="block text-xs font-bold text-slate-800">{field.label}</label>
                  : <span className="block text-xs font-bold text-slate-800">{field.label}</span>}

                {/* TEXTAREA */}
                {field.type === 'textarea' && (
                   <textarea
                     id={`field-${field.id}`}
                    rows={3}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder || '............................................'}
                    className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                  />
                )}

                {/* SHORT TEXT */}
                {field.type === 'text' && (
                   <input
                     id={`field-${field.id}`}
                    type="text"
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder || '............................................'}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
                  />
                )}

                {/* SLIDER / SCALE 1 to 5 */}
                {field.type === 'slider' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600 font-medium">{field.helperText}</span>
                      <span className="text-base font-black text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                         Skor: {formData[field.id] !== undefined ? formData[field.id] : 'Belum dipilih'}
                      </span>
                    </div>

                    {/* Number buttons (1 2 3 4 5) */}
                    <div className="flex justify-center gap-2 sm:gap-4 py-1">
                      {[1, 2, 3, 4, 5].map((num) => {
                         const isSelected = formData[field.id] === num;
                        return (
                          <button
                            key={num}
                            type="button"
                             onClick={() => handleInputChange(field.id, num)}
                             aria-label={`Skor ${num}: ${field.label}`}
                             aria-pressed={isSelected}
                            className={`w-11 h-11 rounded-2xl font-black text-sm sm:text-base transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-200 scale-110 ring-2 ring-emerald-300'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>

                    {/* Scale Label Indicator */}
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600 px-1">
                      <span className="text-amber-800">{field.minLabel || '1 (Belum berani)'}</span>
                      <span className="text-slate-300">----------------</span>
                      <span className="text-emerald-800">{field.maxLabel || '5 (Sangat berani)'}</span>
                    </div>
                  </div>
                )}

                {/* CHECKLIST */}
                {field.type === 'checklist' && field.options && (
                  <div className="space-y-2 mt-1">
                    {field.options.map((opt) => {
                      const isChecked = ((formData[field.id] as string[]) || []).includes(opt);
                      return (
                        <label
                          key={opt}
                          onClick={() => handleChecklistToggle(field.id, opt)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 accent-emerald-600 w-4 h-4 rounded"
                          />
                          <span className="text-xs leading-snug">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Motivational Quote pill */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center italic text-xs text-slate-600 font-medium">
              "{stage.motivationalQuote}"
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:px-6 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="submit"
            form="stage-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-300 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <span>Simpan & Tuntaskan Pos {stage.id}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
