const { query } = require('../models/db');

const registrarAuditoria = async ({ usuario_id, tabla, accion, registro_id, datos_anteriores, datos_despues, ip, descripcion }) => {
  try {
    await query(
      `INSERT INTO auditoria (usuario_id, tabla_afectada, accion, registro_id, datos_anteriores, datos_despues, ip_origen, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        usuario_id || null,
        tabla || null,
        accion,
        registro_id || null,
        datos_anteriores ? JSON.stringify(datos_anteriores) : null,
        datos_despues ? JSON.stringify(datos_despues) : null,
        ip || null,
        descripcion || null
      ]
    );
  } catch (err) {
    console.error('[AUDIT ERROR]', err.message);
  }
};

module.exports = { registrarAuditoria };
