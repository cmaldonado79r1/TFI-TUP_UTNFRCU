const router = require('express').Router();
const { query } = require('../models/db');
const { verifyToken, requireDirectivo } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM cursos WHERE activo = TRUE ORDER BY nivel, nombre');
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: 'Error al obtener cursos' }); }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM cursos WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al obtener curso' }); }
});

router.post('/', verifyToken, requireDirectivo, async (req, res) => {
  try {
    const { nombre, nivel, turno, anio_lectivo } = req.body;
    if (!nombre || !nivel || !turno || !anio_lectivo)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    const result = await query(
      'INSERT INTO cursos (nombre, nivel, turno, anio_lectivo) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, nivel, turno, anio_lectivo]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al crear curso' }); }
});

router.put('/:id', verifyToken, requireDirectivo, async (req, res) => {
  try {
    const { nombre, nivel, turno, activo } = req.body;
    const result = await query(
      'UPDATE cursos SET nombre=COALESCE($1,nombre), nivel=COALESCE($2,nivel), turno=COALESCE($3,turno), activo=COALESCE($4,activo) WHERE id=$5 RETURNING *',
      [nombre, nivel, turno, activo, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al editar curso' }); }
});

module.exports = router;
