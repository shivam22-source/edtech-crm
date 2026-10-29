import { clearToken, getToken } from './auth';
import type { Category, Status, UserType } from './constants';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (response.ok) return (await response.json()) as T;

  if (response.status === 401 && token) {
    clearToken();
    unauthorizedHandler?.();
  }

  let message = 'Something went wrong. Try again later.';
  let fields: Record<string, string> = {};
  try {
    const payload = (await response.json()) as { error?: { message?: string; fields?: Record<string, string> } };
    if (payload.error?.message) message = payload.error.message;
    if (payload.error?.fields) fields = payload.error.fields;
  } catch {
    // The body was not JSON; keep the generic message.
  }
  throw new ApiError(response.status, message, fields);
}

export interface Inquiry {
  id: string;
  userType: UserType;
  category: Category;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryList {
  data: Inquiry[];
  page: number;
  limit: number;
  total: number;
}

export interface InquiryPayload {
  userType: string;
  category: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  website: string;
}

export const submitInquiry = (payload: InquiryPayload) =>
  apiRequest<{ id: string }>('/api/inquiries', { method: 'POST', body: payload });

export const login = (email: string, password: string) =>
  apiRequest<{ token: string; expiresAt: string }>('/api/auth/login', { method: 'POST', body: { email, password } });

export const fetchMe = () => apiRequest<{ email: string }>('/api/auth/me');

export function fetchInquiries(params: URLSearchParams, signal?: AbortSignal) {
  const query = params.toString();
  return apiRequest<InquiryList>(`/api/admin/inquiries${query ? `?${query}` : ''}`, { signal });
}

export const updateStatus = (id: string, status: Status) =>
  apiRequest<Inquiry>(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status } });
