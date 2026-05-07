const { query } = require('../models/db');
const bcrypt = require('bcrypt');
const { registrarAuditoria } = require('../middlewares/audit.middleware');

const listarUsuarios = async (req, res) => {
  try {
    const { rol, estado } = req.query;
    let whereClause = [];
    let params = [];
    let idx = 1;

    if (rol)    { whereClause.push(`r.nombre = $${idx++}`);  params.push(rol); }
    if (estado !== undefined) { whereClause.push(`u.estado = $${idx++}`); params.push(estado === 'true'); }

    const where = whereClause.length ? 'WHERE ' + whereClause.join(' AND ') : '';

    const result = await query(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.estado, u.fecha_creacion, u.ultimo_acceso,
              r.nombre AS rol, r.id AS rol_id
       FROM usuarios u JOIN roles r ON u.rol_id = r.id
       ${where}
       ORDER BY u.apellido, u.nombre`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[USUARIOS] listar:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT u.id, u.email, u.nombre, u.apellido, u.estado, u.fecha_creacion, u.ultimo_acceso,
              r.nombre AS rol, r.id AS rol_id, r.permisos
       FROM usuarios u JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { email, password, nombre, apellido, rol_id } = req.body;
    if (!email || !password || !nombre || !apellido || !rol_id) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const existe = await query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length) return res.status(409).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, rol_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, nombre, apellido, estado, fecha_creacion`,
      [email.toLowerCase(), hash, nombre, apellido, rol_id]
    );

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'usuarios', accion: 'INSERT',
      registro_id: result.rows[0].id, datos_despues: { email, nombre, apellido, rol_id }, ip: req.ip,
      descripcion: `Usuario creado: ${email}`
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[USUARIOS] crear:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, rol_id, estado } = req.body;

    const result = await query(
      `UPDATE usuarios
       SET nombre = COALESCE($1, nombre),
           apellido = COALESCE($2, apellido),
           rol_id = COALESCE($3, rol_id),
           estado = COALESCE($4, estado)
       WHERE id = $5
       RETURNING id, email, nombre, apellido, estado`,
      [nombre, apellido, rol_id, estado, id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'usuarios', accion: 'UPDATE',
      registro_id: id, datos_despues: req.body, ip: req.ip,
      descripcion: `Usuario editado: ${id}`
    });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al editar usuario' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_password } = req.body;
    if (!nueva_password || nueva_password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    const hash = await bcrypt.hash(nueva_password, 10);
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, id]);

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'usuarios', accion: 'UPDATE',
      registro_id: id, ip: req.ip, descripcion: `Reset de contraseña para usuario ${id}`
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
};

const listarRoles = async (req, res) => {
  try {
    const result = await query('SELECT id, nombre, descripcion FROM roles ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

module.exports = { listarUsuarios, obtenerUsuario, crearUsuario, editarUsuario, resetPassword, listarRoles };
