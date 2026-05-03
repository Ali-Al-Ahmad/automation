const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
console.log('[api-client] NEXT_PUBLIC_API_BASE_URL =', process.env.NEXT_PUBLIC_API_BASE_URL, '-> baseUrl =', baseUrl);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query } = options;

  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  const url = `${baseUrl}${path}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data
        ? Array.isArray(data.message)
          ? data.message.join(', ')
          : String(data.message)
        : null) ?? `Request failed: ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
