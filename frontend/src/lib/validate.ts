import { CATEGORIES, USER_TYPES } from './constants';

export interface InquiryValues {
  userType: string;
  category: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}

export type InquiryErrors = Partial<Record<keyof InquiryValues, string>>;

export const emptyValues: InquiryValues = { userType: '', category: '', name: '', email: '', phone: '', message: '' };

export function normalizePhone(input: string): string {
  return input.replace(/[\s\-.()]/g, '');
}

export function validateField(field: keyof InquiryValues, raw: string): string | undefined {
  const value = raw.trim();
  switch (field) {
    case 'userType':
      return USER_TYPES.some((option) => option.value === value) ? undefined : 'Select a user type.';
    case 'category':
      return CATEGORIES.some((option) => option.value === value) ? undefined : 'Select a category.';
    case 'name':
      if (value.length < 2) return 'Enter a name with at least 2 characters.';
      if (value.length > 100) return 'Enter a name with at most 100 characters.';
      return undefined;
    case 'email':
      if (value === '') return 'Enter your email address.';
      if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter an email address such as name@example.com.';
      return undefined;
    case 'phone':
      return /^[+]?[0-9]{7,15}$/.test(normalizePhone(value)) ? undefined : 'Enter a phone number with 7 to 15 digits.';
    case 'message':
      if (value.length < 10) return 'Enter a message with at least 10 characters.';
      if (value.length > 2000) return 'Enter a message with at most 2000 characters.';
      return undefined;
  }
}

export function validateAll(values: InquiryValues): InquiryErrors {
  const errors: InquiryErrors = {};
  for (const field of Object.keys(values) as Array<keyof InquiryValues>) {
    const message = validateField(field, values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}
