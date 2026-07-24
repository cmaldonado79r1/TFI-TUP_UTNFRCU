const router   = require('express').Router();
const { query, getClient } = require('../models/db');
const { verifyToken, requireDirectivo } = require('../middlewares/auth.middleware');

/* ── Normalizar turno a Title Case ───────────────────────── */
const normalizeTurno = (t) =>
  t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;

/* ── GET / — devuelve TODOS los cursos (activos e inactivos) ─
   El frontend decide qué mostrar según el toggle de estado.   */
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM cursos ORDER BY activo DESC, nivel, nombre'
    );
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

/* ── GET /:id ─────────────────────────────────────────────── */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM cursos WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(result.rows[0]);
  } catch(err) {
    res.status(500).json({ error: 'Error al obtener curso' });
  }
});

/* ── POST / — crear curso con validación de duplicado ─────── */
router.post('/', verifyToken, requireDirectivo, async (req, res) => {
  try {
    const { nombre, nivel, turno, anio_lectivo } = req.body;
    if (!nombre || !nivel || !turno || !anio_lectivo)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });

    const turnoNorm = normalizeTurno(turno);

    // Verificar duplicado: mismo nombre + año lectivo + turno
    const dup = await query(
      `SELECT id FROM cursos
       WHERE LOWER(nombre) = LOWER($1) AND anio_lectivo = $2 AND LOWER(turno) = LOWER($3)`,
      [nombre, anio_lectivo, turnoNorm]
    );
    if (dup.rows.length) {
      return res.status(409).json({
        error: `Ya existe un curso "${nombre}" en el turno ${turnoNorm} para el año ${anio_lectivo}`
      });
    }

    const result = await query(
      'INSERT INTO cursos (nombre, nivel, turno, anio_lectivo) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, nivel, turnoNorm, anio_lectivo]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un curso con esos datos' });
    }
    res.status(500).json({ error: 'Error al crear curso' });
  }
});

/* ── PUT /:id — editar curso; valida desactivación con materias */
router.put('/:id', verifyToken, requireDirectivo, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { nombre, nivel, turno, anio_lectivo, activo } = req.body;
    const { id } = req.params;

    // Verificar que el curso exista
    const cursoRes = await client.query('SELECT * FROM cursos WHERE id = $1', [id]);
    if (!cursoRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar duplicado al renombrar
    if (nombre || anio_lectivo || turno) {
      const actual = cursoRes.rows[0];
      const dupCheck = await client.query(
        `SELECT id FROM cursos
         WHERE LOWER(nombre) = LOWER($1)
           AND anio_lectivo = $2
           AND LOWER(turno) = LOWER($3)
           AND id != $4`,
        [
          nombre      || actual.nombre,
          anio_lectivo|| actual.anio_lectivo,
          turno       || actual.turno,
          id
        ]
      );
      if (dupCheck.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Ya existe otro curso con ese nombre, turno y año lectivo`
        });
      }
    }

    // Si se quiere desactivar, verificar materias activas asociadas
    if (activo === false || activo === 'false') {
      const matRes = await client.query(
        `SELECT m.nombre FROM materias m
         WHERE m.curso_id = $1 AND m.activa = TRUE`,
        [id]
      );
      if (matRes.rows.length) {
        await client.query('ROLLBACK');
        const lista = matRes.rows.map(m => m.nombre).join(', ');
        return res.status(409).json({
          error: `No se puede desactivar el curso porque tiene ${matRes.rows.length} materia(s) activa(s) asociada(s): ${lista}. Desactivá primero las materias.`
        });
      }
    }

    const turnoNorm = turno ? normalizeTurno(turno) : undefined;

    const result = await client.query(
      `UPDATE cursos
       SET nombre       = COALESCE($1, nombre),
           nivel        = COALESCE($2, nivel),
           turno        = COALESCE($3, turno),
           anio_lectivo = COALESCE($4, anio_lectivo),
           activo       = COALESCE($5, activo)
       WHERE id = $6 RETURNING *`,
      [nombre || null, nivel || null, turnoNorm || null, anio_lectivo || null, activo ?? null, id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch(err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un curso con esos datos' });
    }
    res.status(500).json({ error: 'Error al editar curso' });
  } finally {
    client.release();
  }
});

module.exports = router;
