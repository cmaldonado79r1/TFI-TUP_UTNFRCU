const router = require('express').Router();
const { query } = require('../models/db');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/clase/:clase_id', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM actividades WHERE clase_id=$1', [req.params.clase_id]);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: 'Error al obtener actividades' }); }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { clase_id, nombre, tipo, descripcion } = req.body;
    if (!clase_id || !nombre) return res.status(400).json({ error: 'clase_id y nombre son requeridos' });
    const cls = await query("SELECT estado FROM clases WHERE id=$1", [clase_id]);
    if (!cls.rows.length) return res.status(404).json({ error: 'Clase no encontrada' });
    if (cls.rows[0].estado === 'INMUTABLE') return res.status(403).json({ error: 'Clase inmutable' });
    const result = await query(
      'INSERT INTO actividades (clase_id, nombre, tipo, descripcion) VALUES ($1,$2,$3,$4) RETURNING *',
      [clase_id, nombre, tipo||'PRÁCTICA', descripcion||null]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al crear actividad' }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM actividades WHERE id=$1', [req.params.id]);
    res.json({ message: 'Actividad eliminada' });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar actividad' }); }
});

module.exports = router;
