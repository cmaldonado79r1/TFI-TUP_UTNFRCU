const router = require('express').Router();
const { listarAuditoria, obtenerRegistro } = require('../controllers/auditoria.controller');
const { verifyToken, requireAdministrador } = require('../middlewares/auth.middleware');

router.get('/',    verifyToken, requireAdministrador, listarAuditoria);
router.get('/:id', verifyToken, requireAdministrador, obtenerRegistro);

module.exports = router;
