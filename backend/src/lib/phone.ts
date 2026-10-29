/** Removes spaces, dashes, dots and brackets. Keeps digits and a leading plus. */
export function normalizePhone(input: string): string {
  return input.replace(/[\s\-.()]/g, '');
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}
