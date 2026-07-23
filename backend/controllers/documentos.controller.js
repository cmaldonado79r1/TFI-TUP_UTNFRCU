const { query } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');
const path = require('path');
const fs = require('fs');

/* ─────────────────────────────────────────────────────────────
   Listar documentos (con estado, versión y datos de materia/curso)
───────────────────────────────────────────────────────────── */
const listarDocumentos = async (req, res) => {
  try {
    const { materia_id } = req.query;
    const user = req.user;
    let whereClause = [];
    let params = [];
    let idx = 1;

    if (materia_id) { whereClause.push(`d.materia_id = $${idx++}`); params.push(materia_id); }
    if (user.rol === 'DOCENTE') {
      whereClause.push(`d.cargado_por = $${idx++}`);
      params.push(user.id);
    }

    const where = whereClause.length ? 'WHERE ' + whereClause.join(' AND ') : '';
    const result = await query(
      `SELECT d.*,
              m.nombre AS materia_nombre,
              c.nombre AS curso_nombre,
              c.id     AS curso_id,
              u.nombre || ' ' || u.apellido AS subido_por_nombre,
              rev.nombre || ' ' || rev.apellido AS revisado_por_nombre
       FROM documentos d
       JOIN materias m ON d.materia_id = m.id
       JOIN cursos   c ON m.curso_id   = c.id
       JOIN usuarios u ON d.cargado_por = u.id
       LEFT JOIN usuarios rev ON d.revisado_por = rev.id
       ${where}
       ORDER BY m.nombre, c.nombre, d.version DESC, d.fecha_creacion DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[DOCUMENTOS] listar:', err);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
};

/* ─────────────────────────────────────────────────────────────
   Obtener versiones de un programa por materia
───────────────────────────────────────────────────────────── */
const getVersionesPorMateria = async (req, res) => {
  try {
    const { materia_id } = req.params;
    const result = await query(
      `SELECT d.*,
              u.nombre || ' ' || u.apellido AS subido_por_nombre,
              rev.nombre || ' ' || rev.apellido AS revisado_por_nombre,
              m.nombre AS materia_nombre,
              c.nombre AS curso_nombre
       FROM documentos d
       JOIN materias m ON d.materia_id = m.id
       JOIN cursos   c ON m.curso_id   = c.id
       JOIN usuarios u ON d.cargado_por = u.id
       LEFT JOIN usuarios rev ON d.revisado_por = rev.id
       WHERE d.materia_id = $1 AND d.tipo = 'PROGRAMA'
       ORDER BY d.version DESC, d.fecha_creacion DESC`,
      [materia_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[DOCUMENTOS] versiones:', err);
    res.status(500).json({ error: 'Error al obtener versiones' });
  }
};

/* ─────────────────────────────────────────────────────────────
   Subir documento (estado inicial: PENDIENTE)
───────────────────────────────────────────────────────────── */
const subirDocumento = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    const { materia_id, tipo, documento_padre_id } = req.body;
    if (!materia_id) return res.status(400).json({ error: 'materia_id es requerido' });

    const tiposValidos = ['PROGRAMA', 'PLANIFICACION', 'PROYECTO', 'EVALUACION', 'OTRO'];
    const tipoDoc = tiposValidos.includes(tipo) ? tipo : 'OTRO';

    // Calcular versión
    let version = 1;
    let padre_id = documento_padre_id || null;

    if (tipoDoc === 'PROGRAMA') {
      // Si hay padre explícito, tomar su versión + 1
      if (padre_id) {
        const padreRes = await query('SELECT version FROM documentos WHERE id = $1', [padre_id]);
        if (padreRes.rows.length) version = padreRes.rows[0].version + 1;
      } else {
        // Buscar el documento más reciente de esta materia como padre
        const ultimoRes = await query(
          `SELECT id, version FROM documentos
           WHERE materia_id = $1 AND tipo = 'PROGRAMA'
           ORDER BY version DESC LIMIT 1`,
          [materia_id]
        );
        if (ultimoRes.rows.length) {
          padre_id = ultimoRes.rows[0].id;
          version  = ultimoRes.rows[0].version + 1;
          // Marcar anterior como no vigente
          await query('UPDATE documentos SET es_vigente = FALSE WHERE materia_id = $1 AND tipo = $2', [materia_id, 'PROGRAMA']);
        }
      }
    }

    const result = await query(
      `INSERT INTO documentos
         (materia_id, tipo, nombre_archivo, nombre_original, ruta, tamanio_bytes,
          cargado_por, estado, version, documento_padre_id, es_vigente)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDIENTE',$8,$9,TRUE)
       RETURNING *`,
      [
        materia_id, tipoDoc,
        req.file.filename, req.file.originalname,
        req.file.path, req.file.size,
        req.user.id, version, padre_id
      ]
    );

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'documentos', accion: 'INSERT',
      registro_id: result.rows[0].id, datos_despues: result.rows[0], ip: req.ip,
      descripcion: `Documento subido: ${req.file.originalname} (v${version})`
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[DOCUMENTOS] subir:', err);
    res.status(500).json({ error: 'Error al subir documento' });
  }
};

/* ─────────────────────────────────────────────────────────────
   Revisar documento: APROBADO o REVISION_REQUERIDA
   Solo DIRECTIVO / ASESOR_PEDAGOGICO / ADMINISTRADOR
───────────────────────────────────────────────────────────── */
const revisarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, comentario } = req.body;

    const rolesPermitidos = ['DIRECTIVO', 'ASESOR_PEDAGOGICO', 'ADMINISTRADOR'];
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para revisar documentos' });
    }

    const estados_validos = ['APROBADO', 'REVISION_REQUERIDA'];
    if (!estados_validos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Use APROBADO o REVISION_REQUERIDA' });
    }
    if (estado === 'REVISION_REQUERIDA' && !comentario?.trim()) {
      return res.status(400).json({ error: 'El comentario es obligatorio al solicitar revisión' });
    }

    const docRes = await query('SELECT * FROM documentos WHERE id = $1', [id]);
    if (!docRes.rows.length) return res.status(404).json({ error: 'Documento no encontrado' });
    const doc = docRes.rows[0];

    if (doc.estado === 'APROBADO') {
      return res.status(409).json({ error: 'El documento ya está aprobado e inmutable' });
    }

    const nuevoEstado = estado === 'APROBADO' ? 'APROBADO' : 'REVISION_REQUERIDA';

    await query(
      `UPDATE documentos
       SET estado = $1::estado_documento,
           comentario_revision = $2,
           revisado_por = $3,
           fecha_revision = NOW()
       WHERE id = $4`,
      [nuevoEstado, comentario || null, req.user.id, id]
    );

    // Registrar en historial de revisiones
    const estadoAprobacion = estado === 'APROBADO' ? 'APROBADO' : 'RECHAZADO';
    await query(
      `INSERT INTO revisiones_documento (documento_id, revisor_id, estado, comentario)
       VALUES ($1, $2, $3, $4)`,
      [id, req.user.id, estadoAprobacion, comentario || null]
    );

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'documentos', accion: 'UPDATE',
      registro_id: id,
      datos_despues: { estado: nuevoEstado, comentario },
      ip: req.ip,
      descripcion: `Documento ${id} marcado como ${nuevoEstado}`
    });

    res.json({ message: `Documento ${nuevoEstado === 'APROBADO' ? 'aprobado' : 'enviado a revisión'}`, estado: nuevoEstado });
  } catch (err) {
    console.error('[DOCUMENTOS] revisar:', err);
    res.status(500).json({ error: 'Error al revisar documento' });
  }
};

/* ─────────────────────────────────────────────────────────────
   Obtener historial de revisiones de un documento
───────────────────────────────────────────────────────────── */
const getHistorialRevisiones = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT r.*, u.nombre || ' ' || u.apellido AS revisor_nombre
       FROM revisiones_documento r
       JOIN usuarios u ON r.revisor_id = u.id
       WHERE r.documento_id = $1
       ORDER BY r.fecha DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

/* ─────────────────────────────────────────────────────────────
   Eliminar documento (solo si no está APROBADO)
───────────────────────────────────────────────────────────── */
const eliminarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM documentos WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Documento no encontrado' });

    const doc = result.rows[0];
    if (doc.estado === 'APROBADO') {
      return res.status(409).json({ error: 'Un documento aprobado es inmutable y no puede eliminarse' });
    }
    if (req.user.rol === 'DOCENTE' && doc.cargado_por !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    try { if (fs.existsSync(doc.ruta)) fs.unlinkSync(doc.ruta); } catch (e) {}
    await query('DELETE FROM documentos WHERE id = $1', [id]);

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'documentos', accion: 'DELETE',
      registro_id: id, ip: req.ip, descripcion: `Documento eliminado: ${doc.nombre_original}`
    });

    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
};

/* ─────────────────────────────────────────────────────────────
   Descargar documento
───────────────────────────────────────────────────────────── */
const descargarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM documentos WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Documento no encontrado' });
    const doc = result.rows[0];
    res.download(doc.ruta, doc.nombre_original);
  } catch (err) {
    res.status(500).json({ error: 'Error al descargar documento' });
  }
};

module.exports = {
  listarDocumentos,
  getVersionesPorMateria,
  subirDocumento,
  revisarDocumento,
  getHistorialRevisiones,
  eliminarDocumento,
  descargarDocumento
};
