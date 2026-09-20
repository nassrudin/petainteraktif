import React, { useState } from 'react';
import { StageDefinition, StageAnswer } from '../types';
import { useApp } from '../context';
import { 
  X, Sparkles, CheckCircle2, ArrowRight, ArrowLeft,
  Flame, Award, HeartHandshake, HelpCircle 
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
  const { currentUser, saveStageAnswer } = useApp();
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    return initialData?.answers || {};
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setErrorMsg(null);
  };

  const handleChecklistToggle = (fieldId: string, option: string) => {
    const currentList: string[] = formData[fieldId] || [];
    const updated = currentList.includes(option)
      ? currentList.filter((item) => item !== option)
      : [...currentList, option];
    handleInputChange(fieldId, updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation check
    for (const field of stage.fields) {
      const val = formData[field.id];
      if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
        setErrorMsg(`Harap lengkapi pertanyaan: "${field.label}"`);
        return;
      }
    }

    setIsSubmitting(true);

    // Trigger gamified confetti reward
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

    setTimeout(() => {
      saveStageAnswer(currentUser.id, stage.id, formData);
      setIsSubmitting(false);
      onClose();
      if (stage.id < 8 && onCompletedNext) {
        onCompletedNext(stage.id + 1);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
        {/* Header with Stage Island Theme */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              Tahap {stage.id} dari 8
            </span>
            <span className="text-emerald-200 text-xs font-medium">
              📍 {stage.islandName}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
            {stage.title}
          </h2>
          <p className="text-emerald-100 text-sm mt-1">{stage.subtitle}</p>

          {/* Badge Preview */}
          <div className="mt-4 flex items-center gap-2.5 bg-black/15 backdrop-blur-sm px-3.5 py-2 rounded-2xl w-fit border border-white/10">
            <Award className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-semibold text-white">
              Reward Badge: <span className="text-amber-200 font-bold">{stage.badgeName}</span>
            </span>
          </div>
        </div>

        {/* Mission Card Banner */}
        <div className="bg-amber-50/80 border-b border-amber-100/80 px-6 py-3.5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-900 uppercase">Misi Refleksi:</p>
            <p className="text-xs text-amber-800 leading-relaxed mt-0.5">{stage.missionDescription}</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {errorMsg}
            </div>
          )}

          {stage.fields.map((field, idx) => (
            <div key={field.id} className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                {idx + 1}. {field.label}
              </label>

              {/* TEXTAREA */}
              {field.type === 'textarea' && (
                <textarea
                  rows={3}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                />
              )}

              {/* SHORT TEXT */}
              {field.type === 'text' && (
                <input
                  type="text"
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-400"
                />
              )}

              {/* SLIDER / SCALE */}
              {field.type === 'slider' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-500">{field.helperText}</span>
                    <span className="text-lg font-black text-emerald-600 bg-emerald-100 px-3 py-0.5 rounded-full">
                      {formData[field.id] !== undefined ? formData[field.id] : 5} / 10
                    </span>
                  </div>
                  <input
                    type="range"
                    min={field.min || 1}
                    max={field.max || 10}
                    step={field.step || 1}
                    value={formData[field.id] !== undefined ? formData[field.id] : 5}
                    onChange={(e) => handleInputChange(field.id, parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>1 (Ragu-ragu)</span>
                    <span>5 (Cukup yakin)</span>
                    <span>10 (Sangat Yakin & Mantap)</span>
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

              {/* RADIO */}
              {field.type === 'radio' && field.options && (
                <div className="space-y-2 mt-1">
                  {field.options.map((opt) => {
                    const isSelected = formData[field.id] === opt;
                    return (
                      <label
                        key={opt}
                        onClick={() => handleInputChange(field.id, opt)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={field.id}
                          checked={isSelected}
                          onChange={() => {}}
                          className="accent-emerald-600 w-4 h-4"
                        />
                        <span className="text-xs">{opt}</span>
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

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-300 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <span>Simpan & Selesaikan Misi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
