const { query, getClient } = require('../models/db');
const { registrarAuditoria } = require('../middlewares/audit.middleware');
const { emailClasePendiente } = require('../utils/email');

const listarClases = async (req, res) => {
  try {
    const { materia_id, estado, fecha_desde, fecha_hasta, docente_id } = req.query;
    const user = req.user;

    let whereClause = [];
    let params = [];
    let idx = 1;

    // Docente solo ve sus propias clases
    if (user.rol === 'DOCENTE') {
      whereClause.push(`c.docente_id = $${idx++}`);
      params.push(user.id);
    } else if (docente_id) {
      whereClause.push(`c.docente_id = $${idx++}`);
      params.push(docente_id);
    }

    if (materia_id) { whereClause.push(`c.materia_id = $${idx++}`); params.push(materia_id); }
    if (estado)     { whereClause.push(`c.estado = $${idx++}`);     params.push(estado); }
    if (fecha_desde){ whereClause.push(`c.fecha >= $${idx++}`);     params.push(fecha_desde); }
    if (fecha_hasta){ whereClause.push(`c.fecha <= $${idx++}`);     params.push(fecha_hasta); }

    const where = whereClause.length ? 'WHERE ' + whereClause.join(' AND ') : '';

    const result = await query(
      `SELECT c.id, c.fecha, c.numero_clase, c.caracter, c.estado, c.observaciones,
              c.fecha_creacion, c.fecha_actualizacion,
              m.nombre AS materia_nombre, m.codigo AS materia_codigo,
              cu.nombre AS curso_nombre, cu.turno AS curso_turno,
              u.nombre || ' ' || u.apellido AS docente_nombre,
              ap.nombre || ' ' || ap.apellido AS aprobador_nombre,
              (SELECT COUNT(*) FROM temas t WHERE t.clase_id = c.id)::int AS total_temas,
              (SELECT COUNT(*) FROM actividades a WHERE a.clase_id = c.id)::int AS total_actividades,
              (SELECT COUNT(*) FROM imprevistos i WHERE i.clase_id = c.id)::int AS total_imprevistos
       FROM clases c
       JOIN materias m ON c.materia_id = m.id
       JOIN cursos cu ON m.curso_id = cu.id
       JOIN usuarios u ON c.docente_id = u.id
       LEFT JOIN usuarios ap ON c.aprobador_id = ap.id
       ${where}
       ORDER BY c.fecha DESC, c.fecha_creacion DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[CLASES] listar:', err);
    res.status(500).json({ error: 'Error al obtener clases' });
  }
};

const obtenerClase = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const result = await query(
      `SELECT c.*, m.nombre AS materia_nombre, m.codigo AS materia_codigo,
              cu.nombre AS curso_nombre, cu.turno,
              u.nombre || ' ' || u.apellido AS docente_nombre, u.email AS docente_email,
              ap.nombre || ' ' || ap.apellido AS aprobador_nombre
       FROM clases c
       JOIN materias m ON c.materia_id = m.id
       JOIN cursos cu ON m.curso_id = cu.id
       JOIN usuarios u ON c.docente_id = u.id
       LEFT JOIN usuarios ap ON c.aprobador_id = ap.id
       WHERE c.id = $1`,
      [id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Clase no encontrada' });

    const clase = result.rows[0];

    // Docente solo puede ver sus propias clases
    if (user.rol === 'DOCENTE' && clase.docente_id !== user.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Obtener temas, actividades, imprevistos y aprobaciones
    const [temas, actividades, imprevistos, aprobaciones] = await Promise.all([
      query('SELECT * FROM temas WHERE clase_id = $1 ORDER BY orden', [id]),
      query('SELECT * FROM actividades WHERE clase_id = $1', [id]),
      query('SELECT * FROM imprevistos WHERE clase_id = $1 ORDER BY fecha_creacion DESC', [id]),
      query(
        `SELECT ap.*, u.nombre || ' ' || u.apellido AS aprobador_nombre
         FROM aprobaciones ap JOIN usuarios u ON ap.aprobador_id = u.id
         WHERE ap.clase_id = $1 ORDER BY ap.fecha_revision DESC`,
        [id]
      )
    ]);

    res.json({
      ...clase,
      temas: temas.rows,
      actividades: actividades.rows,
      imprevistos: imprevistos.rows,
      aprobaciones: aprobaciones.rows
    });
  } catch (err) {
    console.error('[CLASES] obtener:', err);
    res.status(500).json({ error: 'Error al obtener clase' });
  }
};

const crearClase = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { materia_id, fecha, caracter, observaciones, temas = [], actividades = [] } = req.body;
    const docente_id = req.user.id;

    if (!materia_id || !fecha) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'materia_id y fecha son requeridos' });
    }
    if (!temas.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Debe incluir al menos un tema' });
    }

    // Verificar que la materia pertenece al docente
    const materiaCheck = await client.query(
      'SELECT id, nombre, curso_id FROM materias WHERE id = $1 AND docente_id = $2 AND activa = TRUE',
      [materia_id, docente_id]
    );
    if (!materiaCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Materia no encontrada o no asignada al docente' });
    }

    // Verificar que no exista otra clase para la misma materia en la misma fecha
    const dupCheck = await client.query(
      'SELECT id FROM clases WHERE materia_id = $1 AND fecha = $2 AND estado != $3',
      [materia_id, fecha, 'REVISION_REQUERIDA']
    );
    if (dupCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya existe una clase para esta materia en la fecha indicada' });
    }

    // Verificar evaluación bloqueada
    const evalCheck = await client.query(
      'SELECT id FROM evaluaciones WHERE materia_id = $1 AND fecha = $2 AND bloqueada = TRUE',
      [materia_id, fecha]
    );
    if (evalCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La fecha está bloqueada por una evaluación programada' });
    }

    // Obtener número de clase
    const numClase = await client.query(
      'SELECT COUNT(*) as total FROM clases WHERE materia_id = $1',
      [materia_id]
    );
    const numero_clase = parseInt(numClase.rows[0].total) + 1;

    // Insertar clase con estado CREADO
    const claseResult = await client.query(
      `INSERT INTO clases (materia_id, docente_id, fecha, numero_clase, caracter, estado, observaciones)
       VALUES ($1, $2, $3, $4, $5, 'CREADO', $6)
       RETURNING *`,
      [materia_id, docente_id, fecha, numero_clase, caracter || 'TEÓRICA', observaciones || null]
    );
    const clase = claseResult.rows[0];

    // Insertar temas
    for (let i = 0; i < temas.length; i++) {
      const t = temas[i];
      await client.query(
        'INSERT INTO temas (clase_id, nombre, descripcion, orden) VALUES ($1, $2, $3, $4)',
        [clase.id, t.nombre, t.descripcion || null, i + 1]
      );
    }

    // Insertar actividades
    for (const a of actividades) {
      await client.query(
        'INSERT INTO actividades (clase_id, nombre, tipo, descripcion) VALUES ($1, $2, $3, $4)',
        [clase.id, a.nombre, a.tipo || 'PRÁCTICA', a.descripcion || null]
      );
    }

    // Cambiar estado a PENDIENTE
    await client.query(
      "UPDATE clases SET estado = 'PENDIENTE' WHERE id = $1",
      [clase.id]
    );

    await client.query('COMMIT');

    // Registrar auditoría
    await registrarAuditoria({
      usuario_id: docente_id,
      tabla: 'clases',
      accion: 'INSERT',
      registro_id: clase.id,
      datos_despues: { ...clase, temas, actividades },
      ip: req.ip,
      descripcion: `Docente creó clase ${clase.id} – materia ${materiaCheck.rows[0].nombre}`
    });

    // Notificar a directivos por email
    const directivos = await query(
      `SELECT u.email FROM usuarios u JOIN roles r ON u.rol_id = r.id
       WHERE r.nombre IN ('DIRECTIVO','ASESOR_PEDAGOGICO') AND u.estado = TRUE`
    );
    const cursoInfo = await query('SELECT nombre FROM cursos WHERE id = $1', [materiaCheck.rows[0].curso_id]);
    const emailsDirectivos = directivos.rows.map(d => d.email).join(', ');
    if (emailsDirectivos) {
      emailClasePendiente({
        docente: req.user.nombre + ' ' + req.user.apellido,
        materia: materiaCheck.rows[0].nombre,
        curso: cursoInfo.rows[0]?.nombre || '',
        fecha,
        claseId: clase.id,
        directivos: emailsDirectivos
      });
    }

    res.status(201).json({ message: 'Clase creada y enviada para revisión', id: clase.id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CLASES] crear:', err);
    res.status(500).json({ error: 'Error al crear la clase' });
  } finally {
    client.release();
  }
};

const editarClase = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { caracter, observaciones, temas = [], actividades = [] } = req.body;
    const user = req.user;

    const claseResult = await client.query('SELECT * FROM clases WHERE id = $1', [id]);
    if (!claseResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    const clase = claseResult.rows[0];

    if (user.rol === 'DOCENTE' && clase.docente_id !== user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (clase.estado === 'INMUTABLE' || clase.estado === 'APROBADO') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'La clase está aprobada/inmutable y no puede editarse' });
    }

    if (user.rol === 'DOCENTE' && clase.estado !== 'REVISION_REQUERIDA') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo se pueden editar clases en estado REVISION_REQUERIDA' });
    }

    await client.query(
      `UPDATE clases SET caracter = $1, observaciones = $2, fecha_actualizacion = NOW() WHERE id = $3`,
      [caracter || clase.caracter, observaciones || clase.observaciones, id]
    );

    // Reemplazar temas y actividades
    if (temas.length) {
      await client.query('DELETE FROM temas WHERE clase_id = $1', [id]);
      for (let i = 0; i < temas.length; i++) {
        const t = temas[i];
        await client.query(
          'INSERT INTO temas (clase_id, nombre, descripcion, orden) VALUES ($1, $2, $3, $4)',
          [id, t.nombre, t.descripcion || null, i + 1]
        );
      }
    }
    if (actividades.length !== undefined) {
      await client.query('DELETE FROM actividades WHERE clase_id = $1', [id]);
      for (const a of actividades) {
        await client.query(
          'INSERT INTO actividades (clase_id, nombre, tipo, descripcion) VALUES ($1, $2, $3, $4)',
          [id, a.nombre, a.tipo || 'PRÁCTICA', a.descripcion || null]
        );
      }
    }

    // Si estaba en REVISION_REQUERIDA y es docente → volver a PENDIENTE
    if (user.rol === 'DOCENTE' && clase.estado === 'REVISION_REQUERIDA') {
      await client.query("UPDATE clases SET estado = 'PENDIENTE' WHERE id = $1", [id]);

      // Notificar a directivos
      const directivos = await query(
        `SELECT u.email FROM usuarios u JOIN roles r ON u.rol_id = r.id
         WHERE r.nombre IN ('DIRECTIVO','ASESOR_PEDAGOGICO') AND u.estado = TRUE`
      );
      const matInfo = await query('SELECT m.nombre, cu.nombre as curso FROM materias m JOIN cursos cu ON m.curso_id=cu.id WHERE m.id = $1', [clase.materia_id]);
      const emailsDirectivos = directivos.rows.map(d => d.email).join(', ');
      if (emailsDirectivos && matInfo.rows.length) {
        emailClasePendiente({
          docente: user.nombre + ' ' + user.apellido,
          materia: matInfo.rows[0].nombre,
          curso: matInfo.rows[0].curso,
          fecha: clase.fecha,
          claseId: id,
          directivos: emailsDirectivos
        });
      }
    }

    await client.query('COMMIT');

    await registrarAuditoria({
      usuario_id: user.id,
      tabla: 'clases',
      accion: 'UPDATE',
      registro_id: id,
      datos_anteriores: clase,
      ip: req.ip,
      descripcion: `Clase ${id} editada y reenviada`
    });

    res.json({ message: 'Clase actualizada correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CLASES] editar:', err);
    res.status(500).json({ error: 'Error al editar la clase' });
  } finally {
    client.release();
  }
};

const estadisticas = async (req, res) => {
  try {
    const user = req.user;
    let whereDocente = user.rol === 'DOCENTE' ? `AND c.docente_id = '${user.id}'` : '';

    const result = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE estado = 'PENDIENTE')::int AS pendientes,
         COUNT(*) FILTER (WHERE estado = 'APROBADO' OR estado = 'INMUTABLE')::int AS aprobadas,
         COUNT(*) FILTER (WHERE estado = 'REVISION_REQUERIDA')::int AS revision,
         COUNT(*) FILTER (WHERE estado = 'CREADO')::int AS creadas
       FROM clases c WHERE 1=1 ${whereDocente}`
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

const eliminarClase = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const user = req.user;

    // Solo DOCENTE puede eliminar
    if (user.rol !== 'DOCENTE') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el docente puede eliminar clases' });
    }

    const result = await client.query('SELECT * FROM clases WHERE id = $1', [id]);
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    const clase = result.rows[0];

    // Solo puede eliminar sus propias clases
    if (clase.docente_id !== user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No autorizado: la clase pertenece a otro docente' });
    }

    // Solo se puede eliminar si está en estado CREADO o PENDIENTE
    if (!['CREADO', 'PENDIENTE'].includes(clase.estado)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `No se puede eliminar una clase en estado "${clase.estado}". Solo es posible eliminar clases en estado Creado o Pendiente.`
      });
    }

    // Eliminar registros dependientes en cascada (temas, actividades, imprevistos)
    await client.query('DELETE FROM temas       WHERE clase_id = $1', [id]);
    await client.query('DELETE FROM actividades WHERE clase_id = $1', [id]);
    await client.query('DELETE FROM imprevistos WHERE clase_id = $1', [id]);
    await client.query('DELETE FROM clases      WHERE id = $1',       [id]);

    await client.query('COMMIT');

    await registrarAuditoria({
      usuario_id: user.id,
      tabla: 'clases',
      accion: 'DELETE',
      registro_id: id,
      datos_anteriores: clase,
      ip: req.ip,
      descripcion: `Docente eliminó clase ${id}`
    });

    res.json({ message: 'Clase eliminada correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CLASES] eliminar:', err);
    res.status(500).json({ error: 'Error al eliminar la clase' });
  } finally {
    client.release();
  }
};

module.exports = { listarClases, obtenerClase, crearClase, editarClase, eliminarClase, estadisticas };
