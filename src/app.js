const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const sequelize = require('./config/sequelize');
const env = require('./config/env');
const rotas = require('./api');
const { verificarToken } = require('./middleware/autenticacao');
const { usuario } = require('./models');

const app = express();
const pastaUploads = path.resolve(__dirname, '../uploads');
const pastaTemp = path.resolve(__dirname, '../tmp/uploads');

if (!fs.existsSync(pastaUploads)) {
  fs.mkdirSync(pastaUploads, { recursive: true });
}

if (!fs.existsSync(pastaTemp)) {
  fs.mkdirSync(pastaTemp, { recursive: true });
}

app.use(
  cors({
    origin: env.cliente_url,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(pastaUploads));
app.use(verificarToken);
app.use('/', rotas);

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

async function garantirAdminPadrao() {
  if (!env.default_admin.email || !env.default_admin.senha) {
    return;
  }

  const adminExistente = await usuario.findOne({
    where: { email: env.default_admin.email.toLowerCase() },
  });

  if (adminExistente) {
    return;
  }

  await usuario.create({
    nome: env.default_admin.nome || 'Administrador',
    email: env.default_admin.email.toLowerCase(),
    senha: bcrypt.hashSync(env.default_admin.senha, env.bcrypt_salt),
    telefone: env.default_admin.telefone || '11999999999',
    cidade: env.default_admin.cidade || 'São Paulo',
    estado: (env.default_admin.estado || 'SP').toUpperCase(),
    tipoUsuario: 'ADMIN',
    status: 'ATIVO',
    plano: 'premium',
    premium: true,
  });
}

async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await garantirAdminPadrao();

    app.listen(env.porta, () => {
      console.log(`Easy Meat API rodando na porta ${env.porta}`);
    });
  } catch (erro) {
    console.error('Erro ao iniciar a API Easy Meat:', erro);
    process.exit(1);
  }
}

iniciarServidor();

module.exports = app;
