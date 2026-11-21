import type { ErrorRequestHandler, RequestHandler } from 'express';

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
};

export const httpErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const type = typeof err?.type === 'string' ? err.type : '';

  if (type === 'entity.too.large' || status === 413) {
    res.status(413).json({ error: 'Payload excede o tamanho máximo permitido.' });
    return;
  }

  if (err instanceof SyntaxError && status === 400) {
    res.status(400).json({ error: 'JSON malformado na requisição.' });
    return;
  }

  res.status(500).json({ error: 'Erro interno no servidor local.' });
};
