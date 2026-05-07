const jwt = require('jsonwebtoken');
const { query } = require('../models/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario sigue activo
    const result = await query(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.estado, r.nombre as rol
       FROM usuarios u JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (!result.rows.length || !result.rows[0].estado) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const requireRol = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
    }
    next();
  };
};

const requireDirectivoOAsesor = requireRol('DIRECTIVO', 'ASESOR_PEDAGOGICO', 'ADMINISTRADOR');
const requireDocente           = requireRol('DOCENTE', 'DIRECTIVO', 'ASESOR_PEDAGOGICO', 'ADMINISTRADOR');
const requireDirectivo         = requireRol('DIRECTIVO', 'ADMINISTRADOR');
const requireAdministrador     = requireRol('ADMINISTRADOR');

module.exports = { verifyToken, requireRol, requireDirectivoOAsesor, requireDocente, requireDirectivo, requireAdministrador };
