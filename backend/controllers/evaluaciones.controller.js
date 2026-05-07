const { query } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');

const listarEvaluaciones = async (req, res) => {
  try {
    const { materia_id, curso_id, fecha_desde, fecha_hasta } = req.query;
    const user = req.user;

    let whereClause = [];
    let params = [];
    let idx = 1;

    if (user.rol === 'DOCENTE') {
      whereClause.push(`e.docente_id = $${idx++}`);
      params.push(user.id);
    }
    if (materia_id) { whereClause.push(`e.materia_id = $${idx++}`); params.push(materia_id); }
    if (curso_id)   { whereClause.push(`e.curso_id = $${idx++}`);   params.push(curso_id); }
    if (fecha_desde){ whereClause.push(`e.fecha >= $${idx++}`);     params.push(fecha_desde); }
    if (fecha_hasta){ whereClause.push(`e.fecha <= $${idx++}`);     params.push(fecha_hasta); }

    const where = whereClause.length ? 'WHERE ' + whereClause.join(' AND ') : '';

    const result = await query(
      `SELECT e.*, m.nombre AS materia_nombre, cu.nombre AS curso_nombre,
              u.nombre || ' ' || u.apellido AS docente_nombre
       FROM evaluaciones e
       JOIN materias m ON e.materia_id = m.id
       JOIN cursos cu ON e.curso_id = cu.id
       JOIN usuarios u ON e.docente_id = u.id
       ${where}
       ORDER BY e.fecha DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[EVALUACIONES] listar:', err);
    res.status(500).json({ error: 'Error al obtener evaluaciones' });
  }
};

const validarFecha = async (req, res) => {
  try {
    const { fecha, materia_id } = req.query;
    if (!fecha || !materia_id) {
      return res.status(400).json({ error: 'fecha y materia_id son requeridos' });
    }

    const evalResult = await query(
      'SELECT id, nombre FROM evaluaciones WHERE materia_id = $1 AND fecha = $2 AND bloqueada = TRUE',
      [materia_id, fecha]
    );

    const claseResult = await query(
      "SELECT id FROM clases WHERE materia_id = $1 AND fecha = $2 AND estado != 'REVISION_REQUERIDA'",
      [materia_id, fecha]
    );

    res.json({
      disponible: evalResult.rows.length === 0 && claseResult.rows.length === 0,
      tiene_evaluacion_bloqueada: evalResult.rows.length > 0,
      tiene_clase: claseResult.rows.length > 0,
      evaluacion: evalResult.rows[0] || null,
      alerta: evalResult.rows.length > 0
        ? `Existe una evaluación bloqueada: ${evalResult.rows[0].nombre || 'Sin nombre'}`
        : (claseResult.rows.length > 0 ? 'Ya existe una clase registrada para esta fecha y materia' : null)
    });
  } catch (err) {
    console.error('[EVALUACIONES] validar:', err);
    res.status(500).json({ error: 'Error al validar fecha' });
  }
};

const crearEvaluacion = async (req, res) => {
  try {
    const { materia_id, curso_id, fecha, nombre, bloqueada, descripcion } = req.body;
    const docente_id = req.user.id;

    if (!materia_id || !curso_id || !fecha) {
      return res.status(400).json({ error: 'materia_id, curso_id y fecha son requeridos' });
    }

    // Verificar materia del docente
    if (req.user.rol === 'DOCENTE') {
      const check = await query('SELECT id FROM materias WHERE id = $1 AND docente_id = $2', [materia_id, docente_id]);
      if (!check.rows.length) return res.status(403).json({ error: 'Materia no asignada al docente' });
    }

    const result = await query(
      `INSERT INTO evaluaciones (materia_id, curso_id, docente_id, fecha, nombre, bloqueada, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [materia_id, curso_id, docente_id, fecha, nombre || null, bloqueada || false, descripcion || null]
    );

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'evaluaciones', accion: 'INSERT',
      registro_id: result.rows[0].id, datos_despues: result.rows[0], ip: req.ip,
      descripcion: `Evaluación creada para ${fecha}`
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[EVALUACIONES] crear:', err);
    res.status(500).json({ error: 'Error al crear evaluación' });
  }
};

const editarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, fecha, bloqueada, descripcion } = req.body;

    const result = await query(
      `UPDATE evaluaciones
       SET nombre = COALESCE($1, nombre),
           fecha = COALESCE($2, fecha),
           bloqueada = COALESCE($3, bloqueada),
           descripcion = COALESCE($4, descripcion)
       WHERE id = $5 RETURNING *`,
      [nombre, fecha, bloqueada, descripcion, id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Evaluación no encontrada' });

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'evaluaciones', accion: 'UPDATE',
      registro_id: id, datos_despues: result.rows[0], ip: req.ip
    });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al editar evaluación' });
  }
};

const eliminarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM evaluaciones WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Evaluación no encontrada' });
    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'evaluaciones', accion: 'DELETE',
      registro_id: id, ip: req.ip
    });
    res.json({ message: 'Evaluación eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar evaluación' });
  }
};

module.exports = { listarEvaluaciones, validarFecha, crearEvaluacion, editarEvaluacion, eliminarEvaluacion };
