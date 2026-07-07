import type { z } from 'zod';
import type { ApiErrorCode } from '@notes/shared';
import { apiErrorSchema } from '@notes/shared';

export class ApiClientError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function throwApiError(res: Response): Promise<never> {
  let code: ApiErrorCode = 'INTERNAL';
  let message = `Anfrage fehlgeschlagen (${res.status}).`;
  try {
    const parsed = apiErrorSchema.parse(await res.json());
    code = parsed.error.code;
    message = parsed.error.message;
  } catch {
    // Kein vertragskonformer Fehler-Body → generische Meldung behalten.
  }
  throw new ApiClientError(code, message, res.status);
}

/** GET/POST/… mit JSON-Antwort, Zod-geparst gegen den shared-Vertrag. */
export async function apiJson<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit & { json?: unknown },
): Promise<z.infer<T>> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json' } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) await throwApiError(res);
  return schema.parse(await res.json());
}

/** Aufruf ohne Antwort-Body (204). */
export async function apiVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) await throwApiError(res);
}
