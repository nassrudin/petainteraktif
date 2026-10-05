import { StudentJourney, StageAnswer } from '../types';

function stageVersion(stage?: StageAnswer): string {
  if (!stage) return '';
  return JSON.stringify([stage.completed, stage.completedAt ?? '',
    Object.entries(stage.answers || {}).sort(([a], [b]) => a.localeCompare(b))]);
}

// The caller reads the latest server document inside a Firestore transaction.
export function prepareStageSave(latest: StudentJourney, stageId: number, answers: Record<string, unknown>, expectedStage: StageAnswer | undefined, now: string): StudentJourney {
  if (!Number.isInteger(stageId) || stageId < 1 || stageId > 8) throw new Error('Pos tidak valid.');
  const journey = reviseJourney(latest);
  if (stageVersion(journey.stages[stageId]) !== stageVersion(expectedStage)) {
    throw new Error('Jawaban pos ini berubah atau direset sejak formulir dibuka. Tutup formulir dan buka kembali untuk memuat jawaban terbaru sebelum menyimpan.');
  }
  const stages = { ...journey.stages, [stageId]: {
    completed: true, completedAt: journey.stages[stageId]?.completedAt || now, answers,
  } };
  return { ...reviseJourney({ ...journey, stages }), updatedAt: now };
}

export function getJourneyConfidenceScore(stages: StudentJourney['stages']): number {
  const answer = stages[8]?.answers?.after_confidence_scale ?? stages[1]?.answers?.confidence_scale;
  return typeof answer === 'number' && answer >= 1 && answer <= 5 ? answer * 20 : 0;
}

// Identify content by its field keys, so both legacy and revised records are safe to read.
export function revisedStageId(id: number, answers: Record<string, unknown>): number {
  if (id < 5 || id > 7) return id;
  if ('received_criticism' in answers || 'what_i_improve' in answers || 'response_strategy' in answers) return 6;
  if ('admired_figure' in answers || 'confidence_actions' in answers || 'imitation_action' in answers) return 7;
  if ('what_succeeded' in answers || 'what_failed_and_why' in answers || 'felt_changes' in answers) return 5;
  return id;
}

export function reviseJourney(journey: StudentJourney): StudentJourney {
  const stages: StudentJourney['stages'] = {};
  for (const [id, answer] of Object.entries(journey.stages || {})) {
    stages[revisedStageId(Number(id), answer.answers || {})] = answer;
  }
  return { ...journey, stages, confidenceScore: getJourneyConfidenceScore(stages), lastActiveStage: Array.from({ length: 8 }, (_, i) => i + 1)
    .find(id => !stages[id]?.completed) ?? 8 };
}
