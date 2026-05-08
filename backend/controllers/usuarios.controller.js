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
    if (estado !== undefined && estado !== '') {
      whereClause.push(`u.estado = $${idx++}`);
      params.push(estado === 'true');
    }

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

    const usuario = result.rows[0];

    // Si el usuario es DOCENTE, traer también sus materias asignadas
    if (usuario.rol === 'DOCENTE') {
      const materiasRes = await query(
        `SELECT dm.materia_id, m.nombre, m.nombre AS materia_nombre,
                c.nombre AS curso_nombre, c.id AS curso_id
         FROM docente_materias dm
         JOIN materias m ON dm.materia_id = m.id
         JOIN cursos c ON m.curso_id = c.id
         WHERE dm.docente_id = $1
         ORDER BY c.nombre, m.nombre`,
        [id]
      );
      usuario.materias = materiasRes.rows;
    }

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { email, password, nombre, apellido, rol_id, materia_ids } = req.body;
    if (!email || !password || !nombre || !apellido || !rol_id) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const existe = await query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length) return res.status(409).json({ error: 'El email ya está registrado' });

    // Verificar si el rol elegido es DOCENTE (y restricción de ADMINISTRADOR)
    const rolRes = await query('SELECT nombre FROM roles WHERE id = $1', [rol_id]);
    const rolNombre = rolRes.rows[0]?.nombre;

    // Solo el ADMINISTRADOR puede crear usuarios con rol ADMINISTRADOR
    if (rolNombre === 'ADMINISTRADOR' && req.user.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo el Administrador puede crear usuarios con rol Administrador' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO usuarios (email, password_hash, nombre, apellido, rol_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, nombre, apellido, estado, fecha_creacion`,
      [email.toLowerCase(), hash, nombre, apellido, rol_id]
    );

    const nuevoUsuario = result.rows[0];

    // Si es DOCENTE y se enviaron materias, asignarlas
    if (rolNombre === 'DOCENTE' && Array.isArray(materia_ids) && materia_ids.length > 0) {
      for (const materia_id of materia_ids) {
        await query(
          `INSERT INTO docente_materias (docente_id, materia_id, asignado_por)
           VALUES ($1, $2, $3)
           ON CONFLICT (docente_id, materia_id) DO NOTHING`,
          [nuevoUsuario.id, materia_id, req.user.id]
        );
        // También actualizar el docente_id en la tabla materias
        await query(
          `UPDATE materias SET docente_id = $1 WHERE id = $2`,
          [nuevoUsuario.id, materia_id]
        );
      }
    }

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'usuarios', accion: 'INSERT',
      registro_id: nuevoUsuario.id,
      datos_despues: { email, nombre, apellido, rol_id, materias: materia_ids },
      ip: req.ip,
      descripcion: `Usuario creado: ${email}`
    });

    res.status(201).json(nuevoUsuario);
  } catch (err) {
    console.error('[USUARIOS] crear:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, rol_id, estado, materia_ids } = req.body;

    // Solo el ADMINISTRADOR puede asignar rol ADMINISTRADOR — verificar ANTES de actualizar
    if (rol_id) {
      const rolCheck = await query('SELECT nombre FROM roles WHERE id = $1', [rol_id]);
      const rolNombreCheck = rolCheck.rows[0]?.nombre;
      if (rolNombreCheck === 'ADMINISTRADOR' && req.user.rol !== 'ADMINISTRADOR') {
        return res.status(403).json({ error: 'Solo el Administrador puede asignar el rol Administrador' });
      }
    }

    const result = await query(
      `UPDATE usuarios
       SET nombre   = COALESCE($1, nombre),
           apellido = COALESCE($2, apellido),
           rol_id   = COALESCE($3, rol_id),
           estado   = COALESCE($4, estado)
       WHERE id = $5
       RETURNING id, email, nombre, apellido, estado, rol_id`,
      [nombre, apellido, rol_id, estado, id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const usuarioActualizado = result.rows[0];

    // Determinar el rol final del usuario
    const rolRes = await query(
      'SELECT nombre FROM roles WHERE id = $1',
      [usuarioActualizado.rol_id]
    );
    const rolNombre = rolRes.rows[0]?.nombre;

    // Si es DOCENTE y se enviaron materia_ids, sincronizar asignaciones
    if (rolNombre === 'DOCENTE' && Array.isArray(materia_ids)) {
      // Eliminar las asignaciones antiguas
      await query('DELETE FROM docente_materias WHERE docente_id = $1', [id]);

      // Quitar docente_id de las materias que ya tenía este docente asignado
      await query(
        `UPDATE materias SET docente_id = NULL WHERE docente_id = $1`,
        [id]
      );

      if (materia_ids.length > 0) {
        // Insertar las nuevas asignaciones
        for (const materia_id of materia_ids) {
          await query(
            `INSERT INTO docente_materias (docente_id, materia_id, asignado_por)
             VALUES ($1, $2, $3)
             ON CONFLICT (docente_id, materia_id) DO NOTHING`,
            [id, materia_id, req.user.id]
          );
          // Actualizar docente en la tabla materias
          await query(
            'UPDATE materias SET docente_id = $1 WHERE id = $2',
            [id, materia_id]
          );
        }
      }
    }

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'usuarios', accion: 'UPDATE',
      registro_id: id,
      datos_despues: { nombre, apellido, rol_id, estado, materias: materia_ids },
      ip: req.ip,
      descripcion: `Usuario editado: ${id}`
    });

    res.json(usuarioActualizado);
  } catch (err) {
    console.error('[USUARIOS] editar:', err);
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

// Obtener materias asignadas a un docente
const getMateriasDocente = async (req, res) => {
  try {
    const { id } = req.params;

    // Un DOCENTE solo puede ver sus propias materias; directivo/admin pueden ver cualquiera
    if (req.user.rol === 'DOCENTE' && req.user.id !== id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await query(
      `SELECT dm.materia_id,
              m.nombre,
              m.nombre AS materia_nombre,
              c.nombre AS curso_nombre, c.id AS curso_id,
              m.codigo, m.horas_semanales
       FROM docente_materias dm
       JOIN materias m ON dm.materia_id = m.id
       JOIN cursos c ON m.curso_id = c.id
       WHERE dm.docente_id = $1
       ORDER BY c.nombre, m.nombre`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener materias del docente' });
  }
};

// Asignar materias a un docente (reemplaza la lista completa)
const asignarMaterias = async (req, res) => {
  try {
    const { id } = req.params;
    const { materia_ids } = req.body;

    if (!Array.isArray(materia_ids)) {
      return res.status(400).json({ error: 'materia_ids debe ser un array' });
    }

    // Verificar que el usuario es DOCENTE
    const usuarioRes = await query(
      'SELECT r.nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = $1',
      [id]
    );
    if (!usuarioRes.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (usuarioRes.rows[0].nombre !== 'DOCENTE') {
      return res.status(400).json({ error: 'Solo se pueden asignar materias a usuarios con rol DOCENTE' });
    }

    // Eliminar asignaciones anteriores
    await query('DELETE FROM docente_materias WHERE docente_id = $1', [id]);

    // Quitar docente_id de materias que tenía este docente
    await query('UPDATE materias SET docente_id = NULL WHERE docente_id = $1', [id]);

    // Insertar nuevas
    for (const materia_id of materia_ids) {
      await query(
        `INSERT INTO docente_materias (docente_id, materia_id, asignado_por)
         VALUES ($1, $2, $3)
         ON CONFLICT (docente_id, materia_id) DO NOTHING`,
        [id, materia_id, req.user.id]
      );
      await query('UPDATE materias SET docente_id = $1 WHERE id = $2', [id, materia_id]);
    }

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'docente_materias', accion: 'UPDATE',
      registro_id: id,
      datos_despues: { docente_id: id, materia_ids },
      ip: req.ip,
      descripcion: `Materias asignadas al docente ${id}: [${materia_ids.join(', ')}]`
    });

    res.json({ message: 'Materias asignadas correctamente', total: materia_ids.length });
  } catch (err) {
    console.error('[USUARIOS] asignarMaterias:', err);
    res.status(500).json({ error: 'Error al asignar materias' });
  }
};

module.exports = {
  listarUsuarios, obtenerUsuario, crearUsuario, editarUsuario,
  resetPassword, listarRoles, getMateriasDocente, asignarMaterias
};
