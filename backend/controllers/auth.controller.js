const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.nombre, u.apellido, u.estado,
              r.nombre as rol, r.id as rol_id, r.permisos
       FROM usuarios u JOIN roles r ON u.rol_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!user.estado) {
      return res.status(401).json({ error: 'Usuario inactivo. Contacte al administrador.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET || 'sgca_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await registrarAuditoria({
      usuario_id: user.id,
      tabla: 'usuarios',
      accion: 'LOGIN',
      registro_id: user.id,
      ip: req.ip,
      descripcion: `Login exitoso de ${user.email}`
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        permisos: user.permisos
      }
    });
  } catch (err) {
    console.error('[AUTH] login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const me = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.estado, u.fecha_creacion, u.ultimo_acceso,
              r.nombre as rol, r.permisos
       FROM usuarios u JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;
    if (!password_actual || !password_nuevo) {
      return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    }
    if (password_nuevo.length < 8) {
      return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres' });
    }

    const result = await query('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(password_actual, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    const hash = await bcrypt.hash(password_nuevo, 10);
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    await registrarAuditoria({
      usuario_id: req.user.id,
      tabla: 'usuarios',
      accion: 'UPDATE',
      registro_id: req.user.id,
      ip: req.ip,
      descripcion: 'Cambio de contraseña'
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { login, me, cambiarPassword };
