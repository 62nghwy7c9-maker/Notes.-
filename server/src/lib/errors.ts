import type { ApiErrorCode } from '@notes/shared';

/**
 * Typisierter Fehler aus der Service-Schicht; Routen übersetzen ihn über den
 * zentralen onError-Handler in das JSON-Fehlerformat aus Doc 05.
 */
export class ServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export const notFound = (msg: string) => new ServiceError('NOT_FOUND', msg);
export const conflict = (msg: string) => new ServiceError('CONFLICT', msg);
