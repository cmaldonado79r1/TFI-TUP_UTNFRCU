require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes, intente más tarde.' }
});
app.use('/api/', limiter);

// ── Rutas API ─────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/usuarios',     require('./routes/usuarios.routes'));
app.use('/api/cursos',       require('./routes/cursos.routes'));
app.use('/api/materias',     require('./routes/materias.routes'));
app.use('/api/clases',       require('./routes/clases.routes'));
app.use('/api/temas',        require('./routes/temas.routes'));
app.use('/api/actividades',  require('./routes/actividades.routes'));
app.use('/api/imprevistos',  require('./routes/imprevistos.routes'));
app.use('/api/evaluaciones', require('./routes/evaluaciones.routes'));
app.use('/api/documentos',   require('./routes/documentos.routes'));
app.use('/api/aprobaciones', require('./routes/aprobaciones.routes'));
app.use('/api/auditoria',    require('./routes/auditoria.routes'));
app.use('/api/reportes',     require('./routes/reportes.routes'));

// ── SPA fallback (todas las rutas del frontend) ───────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ── Manejo global de errores ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SGCA Backend escuchando en http://0.0.0.0:${PORT}`);
});

module.exports = app;
