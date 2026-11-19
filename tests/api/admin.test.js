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

jest.mock('../../src/config/cloudinary', () => ({
  uploadImagem: jest.fn(async (caminhoTemporario) => {
    const fs = require('fs');

    if (caminhoTemporario && fs.existsSync(caminhoTemporario)) {
      fs.unlinkSync(caminhoTemporario);
    }

    return {
      url: 'https://teste.easymeat.com/banner-teste.jpg',
      publicId: 'easymeat-test/banner-teste',
    };
  }),

  removerImagem: jest.fn().mockResolvedValue(undefined),

  cloudinary: {
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
  },

  cloudinaryHabilitado: false,
}));

const app = require('../../src/app');
const env = require('../../src/config/env');

const {
  sequelize,
  usuario,
  anuncio,
  anuncioImagem,
  banner,
} = require('../../src/models');

const emailsCriados = [];
const anunciosCriados = [];
const bannersCriados = [];

let bancoConectado = false;

const senhaTeste = 'Senha@123';

function gerarEmailTeste() {
  const identificador = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const email = `admin-${identificador}@easymeat.test`;

  emailsCriados.push(email);

  return email;
}

async function criarUsuario(tipoUsuario = 'COMPRADOR', status = 'ATIVO') {
  const dados = {
    nome: `Usuário ${tipoUsuario} Teste`,
    email: gerarEmailTeste(),
    senha: bcrypt.hashSync(senhaTeste, env.bcrypt_salt),
    telefone: '11999999999',
    cidade: 'São Paulo',
    estado: 'SP',
    tipoUsuario,
    status,
  };

  return usuario.create(dados);
}

async function criarAnuncio(usuarioId, dadosAdicionais = {}) {
  const dados = {
    usuarioId,
    titulo: 'Anúncio de teste',
    descricao: 'Descrição do anúncio utilizado nos testes administrativos.',
    categoria: 'BOVINA',
    tipoCarne: 'Picanha',
    quantidade: 100,
    preco: 35.90,
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'ATIVO',
    destaque: false,
    visualizacoes: 0,
    ...dadosAdicionais,
  };

  const novoAnuncio = await anuncio.create(dados);

  anunciosCriados.push(novoAnuncio.id);

  return novoAnuncio;
}

