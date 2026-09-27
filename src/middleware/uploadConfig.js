const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');

const pastaTemporaria = path.resolve(__dirname, '../../tmp/uploads');
if (!fs.existsSync(pastaTemporaria)) {
  fs.mkdirSync(pastaTemporaria, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, pastaTemporaria);
  },
  filename: (_req, file, cb) => {
    const nomeSeguro = `${Date.now()}-${file.originalname.replace(/\s+/g, '-').toLowerCase()}`;
    cb(null, nomeSeguro);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Apenas arquivos de imagem são permitidos.'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload_limite_mb * 1024 * 1024,
  },
});

module.exports = upload;
