export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error || data?.message) message = data.error ?? data.message;
    } catch {
      // body wasn't JSON, fall back to default message
    }
    throw new ApiError(message, res.status);
  }

  // 204 / empty body safety
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}
