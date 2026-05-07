const { query } = require('../models/db');

const listarAuditoria = async (req, res) => {
  try {
    const { usuario_id, tabla, accion, fecha_desde, fecha_hasta, page = 1, limit = 50 } = req.query;

    let whereClause = [];
    let params = [];
    let idx = 1;

    if (usuario_id) { whereClause.push(`a.usuario_id = $${idx++}`); params.push(usuario_id); }
    if (tabla)      { whereClause.push(`a.tabla_afectada = $${idx++}`); params.push(tabla); }
    if (accion)     { whereClause.push(`a.accion = $${idx++}`); params.push(accion); }
    if (fecha_desde){ whereClause.push(`a.timestamp >= $${idx++}`); params.push(fecha_desde); }
    if (fecha_hasta){ whereClause.push(`a.timestamp <= $${idx++}`); params.push(fecha_hasta + ' 23:59:59'); }

    const where = whereClause.length ? 'WHERE ' + whereClause.join(' AND ') : '';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    params.push(offset);

    const [result, countResult] = await Promise.all([
      query(
        `SELECT a.id, a.tabla_afectada, a.accion, a.registro_id,
                a.datos_anteriores, a.datos_despues, a.timestamp, a.ip_origen, a.descripcion,
                u.nombre || ' ' || u.apellido AS usuario_nombre, u.email AS usuario_email
         FROM auditoria a
         LEFT JOIN usuarios u ON a.usuario_id = u.id
         ${where}
         ORDER BY a.timestamp DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        params
      ),
      query(`SELECT COUNT(*)::int AS total FROM auditoria a ${where}`, params.slice(0, -2))
    ]);

    res.json({
      data: result.rows,
      total: countResult.rows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countResult.rows[0].total / parseInt(limit))
    });
  } catch (err) {
    console.error('[AUDITORIA] listar:', err);
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
};

const obtenerRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, u.nombre || ' ' || u.apellido AS usuario_nombre, u.email AS usuario_email
       FROM auditoria a LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener registro de auditoría' });
  }
};

module.exports = { listarAuditoria, obtenerRegistro };
