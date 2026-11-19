
process.env.NODE_ENV = 'test';

process.env.ROTAS_PUBLICAS = [
  'POST:/auth/register',
  'POST:/auth/login',
  'POST:/auth/logout',
  'POST:/auth/recuperar-senha',
  'POST:/auth/redefinir-senha',
  'GET:/health',
].join(',');

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const app = require('../../src/app');
const env = require('../../src/config/env');

const {
  sequelize,
  usuario,
} = require('../../src/models');

const emailsCriados = [];
let bancoConectado = false;

const senhaTeste = 'Senha@123';

function gerarEmailTeste() {
  const identificador = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const email = `seguranca-${identificador}@easymeat.test`;

  emailsCriados.push(email);

  return email;
}

async function criarUsuario(tipoUsuario = 'COMPRADOR') {
  const dados = {
    nome: `Usuário ${tipoUsuario} Teste`,
    email: gerarEmailTeste(),
    senha: bcrypt.hashSync(senhaTeste, env.bcrypt_salt),
    telefone: '11999999999',
    cidade: 'São Paulo',
    estado: 'SP',
    tipoUsuario,
    status: 'ATIVO',
  };

  return usuario.create(dados);
}

function extrairCookie(resposta) {
  const cookies = resposta.headers['set-cookie'];

  if (!cookies) {
    throw new Error('Cookie de autenticação não encontrado.');
  }

  const cookie = cookies.find((item) =>
    item.startsWith(`${env.jwt_cookie_nome}=`)
  );

  if (!cookie) {
    throw new Error('Cookie JWT não encontrado.');
  }

  return cookie.split(';')[0];
}

async function autenticarUsuario(email) {
  const resposta = await request(app)
    .post('/auth/login')
    .send({
      email,
      senha: senhaTeste,
    });

  expect(resposta.status).toBe(200);

  return extrairCookie(resposta);
}

beforeAll(async () => {
  if (env.node_env !== 'test') {
    throw new Error('Os testes devem executar com NODE_ENV=test.');
  }

  if (sequelize.config.database === env.banco.database) {
    throw new Error(
      'O banco de testes não pode ser o mesmo banco de desenvolvimento.'
    );
  }

  await sequelize.authenticate();
  bancoConectado = true;

  await sequelize.sync();
});

afterAll(async () => {
  try {
    if (bancoConectado && emailsCriados.length > 0) {
      await usuario.destroy({
        where: {
          email: {
            [Op.in]: emailsCriados,
          },
        },
      });
    }
  } finally {
    if (bancoConectado) {
      await sequelize.close();
    }
  }
});

describe('API - Segurança da autenticação', () => {

  test('SEC-001: deve impedir acesso sem token', async () => {
    const resposta = await request(app)
      .get('/auth/me');

    expect(resposta.status).toBe(401);
    expect(resposta.body.message).toBe('Token não informado.');
  });

  test('SEC-002: deve rejeitar token JWT adulterado', async () => {
    const usuarioTeste = await criarUsuario();

    const cookie = await autenticarUsuario(usuarioTeste.email);

    const token = cookie.split('=')[1];
    const partes = token.split('.');

    // Altera o conteúdo do payload sem gerar uma nova assinatura.
    partes[1] =
      partes[1].slice(0, -1) +
      (partes[1].slice(-1) === 'a' ? 'b' : 'a');

    const tokenAdulterado = partes.join('.');

    const resposta = await request(app)
      .get('/auth/me')
      .set('Cookie', `${env.jwt_cookie_nome}=${tokenAdulterado}`);

    expect(resposta.status).toBe(401);
    expect(resposta.body.message).toBe(
      'Token inválido ou expirado.'
    );
  });

  test('SEC-003: deve rejeitar token JWT expirado', async () => {
    const tokenExpirado = jwt.sign(
      {
        email: 'expirado@easymeat.test',
        tipoUsuario: 'COMPRADOR',
      },
      env.jwt_secret,
      {
        subject: 'usuario-teste-expirado',
        expiresIn: -1,
      }
    );

    const resposta = await request(app)
      .get('/auth/me')
      .set(
        'Cookie',
        `${env.jwt_cookie_nome}=${tokenExpirado}`
      );

    expect(resposta.status).toBe(401);
    expect(resposta.body.message).toBe(
      'Token inválido ou expirado.'
    );
  });

  test('SEC-004: deve rejeitar token malformado', async () => {
    const resposta = await request(app)
      .get('/auth/me')
      .set(
        'Cookie',
        `${env.jwt_cookie_nome}=token.invalido`
      );

    expect(resposta.status).toBe(401);
    expect(resposta.body.message).toBe(
      'Token inválido ou expirado.'
    );
  });

  test('SEC-005: deve demonstrar se administrador bloqueado continua acessando com token válido', async () => {
    const admin = await criarUsuario('ADMIN');

    // O administrador recebe um token enquanto está ativo.
    const cookie = await autenticarUsuario(admin.email);

    // A conta é bloqueada depois da emissão do token.
    admin.status = 'BLOQUEADO';
    await admin.save();

    const resposta = await request(app)
      .get('/admin/usuarios')
      .set('Cookie', cookie);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe('Sua conta está bloqueada.');
  });

  test('SEC-006: deve impedir comprador de acessar rota administrativa', async () => {
    const comprador = await criarUsuario('COMPRADOR');

    const cookie = await autenticarUsuario(comprador.email);

    const resposta = await request(app)
      .get('/admin/usuarios')
      .set('Cookie', cookie);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(
      'Acesso permitido apenas para administradores.'
    );
  });

  test('SEC-007: deve permitir administrador acessar rota administrativa', async () => {
    const admin = await criarUsuario('ADMIN');

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .get('/admin/usuarios')
      .set('Cookie', cookie);

    expect(resposta.status).toBe(200);
    expect(resposta.body.items).toBeInstanceOf(Array);
  });

});
