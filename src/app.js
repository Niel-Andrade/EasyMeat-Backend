const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const rotas = require('./api');
const { verificarToken } = require('./middleware/autenticacao');
const app = express();
const pastaUploads = path.resolve(__dirname, '../uploads');
const pastaTemp = path.resolve(__dirname, '../tmp/uploads');

if (!fs.existsSync(pastaUploads)) {
  fs.mkdirSync(pastaUploads, { recursive: true });
}

if (!fs.existsSync(pastaTemp)) {
  fs.mkdirSync(pastaTemp, { recursive: true });
}

// Configurações e middlewares do Express.
app.use(cors({
  origin: env.cliente_url,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Arquivos públicos.
app.use('/uploads', express.static(pastaUploads));

// Autenticação e rotas.
app.use(verificarToken);
app.use('/', rotas);

// Tratamento global de erros.
app.use((erro, _req, res, _next) => {
  if (erro && erro.message === 'Apenas arquivos de imagem são permitidos.') {
    return res.status(400).json({ message: erro.message });
  }

  if (erro && erro.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: `O arquivo excede o limite de ${env.upload_limite_mb}MB.`,
    });
  }

  return res.status(500).json({
    message: erro.message || 'Erro interno do servidor.',
  });
});

module.exports = app;
