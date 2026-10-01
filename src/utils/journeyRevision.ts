import { StudentJourney } from '../types';

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

export function readRevisedDraft(storage: Pick<Storage, 'getItem'>, studentId: string, stageId: number): Record<string, unknown> | null {
  for (const id of stageId >= 5 && stageId <= 7 ? [stageId, ...[5, 6, 7].filter(n => n !== stageId)] : [stageId]) {
    const raw = storage.getItem(`gm_stage_draft_${studentId}_${id}`);
    if (!raw) continue;
    let answers;
    try { answers = JSON.parse(raw); } catch { continue; }
    if (answers && typeof answers === 'object' && !Array.isArray(answers) && revisedStageId(id, answers) === stageId) return answers;
  }
  return null;
}
