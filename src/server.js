const bcrypt = require('bcrypt');
const app = require('./app');
const sequelize = require('./config/sequelize');
const env = require('./config/env');
const { usuario } = require('./models');

async function garantirAdminPadrao() {
  if (!env.default_admin.email || !env.default_admin.senha) {
    return;
  }

  const adminExistente = await usuario.findOne({
    where: {
      email: env.default_admin.email.toLowerCase(),
    },
  });

  if (adminExistente) {
    return;
  }

  await usuario.create({
    nome: env.default_admin.nome || 'Administrador',
    email: env.default_admin.email.toLowerCase(),
    senha: bcrypt.hashSync(
      env.default_admin.senha,
      env.bcrypt_salt
    ),
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

    const servidor = app.listen(env.porta, () => {
      console.log(
        `Easy Meat API rodando na porta ${env.porta}`
      );
    });

    return servidor;
  } catch (erro) {
    console.error('Erro ao iniciar a API Easy Meat:', erro);
    process.exit(1);
  }
}

// Só inicia o servidor quando este arquivo for executado diretamente.
if (require.main === module) {
  iniciarServidor();
}

module.exports = iniciarServidor;
