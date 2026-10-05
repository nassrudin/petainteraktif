import { ActiveStudent, StudentJourney } from '../types';

export function normalizeStudentIdentity(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
}

// Called only on records returned by the authenticated student's server query.
// Prefer the existing answers if earlier duplicate records include an empty journey.
export function findExistingStudent<T extends { student: ActiveStudent; journey: StudentJourney }>(
  records: T[], name: string, studentClass: string, absentNumber: number,
): T | undefined {
  const matches = records.filter(({ student }) =>
    normalizeStudentIdentity(student.name) === normalizeStudentIdentity(name) &&
    normalizeStudentIdentity(student.class) === normalizeStudentIdentity(studentClass) && student.absentNumber === absentNumber);
  const completed = (record: T) => Object.values(record.journey.stages || {}).filter(stage => stage.completed).length;
  const filled = (record: T) => Object.values(record.journey.stages || {}).reduce((count, stage) => count +
    Object.values(stage.answers || {}).filter(answer => answer !== undefined && answer !== null && answer !== '' &&
      (!Array.isArray(answer) || answer.length > 0)).length, 0);
  const updated = (record: T) => Date.parse(record.journey.updatedAt) || 0;
  return matches.sort((a, b) => completed(b) - completed(a) || filled(b) - filled(a) || updated(b) - updated(a))[0];
}
