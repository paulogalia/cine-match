import { ERROR_CODES, type ErrorCode } from '@cine-match/shared';

export function sanitizeDisplayText(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function toErrorPayload(err: unknown): { code: ErrorCode; message: string } {
  if (err instanceof DomainError) {
    return { code: err.code, message: err.message };
  }
  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'Ocorreu um erro interno inesperado.',
  };
}
