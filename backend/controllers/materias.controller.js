const { query } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');

const listarMaterias = async (req, res) => {
  try {
    const { curso_id, docente_id, activa } = req.query;
    const user = req.user;

    let whereClause = [];
    let params = [];
    let idx = 1;

    if (user.rol === 'DOCENTE') {
      whereClause.push(`m.docente_id = $${idx++}`);
      params.push(user.id);
    } else if (docente_id) {
      whereClause.push(`m.docente_id = $${idx++}`);
      params.push(docente_id);
    }

    if (curso_id) { whereClause.push(`m.curso_id = $${idx++}`); params.push(curso_id); }
    if (activa !== undefined && activa !== '') { whereClause.push(`m.activa = $${idx++}`); params.push(activa === 'true'); }

    const where = whereClause.length ? 'WHERE ' + whereClause.join(' AND ') : '';

    const result = await query(
      `SELECT m.id, m.nombre, m.codigo, m.horas_semanales, m.activa, m.fecha_creacion,
              cu.id AS curso_id, cu.nombre AS curso_nombre, cu.turno, cu.anio_lectivo,
              u.id AS docente_id,
              COALESCE(u.nombre || ' ' || u.apellido, 'Sin asignar') AS docente_nombre,
              u.email AS docente_email,
              (SELECT COUNT(*) FROM clases c WHERE c.materia_id = m.id)::int AS total_clases,
              (SELECT COUNT(*) FROM clases c WHERE c.materia_id = m.id AND c.estado IN ('APROBADO','INMUTABLE'))::int AS clases_aprobadas
       FROM materias m
       JOIN cursos cu ON m.curso_id = cu.id
       LEFT JOIN usuarios u ON m.docente_id = u.id
       ${where}
       ORDER BY cu.nombre, m.nombre`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[MATERIAS] listar:', err);
    res.status(500).json({ error: 'Error al obtener materias' });
  }
};

const obtenerMateria = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT m.*, cu.nombre AS curso_nombre, cu.turno, cu.anio_lectivo,
              COALESCE(u.nombre || ' ' || u.apellido, 'Sin asignar') AS docente_nombre,
              u.email AS docente_email
       FROM materias m
       JOIN cursos cu ON m.curso_id = cu.id
       LEFT JOIN usuarios u ON m.docente_id = u.id
       WHERE m.id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Materia no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener materia' });
  }
};

const crearMateria = async (req, res) => {
  try {
    const { nombre, codigo, horas_semanales, curso_id, docente_id } = req.body;
    if (!nombre || !curso_id) {
      return res.status(400).json({ error: 'nombre y curso_id son requeridos' });
    }
    const result = await query(
      `INSERT INTO materias (nombre, codigo, horas_semanales, curso_id, docente_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, codigo || null, horas_semanales || 0, curso_id, docente_id || null]
    );
    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'materias', accion: 'INSERT',
      registro_id: result.rows[0].id, datos_despues: result.rows[0], ip: req.ip,
      descripcion: `Materia creada: ${nombre}`
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[MATERIAS] crear:', err);
    res.status(500).json({ error: 'Error al crear materia' });
  }
};

const editarMateria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, horas_semanales, activa, docente_id } = req.body;

    // Build dynamic SET clause
    const sets = [];
    const vals = [];
    let pi = 1;
    if (nombre          !== undefined) { sets.push(`nombre = $${pi++}`);          vals.push(nombre); }
    if (codigo          !== undefined) { sets.push(`codigo = $${pi++}`);          vals.push(codigo || null); }
    if (horas_semanales !== undefined) { sets.push(`horas_semanales = $${pi++}`); vals.push(horas_semanales); }
    if (activa          !== undefined) { sets.push(`activa = $${pi++}`);          vals.push(activa); }
    if (docente_id      !== undefined) { sets.push(`docente_id = $${pi++}`);      vals.push(docente_id || null); }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });
    vals.push(id);

    const result = await query(
      `UPDATE materias SET ${sets.join(', ')} WHERE id = $${pi} RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Materia no encontrada' });
    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'materias', accion: 'UPDATE',
      registro_id: id, datos_despues: { nombre, codigo, horas_semanales, activa, docente_id }, ip: req.ip,
      descripcion: `Materia editada: ${id}`
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[MATERIAS] editar:', err);
    res.status(500).json({ error: 'Error al editar materia' });
  }
};

module.exports = { listarMaterias, obtenerMateria, crearMateria, editarMateria };
