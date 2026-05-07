const { query, getClient } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');
const { emailClaseAprobada, emailClaseRechazada } = require('../utils/email');

const aprobarClase = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { clase_id, estado, comentarios } = req.body;

    if (!clase_id || !estado) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'clase_id y estado son requeridos' });
    }
    if (!['APROBADO', 'RECHAZADO'].includes(estado)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'estado debe ser APROBADO o RECHAZADO' });
    }

    const claseResult = await client.query(
      `SELECT c.*, m.nombre AS materia_nombre, u.email AS docente_email, u.nombre AS docente_nombre, u.apellido AS docente_apellido
       FROM clases c
       JOIN materias m ON c.materia_id = m.id
       JOIN usuarios u ON c.docente_id = u.id
       WHERE c.id = $1`,
      [clase_id]
    );

    if (!claseResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    const clase = claseResult.rows[0];

    if (clase.estado !== 'PENDIENTE') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `La clase está en estado ${clase.estado} y no puede ser revisada` });
    }

    // Insertar aprobación
    await client.query(
      `INSERT INTO aprobaciones (clase_id, aprobador_id, estado, comentarios)
       VALUES ($1, $2, $3, $4)`,
      [clase_id, req.user.id, estado, comentarios || null]
    );

    // Actualizar estado de la clase
    let nuevoEstado;
    if (estado === 'APROBADO') {
      nuevoEstado = 'INMUTABLE';
      await client.query(
        `UPDATE clases SET estado = 'INMUTABLE', aprobador_id = $1, fecha_actualizacion = NOW() WHERE id = $2`,
        [req.user.id, clase_id]
      );
    } else {
      nuevoEstado = 'REVISION_REQUERIDA';
      await client.query(
        `UPDATE clases SET estado = 'REVISION_REQUERIDA', aprobador_id = $1, fecha_actualizacion = NOW() WHERE id = $2`,
        [req.user.id, clase_id]
      );
    }

    await client.query('COMMIT');

    // Registrar auditoría
    await registrarAuditoria({
      usuario_id: req.user.id,
      tabla: 'clases',
      accion: 'UPDATE',
      registro_id: clase_id,
      datos_anteriores: { estado: clase.estado },
      datos_despues: { estado: nuevoEstado, comentarios },
      ip: req.ip,
      descripcion: `Clase ${estado === 'APROBADO' ? 'aprobada' : 'rechazada'} por ${req.user.nombre} ${req.user.apellido}`
    });

    // Notificar al docente
    const fechaStr = new Date(clase.fecha).toLocaleDateString('es-AR');
    if (estado === 'APROBADO') {
      emailClaseAprobada({
        docente_email: clase.docente_email,
        docente_nombre: clase.docente_nombre + ' ' + clase.docente_apellido,
        materia: clase.materia_nombre,
        fecha: fechaStr,
        comentarios
      });
    } else {
      emailClaseRechazada({
        docente_email: clase.docente_email,
        docente_nombre: clase.docente_nombre + ' ' + clase.docente_apellido,
        materia: clase.materia_nombre,
        fecha: fechaStr,
        comentarios
      });
    }

    res.json({
      message: estado === 'APROBADO' ? 'Clase aprobada e inmutabilizada correctamente' : 'Clase devuelta para revisión',
      estado: nuevoEstado
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[APROBACIONES]', err);
    res.status(500).json({ error: 'Error al procesar la aprobación' });
  } finally {
    client.release();
  }
};

const listarPendientes = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.fecha, c.numero_clase, c.caracter, c.estado, c.fecha_creacion,
              m.nombre AS materia_nombre, m.codigo AS materia_codigo,
              cu.nombre AS curso_nombre, cu.turno,
              u.nombre || ' ' || u.apellido AS docente_nombre, u.email AS docente_email,
              (SELECT COUNT(*) FROM temas t WHERE t.clase_id = c.id)::int AS total_temas,
              (SELECT COUNT(*) FROM actividades a WHERE a.clase_id = c.id)::int AS total_actividades
       FROM clases c
       JOIN materias m ON c.materia_id = m.id
       JOIN cursos cu ON m.curso_id = cu.id
       JOIN usuarios u ON c.docente_id = u.id
       WHERE c.estado = 'PENDIENTE'
       ORDER BY c.fecha_creacion ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[APROBACIONES] pendientes:', err);
    res.status(500).json({ error: 'Error al listar pendientes' });
  }
};

const historialAprobaciones = async (req, res) => {
  try {
    const { clase_id } = req.params;
    const result = await query(
      `SELECT ap.*, u.nombre || ' ' || u.apellido AS aprobador_nombre, u.email AS aprobador_email
       FROM aprobaciones ap
       JOIN usuarios u ON ap.aprobador_id = u.id
       WHERE ap.clase_id = $1
       ORDER BY ap.fecha_revision DESC`,
      [clase_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

module.exports = { aprobarClase, listarPendientes, historialAprobaciones };
