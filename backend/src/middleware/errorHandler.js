const { Prisma } = require('@prisma/client');

function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error]', err.message, err.stack);
  }

  // express-validator validation errors
  if (err.type === 'validation') {
    return res.status(400).json({ errors: err.errors });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'campo';
      return res.status(409).json({ error: `${field} já existe` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
  }

  // Generic server error
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Erro interno do servidor';
  return res.status(status).json({ error: message });
}

module.exports = errorHandler;
