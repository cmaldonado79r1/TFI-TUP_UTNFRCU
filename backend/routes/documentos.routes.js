const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { listarDocumentos, subirDocumento, eliminarDocumento, descargarDocumento } = require('../controllers/documentos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.jpg','.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'));
  }
});

router.get('/', verifyToken, listarDocumentos);
router.post('/', verifyToken, upload.single('archivo'), subirDocumento);
router.delete('/:id', verifyToken, eliminarDocumento);
router.get('/:id/descargar', verifyToken, descargarDocumento);

module.exports = router;
