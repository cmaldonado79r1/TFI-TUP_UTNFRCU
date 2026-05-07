const router = require('express').Router();
const { listarImprevistos, crearImprevisto, resolverImprevisto, eliminarImprevisto } = require('../controllers/imprevistos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/clase/:clase_id', verifyToken, listarImprevistos);
router.post('/', verifyToken, crearImprevisto);
router.patch('/:id/resolver', verifyToken, resolverImprevisto);
router.delete('/:id', verifyToken, eliminarImprevisto);

module.exports = router;
