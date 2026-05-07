const router = require('express').Router();
const { query } = require('../models/db');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/clase/:clase_id', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM temas WHERE clase_id=$1 ORDER BY orden', [req.params.clase_id]);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: 'Error al obtener temas' }); }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { clase_id, nombre, descripcion, orden } = req.body;
    if (!clase_id || !nombre) return res.status(400).json({ error: 'clase_id y nombre son requeridos' });
    // verificar clase no inmutable
    const cls = await query("SELECT estado FROM clases WHERE id=$1", [clase_id]);
    if (!cls.rows.length) return res.status(404).json({ error: 'Clase no encontrada' });
    if (cls.rows[0].estado === 'INMUTABLE') return res.status(403).json({ error: 'Clase inmutable' });
    const result = await query(
      'INSERT INTO temas (clase_id, nombre, descripcion, orden) VALUES ($1,$2,$3,$4) RETURNING *',
      [clase_id, nombre, descripcion||null, orden||1]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: 'Error al crear tema' }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM temas WHERE id=$1', [req.params.id]);
    res.json({ message: 'Tema eliminado' });
  } catch(err) { res.status(500).json({ error: 'Error al eliminar tema' }); }
});

module.exports = router;
