const router = require('express').Router();
const {
  listarUsuarios, obtenerUsuario, crearUsuario, editarUsuario,
  resetPassword, listarRoles, getMateriasDocente, asignarMaterias
} = require('../controllers/usuarios.controller');
const { verifyToken, requireDirectivo } = require('../middlewares/auth.middleware');

router.get('/roles',                    verifyToken, listarRoles);
router.get('/',                         verifyToken, requireDirectivo, listarUsuarios);
router.get('/:id',                      verifyToken, requireDirectivo, obtenerUsuario);
router.post('/',                        verifyToken, requireDirectivo, crearUsuario);
router.put('/:id',                      verifyToken, requireDirectivo, editarUsuario);
router.put('/:id/reset-password',       verifyToken, requireDirectivo, resetPassword);
router.get('/:id/materias',             verifyToken, requireDirectivo, getMateriasDocente);
router.put('/:id/materias',             verifyToken, requireDirectivo, asignarMaterias);

module.exports = router;
