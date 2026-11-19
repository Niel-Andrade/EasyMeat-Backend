
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
const crypto = require('crypto');
const { Op } = require('sequelize');

const app = require('../../src/app');
const env = require('../../src/config/env');

const {
  sequelize,
  usuario,
  recuperacaoSenha,
} = require('../../src/models');

const emailsCriados = [];
let bancoConectado = false;

function gerarEmailTeste() {
  const email = `recuperacao-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}@easymeat.test`;

  emailsCriados.push(email);

  return email;
}

function dadosComprador() {
  return {
    nome: 'Usuário de Recuperação',
    email: gerarEmailTeste(),
    senha: 'Senha@123',
    telefone: '11999999999',
    cidade: 'São Paulo',
    estado: 'SP',
    tipoUsuario: 'COMPRADOR',
  };
}

async function criarComprador() {
  const dados = dadosComprador();

  const resposta = await request(app)
    .post('/auth/register')
    .send(dados);

  expect(resposta.status).toBe(201);

  const usuarioSalvo = await usuario.findOne({
    where: { email: dados.email },
  });

  return { dados, usuarioSalvo };
}

async function solicitarRecuperacao(email) {
  return request(app)
    .post('/auth/recuperar-senha')
    .send({ email });
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
      const usuariosCriados = await usuario.findAll({
        attributes: ['id'],
        where: {
          email: {
            [Op.in]: emailsCriados,
          },
        },
      });

      const idsUsuarios = usuariosCriados.map((item) => item.id);

      if (idsUsuarios.length > 0) {
        await recuperacaoSenha.destroy({
          where: {
            usuarioId: {
              [Op.in]: idsUsuarios,
            },
          },
        });

        await usuario.destroy({
          where: {
            id: {
              [Op.in]: idsUsuarios,
            },
          },
        });
      }
    }
  } finally {
    if (bancoConectado) {
      await sequelize.close();
    }
  }
});

describe('API - Logout e recuperação de senha', () => {

  test('AUTH-012: deve remover o cookie ao realizar logout', async () => {
    const resposta = await request(app)
      .post('/auth/logout');

    expect(resposta.status).toBe(200);

    const cookies = resposta.headers['set-cookie'];

    expect(cookies).toBeDefined();

    const cookieAutenticacao = cookies.find((item) =>
      item.startsWith(`${env.jwt_cookie_nome}=`)
    );

    expect(cookieAutenticacao).toBeDefined();
    expect(cookieAutenticacao).toMatch(/expires=/i);
  });

  test('AUTH-013: deve retornar resposta genérica para e-mail inexistente', async () => {
    const email = gerarEmailTeste();

    const resposta = await solicitarRecuperacao(email);

    expect(resposta.status).toBe(200);

    expect(resposta.body.message).toBe(
      'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação em instantes.'
    );

    expect(resposta.body.token).toBeUndefined();
  });

  test('AUTH-014: deve gerar token e armazenar somente seu hash', async () => {
    const { dados, usuarioSalvo } = await criarComprador();

    const resposta = await solicitarRecuperacao(dados.email);

    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toBeDefined();

    const tokenHash = crypto
      .createHash('sha256')
      .update(resposta.body.token)
      .digest('hex');

    const solicitacao = await recuperacaoSenha.findOne({
      where: {
        usuarioId: usuarioSalvo.id,
        tokenHash,
      },
    });

    expect(solicitacao).not.toBeNull();
    expect(solicitacao.tokenHash).not.toBe(resposta.body.token);
    expect(solicitacao.utilizadoEm).toBeNull();
    expect(solicitacao.expiraEm.getTime()).toBeGreaterThan(Date.now());
  });

  test('AUTH-015: deve redefinir a senha com token válido', async () => {
    const { dados, usuarioSalvo } = await criarComprador();

    const recuperacao = await solicitarRecuperacao(dados.email);

    const novaSenha = 'NovaSenha@456';

    const resposta = await request(app)
      .post('/auth/redefinir-senha')
      .send({
        token: recuperacao.body.token,
        novaSenha,
      });

    expect(resposta.status).toBe(200);

    const usuarioAtualizado = await usuario.findByPk(usuarioSalvo.id);

    expect(
      await bcrypt.compare(novaSenha, usuarioAtualizado.senha)
    ).toBe(true);

    expect(
      await bcrypt.compare(dados.senha, usuarioAtualizado.senha)
    ).toBe(false);

    const solicitacao = await recuperacaoSenha.findOne({
      where: {
        usuarioId: usuarioSalvo.id,
      },
    });

    expect(solicitacao.utilizadoEm).not.toBeNull();
  });

  test('AUTH-016: deve rejeitar token de recuperação inválido', async () => {
    const resposta = await request(app)
      .post('/auth/redefinir-senha')
      .send({
        token: 'token-inexistente',
        novaSenha: 'NovaSenha@456',
      });

    expect(resposta.status).toBe(400);
  });

  test('AUTH-017: deve rejeitar token de recuperação expirado', async () => {
    const { usuarioSalvo } = await criarComprador();

    const token = 'token-expirado-de-teste';

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    await recuperacaoSenha.create({
      usuarioId: usuarioSalvo.id,
      tokenHash,
      expiraEm: new Date(Date.now() - 60 * 1000),
      utilizadoEm: null,
    });

    const resposta = await request(app)
      .post('/auth/redefinir-senha')
      .send({
        token,
        novaSenha: 'NovaSenha@456',
      });

    expect(resposta.status).toBe(400);
  });

  test('AUTH-018: não deve permitir reutilizar um token de recuperação', async () => {
    const { dados } = await criarComprador();

    const recuperacao = await solicitarRecuperacao(dados.email);

    const primeiraTentativa = await request(app)
      .post('/auth/redefinir-senha')
      .send({
        token: recuperacao.body.token,
        novaSenha: 'NovaSenha@456',
      });

    expect(primeiraTentativa.status).toBe(200);

    const segundaTentativa = await request(app)
      .post('/auth/redefinir-senha')
      .send({
        token: recuperacao.body.token,
        novaSenha: 'OutraSenha@789',
      });

    expect(segundaTentativa.status).toBe(400);
  });

});
