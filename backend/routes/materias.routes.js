const router = require('express').Router();
const { listarMaterias, obtenerMateria, crearMateria, editarMateria } = require('../controllers/materias.controller');
const { verifyToken, requireDirectivo } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, listarMaterias);
router.get('/:id', verifyToken, obtenerMateria);
router.post('/', verifyToken, requireDirectivo, crearMateria);
router.put('/:id', verifyToken, requireDirectivo, editarMateria);

module.exports = router;
