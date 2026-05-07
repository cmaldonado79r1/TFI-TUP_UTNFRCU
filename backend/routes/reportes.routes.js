const router = require('express').Router();
const { exportarPDF, exportarExcel } = require('../controllers/reportes.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/pdf', verifyToken, exportarPDF);
router.get('/excel', verifyToken, exportarExcel);

module.exports = router;
