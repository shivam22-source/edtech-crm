export const USER_TYPES = [
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' },
  { value: 'school', label: 'School' },
] as const;

export const CATEGORIES = [
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'concert', label: 'Concert' },
  { value: 'admission', label: 'Admission' },
  { value: 'general_query', label: 'General query' },
] as const;

export const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
] as const;

export type UserType = (typeof USER_TYPES)[number]['value'];
export type Category = (typeof CATEGORIES)[number]['value'];
export type Status = (typeof STATUSES)[number]['value'];

export function labelFor(options: ReadonlyArray<{ value: string; label: string }>, value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
