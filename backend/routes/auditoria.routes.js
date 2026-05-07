const router = require('express').Router();
const { listarAuditoria, obtenerRegistro } = require('../controllers/auditoria.controller');
const { verifyToken, requireDirectivo } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, requireDirectivo, listarAuditoria);
router.get('/:id', verifyToken, requireDirectivo, obtenerRegistro);

module.exports = router;
