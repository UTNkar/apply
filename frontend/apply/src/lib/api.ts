import type { Position, Application, CreateApplicationData } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const csrfToken = getCookie('csrftoken');
  if (csrfToken && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    headers['X-CSRFToken'] = csrfToken;
  }

  // Merge with provided headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (value) headers[key] = String(value);
    });
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const errorObj = new Error(error.message || `HTTP ${response.status}`) as Error & { fieldErrors?: Record<string, unknown> };
    errorObj.fieldErrors = error;
    throw errorObj;
  }

  return response.json();
}

export const positionAPI = {
  async getAll() {
    return fetchAPI('/positions/') as Promise<{
      open_positions: Position[];
      my_positions: Position[];
    }>;
  },

  async getById(id: number) {
    return fetchAPI(`/positions/${id}/`) as Promise<Position>;
  },
};

export const applicationAPI = {
  async getAll() {
    return fetchAPI('/applications/') as Promise<Application[]>;
  },

  async getById(id: number) {
    return fetchAPI(`/applications/${id}/`) as Promise<Application>;
  },

  async create(data: CreateApplicationData) {
    return fetchAPI('/applications/', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<Application>;
  },

  async update(id: number, data: Partial<CreateApplicationData>) {
    return fetchAPI(`/applications/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }) as Promise<Application>;
  },

  async delete(id: number) {
    return fetchAPI(`/applications/${id}/`, {
      method: 'DELETE',
    });
  },
};
