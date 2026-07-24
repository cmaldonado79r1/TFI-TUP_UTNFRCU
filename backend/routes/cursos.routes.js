const router = require('express').Router();
const { query, getClient } = require('../models/db');
const { verifyToken, requireDirectivo } = require('../middlewares/auth.middleware');

/* Normaliza turno a Title Case para consistencia */
const normalizarTurno = (t) => t
  ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  : t;

/* GET / — lista cursos
   - ADMIN ve todos (activos e inactivos)
   - El resto solo ve activos */
router.get('/', verifyToken, async (req, res) => {
  try {
    const esAdmin = ['ADMINISTRADOR', 'DIRECTIVO'].includes(req.user?.rol);
    const whereClause = esAdmin ? '' : 'WHERE activo = TRUE';
    const result = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM materias m WHERE m.curso_id = c.id)::int AS total_materias
       FROM cursos c
       ${whereClause}
       ORDER BY c.nivel, c.nombre`
    );
    res.json(result.rows);
  } catch(err) {
    console.error('[CURSOS GET]', err);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

/* GET /:id */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM cursos WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al obtener curso' }); }
});

/* POST / — crear curso con validación de duplicados */
router.post('/', verifyToken, requireDirectivo, async (req, res) => {
  try {
    const { nombre, nivel, turno, anio_lectivo } = req.body;
    if (!nombre || !nivel || !turno || !anio_lectivo)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });

    const turnoNorm = normalizarTurno(turno);

    // Validar duplicado: mismo nombre + turno + año lectivo
    const dup = await query(
      `SELECT id FROM cursos
       WHERE LOWER(nombre) = LOWER($1) AND LOWER(turno) = LOWER($2) AND anio_lectivo = $3`,
      [nombre, turnoNorm, anio_lectivo]
    );
    if (dup.rows.length) {
      return res.status(409).json({
        error: `Ya existe un curso "${nombre}" en turno ${turnoNorm} para el año ${anio_lectivo}`
      });
    }

    const result = await query(
      'INSERT INTO cursos (nombre, nivel, turno, anio_lectivo) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, nivel, turnoNorm, anio_lectivo]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) {
    console.error('[CURSOS POST]', err);
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

/* PUT /:id — editar curso con validación de duplicados y aviso de materias al desactivar */
router.put('/:id', verifyToken, requireDirectivo, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { nombre, nivel, turno, anio_lectivo, activo } = req.body;
    const id = req.params.id;

    const turnoNorm = turno ? normalizarTurno(turno) : null;

    // Obtener curso actual
    const cursoActual = await client.query('SELECT * FROM cursos WHERE id = $1', [id]);
    if (!cursoActual.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    const actual = cursoActual.rows[0];

    // Validar duplicado si cambió nombre/turno/año
    const nombreCheck  = nombre      || actual.nombre;
    const turnoCheck   = turnoNorm   || actual.turno;
    const anioCheck    = anio_lectivo || actual.anio_lectivo;

    const dup = await client.query(
      `SELECT id FROM cursos
       WHERE LOWER(nombre) = LOWER($1) AND LOWER(turno) = LOWER($2)
         AND anio_lectivo = $3 AND id <> $4`,
      [nombreCheck, turnoCheck, anioCheck, id]
    );
    if (dup.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Ya existe un curso "${nombreCheck}" en turno ${turnoCheck} para el año ${anioCheck}`
      });
    }

    // Si se está desactivando, verificar materias asociadas
    if (activo === false && actual.activo === true) {
      const materias = await client.query(
        'SELECT COUNT(*)::int AS total FROM materias WHERE curso_id = $1',
        [id]
      );
      const total = materias.rows[0].total;
      if (total > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `El curso tiene ${total} materia${total > 1 ? 's' : ''} asociada${total > 1 ? 's' : ''}. Reasigná o eliminá las materias antes de desactivarlo.`,
          total_materias: total
        });
      }
    }

    // Actualizar
    const result = await client.query(
      `UPDATE cursos
       SET nombre       = COALESCE($1, nombre),
           nivel        = COALESCE($2, nivel),
           turno        = COALESCE($3, turno),
           anio_lectivo = COALESCE($4, anio_lectivo),
           activo       = COALESCE($5, activo)
       WHERE id = $6 RETURNING *`,
      [nombre, nivel, turnoNorm, anio_lectivo, activo, id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('[CURSOS PUT]', err);
    res.status(500).json({ error: 'Error al editar curso' });
  } finally {
    client.release();
  }
});

module.exports = router;
