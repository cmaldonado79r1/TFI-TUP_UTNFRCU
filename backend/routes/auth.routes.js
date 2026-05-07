const router = require('express').Router();
const { login, me, cambiarPassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/login', login);
router.get('/me', verifyToken, me);
router.put('/cambiar-password', verifyToken, cambiarPassword);

module.exports = router;
