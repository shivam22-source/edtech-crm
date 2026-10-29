/** Escapes backslash, percent and underscore so the text is matched literally by LIKE. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export interface SearchTerms {
  namePattern: string;
  /** Present only when the query holds at least 3 digits. */
  phonePattern: string | null;
}

export function buildSearchTerms(rawQuery: string): SearchTerms | null {
  const q = rawQuery.trim();
  if (q === '') return null;
  const digits = q.replace(/\D/g, '');
  return {
    namePattern: `%${escapeLike(q)}%`,
    phonePattern: digits.length >= 3 ? `%${digits}%` : null,
  };
}
