const router = require('express').Router();
const {
  listarUsuarios, obtenerUsuario, crearUsuario, editarUsuario,
  resetPassword, listarRoles, getMateriasDocente, asignarMaterias
} = require('../controllers/usuarios.controller');
const { verifyToken, requireDirectivo } = require('../middlewares/auth.middleware');

router.get('/roles',                verifyToken, listarRoles);
router.get('/',                     verifyToken, requireDirectivo, listarUsuarios);
router.get('/:id',                  verifyToken, requireDirectivo, obtenerUsuario);
router.post('/',                    verifyToken, requireDirectivo, crearUsuario);
router.put('/:id',                  verifyToken, requireDirectivo, editarUsuario);
router.put('/:id/reset-password',   verifyToken, requireDirectivo, resetPassword);

// GET /:id/materias — DOCENTE puede ver sus propias materias; Directivo/Admin pueden ver cualquiera
// La lógica de permisos finos está en el controlador (getMateriasDocente)
router.get('/:id/materias',         verifyToken, getMateriasDocente);

// PUT /:id/materias — solo Directivo/Administrador pueden reasignar
router.put('/:id/materias',         verifyToken, requireDirectivo, asignarMaterias);

module.exports = router;
