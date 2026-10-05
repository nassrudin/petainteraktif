const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const mod = { exports: {} };
new Function('module', 'exports', transformSync(fs.readFileSync('src/utils/studentSort.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code)(mod, mod.exports);
const { sortStudents, nextStudentSort, completedStageCount } = mod.exports;
const students = [
  { id: 'c', name: 'Zahra', class: 'X-10', absentNumber: 12 },
  { id: 'a', name: 'andi', class: 'X-2', absentNumber: 2 },
  { id: 'b', name: 'Budi', class: 'X-3', absentNumber: 9 },
];
const ids = values => values.map(student => student.id);

test('header sorting uses natural class order and numeric absence numbers without changing the source records', () => {
  assert.deepEqual(ids(sortStudents(students, {}, { key: 'class', direction: 'asc' })), ['a', 'b', 'c']);
  assert.deepEqual(ids(sortStudents(students, {}, { key: 'absentNumber', direction: 'desc' })), ['c', 'b', 'a']);
  assert.deepEqual(ids(sortStudents(students, {}, { key: 'name', direction: 'asc' })), ['a', 'b', 'c']);
  assert.deepEqual(ids(students), ['c', 'a', 'b']);
  assert.deepEqual(ids(sortStudents(students, {}, null)), ['c', 'a', 'b']);
});

test('progress sorts by completed positions and updates as server answers change; missing scores sort as zero', () => {
  const journeys = {
    a: { confidenceScore: 80, stages: { 1: { completed: false }, 2: { completed: false }, 3: { completed: false } } },
    b: { confidenceScore: 20, stages: { 1: { completed: true } } },
  };
  assert.equal(completedStageCount(journeys.a), 0);
  assert.equal(completedStageCount(undefined), 0);
  assert.deepEqual(ids(sortStudents(students, journeys, { key: 'progress', direction: 'desc' })), ['b', 'c', 'a']);
  assert.deepEqual(ids(sortStudents(students, journeys, { key: 'confidenceScore', direction: 'asc' })), ['c', 'b', 'a']);
  journeys.a.stages[1].completed = true;
  journeys.a.stages[2].completed = true;
  assert.deepEqual(ids(sortStudents(students, journeys, { key: 'progress', direction: 'desc' })), ['a', 'b', 'c']);
  assert.deepEqual(ids(sortStudents(students.filter(student => student.class === 'X-2'), journeys, { key: 'name', direction: 'asc' })), ['a']);
});

test('clicking a header alternates ascending/descending and another header starts ascending', () => {
  const first = nextStudentSort(null, 'name');
  assert.deepEqual(first, { key: 'name', direction: 'asc' });
  const second = nextStudentSort(first, 'name');
  assert.deepEqual(second, { key: 'name', direction: 'desc' });
  assert.deepEqual(nextStudentSort(second, 'name'), first);
  assert.deepEqual(nextStudentSort(second, 'class'), { key: 'class', direction: 'asc' });
});
