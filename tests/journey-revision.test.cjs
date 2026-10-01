const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const compiled = transformSync(fs.readFileSync('src/utils/journeyRevision.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const mod = { exports: {} };
new Function('module', 'exports', compiled)(mod, mod.exports);
const { reviseJourney, readRevisedDraft } = mod.exports;
const answer = (answers) => ({ completed: true, completedAt: '2026-09-25T10:30:00Z', answers });
test('partial legacy records preserve criticism and do not claim reflection is complete', () => {
  const criticism = answer({ received_criticism: 'Masukan guru' });
  const journey = { stages: { 5: criticism }, lastActiveStage: 6 };
  const revised = reviseJourney(journey);
  assert.equal(revised.stages[6], criticism);
  assert.equal(revised.stages[5], undefined);
  assert.equal(journey.stages[5], criticism);
  assert.deepEqual(reviseJourney(revised), revised);
});
test('three old stages move together and revised records remain stable', () => {
  const old = { stages: { 5: answer({ what_i_improve: 'Latihan' }), 6: answer({ admired_figure: 'Guru' }), 7: answer({ felt_changes: 'Berani' }) } };
  const revised = reviseJourney(old);
  assert.equal(revised.stages[5], old.stages[7]);
  assert.equal(revised.stages[6], old.stages[5]);
  assert.equal(revised.stages[7], old.stages[6]);
  assert.deepEqual(reviseJourney(revised), revised);
});
test('legacy drafts are read by content without overwriting other drafts', () => {
  const values = { gm_stage_draft_student_5: JSON.stringify({ response_strategy: 'Dengarkan' }), gm_stage_draft_student_7: JSON.stringify({ what_succeeded: 'Mencoba' }) };
  const storage = { getItem: key => values[key] ?? null };
  assert.deepEqual(readRevisedDraft(storage, 'student', 5), { what_succeeded: 'Mencoba' });
  assert.deepEqual(readRevisedDraft(storage, 'student', 6), { response_strategy: 'Dengarkan' });
  assert.equal(readRevisedDraft(storage, 'student', 7), null);
});

test('confidence score uses confidence rather than future expectations', () => {
  const { getJourneyConfidenceScore } = mod.exports;
  const stages = { 1: answer({ confidence_scale: 2 }), 8: answer({ future_confidence_scale: 5 }) };
  assert.equal(getJourneyConfidenceScore(stages), 40);
  assert.equal(reviseJourney({ stages, confidenceScore: 100 }).confidenceScore, 40);
  stages[8].answers.after_confidence_scale = 3;
  assert.equal(getJourneyConfidenceScore(stages), 60);
});
test('a damaged draft does not hide another valid legacy draft', () => {
  const values = { gm_stage_draft_student_5: '{broken', gm_stage_draft_student_7: JSON.stringify({ felt_changes: 'Berani' }) };
  assert.deepEqual(readRevisedDraft({ getItem: key => values[key] ?? null }, 'student', 5), { felt_changes: 'Berani' });
});
