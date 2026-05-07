const router = require('express').Router();
const { aprobarClase, listarPendientes, historialAprobaciones } = require('../controllers/aprobaciones.controller');
const { verifyToken, requireDirectivoOAsesor } = require('../middlewares/auth.middleware');

router.get('/pendientes', verifyToken, requireDirectivoOAsesor, listarPendientes);
router.get('/historial/:clase_id', verifyToken, historialAprobaciones);
router.post('/', verifyToken, requireDirectivoOAsesor, aprobarClase);

module.exports = router;