async function criarBanner(dadosAdicionais = {}) {
  const dados = {
    titulo: 'Banner de teste',
    imagem: 'https://teste.easymeat.com/banner-original.jpg',
    imagemPublicId: 'easymeat-test/banner-original',
    link: 'https://easymeat.com',
    ativo: true,
    ...dadosAdicionais,
  };

  const novoBanner = await banner.create(dados);

  bannersCriados.push(novoBanner.id);

  return novoBanner;
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
    if (bancoConectado) {
      if (bannersCriados.length > 0) {
        await banner.destroy({
          where: {
            id: {
              [Op.in]: bannersCriados,
            },
          },
      });
      }

      if (anunciosCriados.length > 0) {
        await anuncioImagem.destroy({
          where: {
            anuncioId: {
              [Op.in]: anunciosCriados,
            },
          },
        });

        await anuncio.destroy({
          where: {
            id: {
              [Op.in]: anunciosCriados,
            },
          },
        });
      }

      if (emailsCriados.length > 0) {
        await usuario.destroy({
          where: {
            email: {
              [Op.in]: emailsCriados,
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

describe('API - Operações administrativas', () => {
  test('ADM-001: administrador deve bloquear um usuário', async () => {
    const admin = await criarUsuario('ADMIN');
    const comprador = await criarUsuario('COMPRADOR');

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .put(`/admin/usuarios/${comprador.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'BLOQUEADO' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe(
      'Status do usuário atualizado com sucesso.'
    );

    await comprador.reload();

    expect(comprador.status).toBe('BLOQUEADO');
  });

  test('ADM-002: administrador deve reativar um usuário bloqueado', async () => {
    const admin = await criarUsuario('ADMIN');
    const comprador = await criarUsuario('COMPRADOR', 'BLOQUEADO');

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .put(`/admin/usuarios/${comprador.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'ATIVO' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe(
      'Status do usuário atualizado com sucesso.'
    );

    await comprador.reload();

    expect(comprador.status).toBe('ATIVO');
  });

  test('ADM-003: deve rejeitar status inválido', async () => {
    const admin = await criarUsuario('ADMIN');
    const comprador = await criarUsuario('COMPRADOR');

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .put(`/admin/usuarios/${comprador.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'SUSPENSO' });

    expect(resposta.status).toBe(422);
    expect(resposta.body.message).toBe('Dados inválidos.');
    expect(resposta.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: 'Status inválido.',
        }),
      ])
    );

    await comprador.reload();

    expect(comprador.status).toBe('ATIVO');
  });

  test('ADM-004: deve retornar 404 ao alterar usuário inexistente', async () => {
    const admin = await criarUsuario('ADMIN');
    const cookie = await autenticarUsuario(admin.email);

    const idInexistente = crypto.randomUUID();

    const resposta = await request(app)
      .put(`/admin/usuarios/${idInexistente}/status`)
      .set('Cookie', cookie)
      .send({ status: 'BLOQUEADO' });

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Usuário não encontrado.');
  });

  test('ADM-005: deve impedir administrador de bloquear a própria conta', async () => {
    const admin = await criarUsuario('ADMIN');
    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .put(`/admin/usuarios/${admin.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'BLOQUEADO' });

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(
      'Você não pode bloquear sua própria conta.'
    );

    await admin.reload();

    expect(admin.status).toBe('ATIVO');
  });

  test('ADM-006: deve impedir vendedor de alterar status de usuário', async () => {
    const vendedor = await criarUsuario('VENDEDOR');
    const comprador = await criarUsuario('COMPRADOR');

    const cookie = await autenticarUsuario(vendedor.email);

    const resposta = await request(app)
      .put(`/admin/usuarios/${comprador.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'BLOQUEADO' });

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(
      'Acesso permitido apenas para administradores.'
    );

    await comprador.reload();

    expect(comprador.status).toBe('ATIVO');
  });

  test('ADM-007: administrador deve listar anúncios', async () => {
    const admin = await criarUsuario('ADMIN');
    const vendedor = await criarUsuario('VENDEDOR');

    const primeiroAnuncio = await criarAnuncio(vendedor.id, {
      titulo: 'Carne bovina para teste',
    });

    const segundoAnuncio = await criarAnuncio(vendedor.id, {
      titulo: 'Carne suína para teste',
      categoria: 'SUINA',
      tipoCarne: 'Pernil',
    });

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .get('/admin/anuncios')
      .set('Cookie', cookie);

    expect(resposta.status).toBe(200);

    expect(resposta.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: primeiroAnuncio.id,
          titulo: 'Carne bovina para teste',
        }),
        expect.objectContaining({
          id: segundoAnuncio.id,
          titulo: 'Carne suína para teste',
        }),
      ])
    );
  });

  test('ADM-008: administrador deve excluir anúncio', async () => {
    const admin = await criarUsuario('ADMIN');
    const vendedor = await criarUsuario('VENDEDOR');

    const novoAnuncio = await criarAnuncio(vendedor.id, {
      destaque: true,
    });

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .delete(`/admin/anuncios/${novoAnuncio.id}`)
      .set('Cookie', cookie);

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe(
      'Anúncio removido com sucesso.'
    );

    await novoAnuncio.reload();

    expect(novoAnuncio.status).toBe('EXCLUIDO');
    expect(novoAnuncio.destaque).toBe(false);
  });

  test('ADM-009: deve retornar 404 ao excluir anúncio inexistente', async () => {
    const admin = await criarUsuario('ADMIN');
    const cookie = await autenticarUsuario(admin.email);

    const idInexistente = crypto.randomUUID();

    const resposta = await request(app)
      .delete(`/admin/anuncios/${idInexistente}`)
      .set('Cookie', cookie);

    expect(resposta.status).toBe(404);
    expect(resposta.body.message).toBe('Anúncio não encontrado.');
  });

  test('ADM-010: deve impedir comprador de excluir anúncio', async () => {
    const comprador = await criarUsuario('COMPRADOR');
    const vendedor = await criarUsuario('VENDEDOR');

    const novoAnuncio = await criarAnuncio(vendedor.id);

    const cookie = await autenticarUsuario(comprador.email);

    const resposta = await request(app)
      .delete(`/admin/anuncios/${novoAnuncio.id}`)
      .set('Cookie', cookie);

    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toBe(
      'Acesso permitido apenas para administradores.'
    );

    await novoAnuncio.reload();

    expect(novoAnuncio.status).toBe('ATIVO');
  });

  test('ADM-011: administrador deve listar banners', async () => {
    const admin = await criarUsuario('ADMIN');

    const primeiroBanner = await criarBanner({
      titulo: 'Banner institucional',
    });

    const segundoBanner = await criarBanner({
      titulo: 'Banner promocional',
    });

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .get('/admin/banners')
      .set('Cookie', cookie);

    expect(resposta.status).toBe(200);

    expect(resposta.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: primeiroBanner.id,
          titulo: 'Banner institucional',
        }),
        expect.objectContaining({
          id: segundoBanner.id,
          titulo: 'Banner promocional',
        }),
      ])
    );
  });

  test('ADM-012: administrador deve cadastrar banner com imagem', async () => {
    const admin = await criarUsuario('ADMIN');
    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .post('/admin/banners')
      .set('Cookie', cookie)
      .field('titulo', 'Novo banner institucional')
      .field('link', 'https://easymeat.com')
      .attach(
        'imagem',
        Buffer.from('imagem fictícia para teste'),
        {
          filename: 'banner.png',
          contentType: 'image/png',
        }
      );

    expect(resposta.status).toBe(201);
    expect(resposta.body.titulo).toBe('Novo banner institucional');
    expect(resposta.body.imagem).toBe(
      'https://teste.easymeat.com/banner-teste.jpg'
    );

    bannersCriados.push(resposta.body.id);

    const bannerSalvo = await banner.findByPk(resposta.body.id);

    expect(bannerSalvo).not.toBeNull();
    expect(bannerSalvo.titulo).toBe('Novo banner institucional');
    expect(bannerSalvo.imagemPublicId).toBe(
      'easymeat-test/banner-teste'
    );
  });

  test('ADM-013: deve rejeitar cadastro de banner sem imagem', async () => {
    const admin = await criarUsuario('ADMIN');
    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .post('/admin/banners')
      .set('Cookie', cookie)
      .field('titulo', 'Banner sem imagem');

    expect(resposta.status).toBe(400);
    expect(resposta.body.message).toBe(
      'A imagem do banner é obrigatória.'
    );
  });

  test('ADM-014: administrador deve atualizar banner com nova imagem', async () => {
    const admin = await criarUsuario('ADMIN');

    const bannerOriginal = await criarBanner({
      titulo: 'Banner original',
    });

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .put(`/admin/banners/${bannerOriginal.id}`)
      .set('Cookie', cookie)
      .field('titulo', 'Banner atualizado')
      .attach(
        'imagem',
        Buffer.from('nova imagem fictícia para teste'),
        {
          filename: 'banner-atualizado.png',
          contentType: 'image/png',
        }
      );

    expect(resposta.status).toBe(200);
    expect(resposta.body.titulo).toBe('Banner atualizado');
    expect(resposta.body.imagem).toBe(
      'https://teste.easymeat.com/banner-teste.jpg'
    );

    await bannerOriginal.reload();

    expect(bannerOriginal.titulo).toBe('Banner atualizado');
    expect(bannerOriginal.imagem).toBe(
      'https://teste.easymeat.com/banner-teste.jpg'
    );
    expect(bannerOriginal.imagemPublicId).toBe(
      'easymeat-test/banner-teste'
    );
  });

  test('ADM-015: administrador deve excluir banner', async () => {
    const admin = await criarUsuario('ADMIN');

    const bannerCriado = await criarBanner();

    const cookie = await autenticarUsuario(admin.email);

    const resposta = await request(app)
      .delete(`/admin/banners/${bannerCriado.id}`)
      .set('Cookie', cookie);

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toBe(
      'Banner removido com sucesso.'
    );

    const bannerExcluido = await banner.findByPk(bannerCriado.id);

    expect(bannerExcluido).toBeNull();
  });

  test('ADM-016: deve retornar 404 ao excluir banner inexistente', async () => {
    const admin = await criarUsuario('ADMIN');
    const cookie = await autenticarUsuario(admin.email);

    const idInexistente = crypto.randomUUID();

    const resposta = await request(app)
      .delete(`/admin/banners/${idInexistente}`)
      .set('Cookie', cookie);

    expect(resposta.status).toBe(404);
  });

});
