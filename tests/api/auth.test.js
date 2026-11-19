
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
const { Op } = require('sequelize');

const app = require('../../src/app');
const env = require('../../src/config/env');

const {
  sequelize,
  usuario,
} = require('../../src/models');

const emailsCriados = [];
let bancoConectado = false;

function gerarEmailTeste() {
  const identificador = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const email = `teste-${identificador}@easymeat.test`;

  emailsCriados.push(email);

  return email;
}

function dadosComprador() {
  return {
    nome: 'Comprador de Teste',
    email: gerarEmailTeste(),
    senha: 'Senha@123',
    telefone: '11999999999',
    cidade: 'São Paulo',
    estado: 'SP',
    tipoUsuario: 'COMPRADOR',
  };
}

function dadosVendedor() {
  return {
    nome: 'Vendedor de Teste',
    email: gerarEmailTeste(),
    senha: 'Senha@123',
    telefone: '11999999999',
    cidade: 'São Paulo',
    estado: 'SP',
    tipoUsuario: 'VENDEDOR',
    cpf: '52998224725',
  };
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

describe('API - Autenticação', () => {

  test('AUTH-001: deve cadastrar um comprador com dados válidos', async () => {
    const dados = dadosComprador();

    const resposta = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(resposta.status).toBe(201);
    expect(resposta.body.success).toBe(true);
    expect(resposta.body.usuario.email).toBe(dados.email);
    expect(resposta.body.usuario.senha).toBeUndefined();

    const usuarioSalvo = await usuario.findOne({
      where: { email: dados.email },
    });

    expect(usuarioSalvo).not.toBeNull();

    expect(
      await bcrypt.compare(dados.senha, usuarioSalvo.senha)
    ).toBe(true);

    const cookies = resposta.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain(`${env.jwt_cookie_nome}=`);
    expect(cookies.join(';')).toMatch(/HttpOnly/i);
  });

  test('AUTH-002: não deve permitir cadastro com e-mail duplicado', async () => {
    const dados = dadosComprador();

    const primeiroCadastro = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(primeiroCadastro.status).toBe(201);

    const segundoCadastro = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(segundoCadastro.status).toBe(409);
  });

  test('AUTH-003: deve rejeitar cadastro com dados inválidos', async () => {
    const dados = dadosComprador();

    dados.email = 'email-invalido';
    dados.senha = '123';

    const resposta = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(resposta.status).toBe(422);
    expect(resposta.body.message).toBe('Dados inválidos.');
    expect(resposta.body.errors).toBeInstanceOf(Array);

    const usuarioSalvo = await usuario.findOne({
      where: { email: dados.email },
    });

    expect(usuarioSalvo).toBeNull();
  });

  test('AUTH-004: deve cadastrar vendedor com CPF válido', async () => {
    const dados = dadosVendedor();

    const resposta = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(resposta.status).toBe(201);
    expect(resposta.body.usuario.email).toBe(dados.email);

    const usuarioSalvo = await usuario.findOne({
      where: { email: dados.email },
    });

    expect(usuarioSalvo).not.toBeNull();
    expect(usuarioSalvo.cpf).toBe('52998224725');
  });

  test('AUTH-005: deve rejeitar vendedor sem CPF', async () => {
    const dados = dadosVendedor();

    delete dados.cpf;

    const resposta = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(resposta.status).toBe(422);
  });

  test('AUTH-006: deve rejeitar vendedor com CPF inválido', async () => {
    const dados = dadosVendedor();

    dados.cpf = '11111111111';

    const resposta = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(resposta.status).toBe(422);
  });

  test('AUTH-007: deve rejeitar CPF enviado como número', async () => {
    const dados = dadosVendedor();

    dados.cpf = 52998224725;

    const resposta = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(resposta.status).toBe(422);
  });

  test('AUTH-008: deve autenticar usuário com credenciais válidas', async () => {
    const dados = dadosComprador();

    const cadastro = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(cadastro.status).toBe(201);

    const resposta = await request(app)
      .post('/auth/login')
      .send({
        email: dados.email,
        senha: dados.senha,
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.success).toBe(true);
    expect(resposta.body.usuario.email).toBe(dados.email);

    expect(resposta.headers['set-cookie']).toBeDefined();
    expect(
      resposta.headers['set-cookie'].join(';')
    ).toMatch(/HttpOnly/i);
  });

  test('AUTH-009: deve rejeitar login com senha incorreta', async () => {
    const dados = dadosComprador();

    const cadastro = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(cadastro.status).toBe(201);

    const resposta = await request(app)
      .post('/auth/login')
      .send({
        email: dados.email,
        senha: 'SenhaIncorreta',
      });

    expect(resposta.status).toBe(401);
    expect(resposta.body.message).toBe('Credenciais inválidas.');
  });

  test('AUTH-010: deve impedir login de usuário bloqueado', async () => {
    const dados = dadosComprador();

    await usuario.create({
      nome: dados.nome,
      email: dados.email,
      senha: bcrypt.hashSync(dados.senha, env.bcrypt_salt),
      telefone: dados.telefone,
      cidade: dados.cidade,
      estado: dados.estado,
      tipoUsuario: 'COMPRADOR',
      status: 'BLOQUEADO',
      plano: 'free',
      premium: false,
    });

    const resposta = await request(app)
      .post('/auth/login')
      .send({
        email: dados.email,
        senha: dados.senha,
      });

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(
      'Sua conta está bloqueada. Entre em contato com o suporte.'
    );
  });

  test('AUTH-011: deve consultar os dados do usuário autenticado', async () => {
    const dados = dadosComprador();

    const cadastro = await request(app)
      .post('/auth/register')
      .send(dados);

    expect(cadastro.status).toBe(201);

    const cookies = cadastro.headers['set-cookie'];

    const cookieToken = cookies
      .find((item) => item.startsWith(`${env.jwt_cookie_nome}=`))
      .split(';')[0];

    const resposta = await request(app)
      .get('/auth/me')
      .set('Cookie', cookieToken);

    expect(resposta.status).toBe(200);
    expect(resposta.body.usuario.email).toBe(dados.email);
    expect(resposta.body.usuario.senha).toBeUndefined();
  });

});
