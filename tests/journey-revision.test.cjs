const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const compiled = transformSync(fs.readFileSync('src/utils/journeyRevision.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const mod = { exports: {} };
new Function('module', 'exports', compiled)(mod, mod.exports);
const { reviseJourney, prepareStageSave } = mod.exports;
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

test('confidence score uses confidence rather than future expectations', () => {
  const { getJourneyConfidenceScore } = mod.exports;
  const stages = { 1: answer({ confidence_scale: 2 }), 8: answer({ future_confidence_scale: 5 }) };
  assert.equal(getJourneyConfidenceScore(stages), 40);
  assert.equal(reviseJourney({ stages, confidenceScore: 100 }).confidenceScore, 40);
  stages[8].answers.after_confidence_scale = 3;
  assert.equal(getJourneyConfidenceScore(stages), 60);
});

test('saving from an older tab retains unrelated newer server answers', () => {
  const oldStage = answer({ situation: 'Awal', confidence_scale: 2 });
  const latest = { stages: { 1: oldStage, 2: answer({ challenge_target: 'Terbaru' }) } };
  const result = prepareStageSave(latest, 1, { situation: 'Revisi', confidence_scale: 3 }, oldStage, '2026-10-05T00:00:00Z');
  assert.equal(result.stages[2], latest.stages[2]);
  assert.equal(result.stages[1].answers.situation, 'Revisi');
  assert.equal(latest.stages[1], oldStage);
});
test('an outdated form cannot overwrite a changed or reset stage', () => {
  const old = answer({ situation: 'Awal' });
  assert.throws(() => prepareStageSave({ stages: { 1: answer({ situation: 'Terbaru' }) } }, 1, { situation: 'Usang' }, old, 'now'), /berubah atau direset/);
  assert.throws(() => prepareStageSave({ stages: {} }, 1, { situation: 'Usang' }, old, 'now'), /berubah atau direset/);
  assert.throws(() => prepareStageSave({ stages: { 1: old } }, 1, {}, undefined, 'now'), /berubah atau direset/);
});
test('transaction saves normalize old Firebase stage order without losing other answers', () => {
  const criticism = answer({ received_criticism: 'Guru' });
  const figure = answer({ admired_figure: 'Kakak' });
  const latest = { stages: { 5: criticism, 6: figure } };
  const result = prepareStageSave(latest, 5, { what_succeeded: 'Mencoba' }, undefined, 'now');
  assert.equal(result.stages[6], criticism);
  assert.equal(result.stages[7], figure);
  assert.equal(result.stages[5].answers.what_succeeded, 'Mencoba');
});
test('editing Pos 4 retains its first completion date for the waiting period', () => {
  const original = answer({ step_1: 'Latihan' });
  const result = prepareStageSave({ stages: { 4: original } }, 4, { step_1: 'Latihan lagi' }, original, '2026-10-05T00:00:00Z');
  assert.equal(result.stages[4].completedAt, original.completedAt);
  assert.equal(result.updatedAt, '2026-10-05T00:00:00Z');
});
