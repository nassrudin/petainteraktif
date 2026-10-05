import { ActiveStudent, StudentJourney } from '../types';

export type StudentSortKey = 'name' | 'class' | 'absentNumber' | 'progress' | 'confidenceScore';
export interface StudentSort { key: StudentSortKey; direction: 'asc' | 'desc' }

export function completedStageCount(journey?: StudentJourney): number {
  return Object.values(journey?.stages || {}).filter(stage => stage.completed).length;
}

export function nextStudentSort(current: StudentSort | null, key: StudentSortKey): StudentSort {
  return { key, direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc' };
}

export function sortStudents(students: ActiveStudent[], journeys: Record<string, StudentJourney>, sort: StudentSort | null): ActiveStudent[] {
  if (!sort) return students;
  const collator = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });
  const value = (student: ActiveStudent): string | number => {
    switch (sort.key) {
      case 'name': return student.name;
      case 'class': return student.class;
      case 'absentNumber': return student.absentNumber;
      case 'progress': return completedStageCount(journeys[student.id]);
      case 'confidenceScore': return journeys[student.id]?.confidenceScore || 0;
    }
  };
  return [...students].sort((a, b) => {
    const first = value(a), second = value(b);
    const result = typeof first === 'number' && typeof second === 'number' ? first - second : collator.compare(String(first), String(second));
    return result * (sort.direction === 'asc' ? 1 : -1);
  });
}
