const router = require('express').Router();
const { listarClases, obtenerClase, crearClase, editarClase, estadisticas } = require('../controllers/clases.controller');
const { verifyToken, requireDirectivoOAsesor } = require('../middlewares/auth.middleware');

router.get('/estadisticas', verifyToken, estadisticas);
router.get('/', verifyToken, listarClases);
router.get('/:id', verifyToken, obtenerClase);
router.post('/', verifyToken, crearClase);
router.put('/:id', verifyToken, editarClase);

module.exports = router;
