const { query } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');
const path = require('path');
const fs = require('fs');

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
      `SELECT d.*, m.nombre AS materia_nombre, u.nombre || ' ' || u.apellido AS subido_por_nombre
       FROM documentos d
       JOIN materias m ON d.materia_id = m.id
       JOIN usuarios u ON d.cargado_por = u.id
       ${where}
       ORDER BY d.fecha_creacion DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[DOCUMENTOS] listar:', err);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
};

const subirDocumento = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    const { materia_id, tipo } = req.body;
    if (!materia_id) return res.status(400).json({ error: 'materia_id es requerido' });

    const tiposValidos = ['PROGRAMA', 'PLANIFICACION', 'PROYECTO', 'EVALUACION', 'OTRO'];
    const tipoDoc = tiposValidos.includes(tipo) ? tipo : 'OTRO';

    const result = await query(
      `INSERT INTO documentos (materia_id, tipo, nombre_archivo, nombre_original, ruta, tamanio_bytes, cargado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        materia_id,
        tipoDoc,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.user.id
      ]
    );

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'documentos', accion: 'INSERT',
      registro_id: result.rows[0].id, datos_despues: result.rows[0], ip: req.ip,
      descripcion: `Documento subido: ${req.file.originalname}`
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[DOCUMENTOS] subir:', err);
    res.status(500).json({ error: 'Error al subir documento' });
  }
};

const eliminarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM documentos WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Documento no encontrado' });

    const doc = result.rows[0];
    if (req.user.rol === 'DOCENTE' && doc.cargado_por !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Eliminar archivo físico
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

module.exports = { listarDocumentos, subirDocumento, eliminarDocumento, descargarDocumento };
