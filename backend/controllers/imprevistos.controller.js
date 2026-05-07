const { query } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');

const listarImprevistos = async (req, res) => {
  try {
    const { clase_id } = req.params;
    const result = await query(
      'SELECT * FROM imprevistos WHERE clase_id = $1 ORDER BY fecha_creacion DESC',
      [clase_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener imprevistos' });
  }
};

const crearImprevisto = async (req, res) => {
  try {
    const { clase_id, descripcion, tipo, severidad } = req.body;
    if (!clase_id || !descripcion) {
      return res.status(400).json({ error: 'clase_id y descripcion son requeridos' });
    }

    // Verificar que la clase existe y no es inmutable
    const claseResult = await query('SELECT id, estado, docente_id FROM clases WHERE id = $1', [clase_id]);
    if (!claseResult.rows.length) return res.status(404).json({ error: 'Clase no encontrada' });

    const clase = claseResult.rows[0];
    if (clase.estado === 'INMUTABLE') {
      return res.status(403).json({ error: 'No se pueden agregar imprevistos a clases inmutables' });
    }
    if (req.user.rol === 'DOCENTE' && clase.docente_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const tiposValidos = ['TECNICO', 'CLIMATICO', 'INSTITUCIONAL', 'PERSONAL', 'OTRO'];
    const severidadesValidas = ['BAJA', 'MEDIA', 'ALTA'];

    const result = await query(
      `INSERT INTO imprevistos (clase_id, descripcion, tipo, severidad)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        clase_id,
        descripcion,
        tiposValidos.includes(tipo) ? tipo : 'OTRO',
        severidadesValidas.includes(severidad) ? severidad : 'BAJA'
      ]
    );

    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'imprevistos', accion: 'INSERT',
      registro_id: result.rows[0].id, datos_despues: result.rows[0], ip: req.ip,
      descripcion: `Imprevisto registrado en clase ${clase_id}`
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[IMPREVISTOS] crear:', err);
    res.status(500).json({ error: 'Error al crear imprevisto' });
  }
};

const resolverImprevisto = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE imprevistos SET resuelto = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Imprevisto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al resolver imprevisto' });
  }
};

const eliminarImprevisto = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM imprevistos WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Imprevisto no encontrado' });
    await registrarAuditoria({
      usuario_id: req.user.id, tabla: 'imprevistos', accion: 'DELETE',
      registro_id: id, ip: req.ip
    });
    res.json({ message: 'Imprevisto eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar imprevisto' });
  }
};

module.exports = { listarImprevistos, crearImprevisto, resolverImprevisto, eliminarImprevisto };
