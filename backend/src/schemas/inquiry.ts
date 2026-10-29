import { z } from 'zod';
import { normalizeEmail, normalizePhone } from '../lib/phone.js';

export const USER_TYPES = ['parent', 'student', 'school'] as const;
export const CATEGORIES = ['scholarship', 'concert', 'admission', 'general_query'] as const;
export const STATUSES = ['new', 'in_progress', 'resolved'] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[0-9]{7,15}$/;

const PHONE_MESSAGE = 'Enter a phone number with 7 to 15 digits.';

export const createInquirySchema = z.object({
  userType: z.enum(USER_TYPES, { error: 'Select a user type.' }),
  category: z.enum(CATEGORIES, { error: 'Select a category.' }),
  name: z
    .string({ error: 'Enter your name.' })
    .trim()
    .min(2, 'Enter a name with at least 2 characters.')
    .max(100, 'Enter a name with at most 100 characters.'),
  email: z
    .string({ error: 'Enter your email address.' })
    .transform(normalizeEmail)
    .pipe(
      z
        .string()
        .max(254, 'Enter an email address with at most 254 characters.')
        .regex(EMAIL_PATTERN, 'Enter an email address such as name@example.com.'),
    ),
  phone: z
    .string({ error: PHONE_MESSAGE })
    .transform(normalizePhone)
    .pipe(z.string().regex(PHONE_PATTERN, PHONE_MESSAGE)),
  message: z
    .string({ error: 'Enter your message.' })
    .trim()
    .min(10, 'Enter a message with at least 10 characters.')
    .max(2000, 'Enter a message with at most 2000 characters.'),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

export const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  userType: z.enum(USER_TYPES).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export const updateStatusSchema = z.strictObject({
  status: z.enum(STATUSES, { error: 'Status must be new, in_progress or resolved.' }),
});

export const idParamsSchema = z.object({ id: z.uuid({ error: 'Id must be a valid UUID.' }) });

export const loginSchema = z.object({
  email: z.string({ error: 'Enter your email address.' }).trim().min(1, 'Enter your email address.').max(254),
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(200),
});
