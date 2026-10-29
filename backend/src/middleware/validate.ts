import type { z } from 'zod';
import { AppError } from '../errors.js';

export function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  throw new AppError(400, 'VALIDATION_ERROR', 'Some fields need to be corrected.', fields);
}
