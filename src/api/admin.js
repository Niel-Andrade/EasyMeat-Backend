const express = require('express');
const { body } = require('express-validator');
const upload = require('../middleware/uploadConfig');
const { exigirAdmin } = require('../middleware/autenticacao');
const { usuario, anuncio, anuncioImagem, banner } = require('../models');
const AnuncioServico = require('../services/anuncio');
const BannerServico = require('../services/banner');
const AdminServico = require('../services/admin');
const { validarRequisicao, tratarErro } = require('./helpers');

const rota = express.Router();
const anuncioServico = new AnuncioServico(anuncio, { anuncioImagem, usuario });
const bannerServico = new BannerServico(banner);
const adminServico = new AdminServico(usuario, { anuncioServico, bannerServico });

rota.use(exigirAdmin);

rota.get('/usuarios', async (_req, res) => {
  try {
    const resposta = await adminServico.listarUsuarios();
    return res.status(200).json({ items: resposta });
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.put(
  '/usuarios/:id/status',
  [body('status').isIn(['ATIVO', 'BLOQUEADO']).withMessage('Status inválido.')],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await adminServico.alterarStatusUsuario(req.params.id,req.body.status,req.usuario.id);
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.get('/anuncios', async (_req, res) => {
  try {
    const resposta = await adminServico.listarAnuncios();
    return res.status(200).json({ items: resposta });
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.delete('/anuncios/:id', async (req, res) => {
  try {
    const resposta = await adminServico.excluirAnuncio(req.params.id);
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.get('/banners', async (_req, res) => {
  try {
    const resposta = await adminServico.listarBanners();
    return res.status(200).json({ items: resposta });
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.post(
  '/banners',
  upload.single('imagem'),
  [body('titulo').trim().notEmpty().withMessage('Título é obrigatório.')],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await adminServico.criarBanner(req.body, req.file);
      return res.status(201).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.put(
  '/banners/:id',
  upload.single('imagem'),
  [body('titulo').optional().trim().notEmpty().withMessage('Título inválido.')],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await adminServico.atualizarBanner(req.params.id, req.body, req.file);
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.delete('/banners/:id', async (req, res) => {
  try {
    const resposta = await adminServico.excluirBanner(req.params.id);
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

module.exports = rota;
