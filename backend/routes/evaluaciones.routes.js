const router = require('express').Router();
const { listarEvaluaciones, validarFecha, crearEvaluacion, editarEvaluacion, eliminarEvaluacion } = require('../controllers/evaluaciones.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/validar', verifyToken, validarFecha);
router.get('/', verifyToken, listarEvaluaciones);
router.post('/', verifyToken, crearEvaluacion);
router.put('/:id', verifyToken, editarEvaluacion);
router.delete('/:id', verifyToken, eliminarEvaluacion);

module.exports = router;
