const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');
const IS_PROD = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(morgan(process.env.LOG_FORMAT || 'tiny'));
app.use(compression());

const cspDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
  'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
  'connect-src': ["'self'", 'https://cdn.tailwindcss.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"]
};

app.use(
  helmet({
    contentSecurityPolicy: IS_PROD ? { directives: cspDirectives } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: false } : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true
  })
);

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.use(
  express.static(PUBLIC_DIR, {
    index: 'index.html',
    etag: true,
    lastModified: true,
    maxAge: 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  })
);

app.use((req, res) => {
  res.status(404).type('text/plain').send('404 - Recurso nao encontrado');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text/plain').send('500 - Erro interno do servidor');
});

const server = app.listen(PORT, () => {
  console.log(`DriveElite escutando na porta ${PORT} (${IS_PROD ? 'production' : 'development'})`);
});

function shutdown(signal) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
