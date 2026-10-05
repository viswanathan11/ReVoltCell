const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, status = 500, code = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Failed to parse server response as JSON.', response.status);
  }

  if (!response.ok || (data && data.success === false)) {
    const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
    const errorCode = data?.error?.code || 'UNKNOWN_ERROR';
    throw new ApiError(errorMsg, response.status, errorCode, data?.error?.details);
  }

  return data;
}

export async function checkBackendHealth(): Promise<{ success: boolean; database: string }> {
  try {
    const res = await apiClient<{ success: boolean; database: string }>('/health');
    return res;
  } catch {
    return { success: false, database: 'DISCONNECTED' };
  }
}
