const express = require('express');
const { body } = require('express-validator');
const upload = require('../middleware/uploadConfig');
const { usuario, anuncio, anuncioImagem } = require('../models');
const UsuarioServico = require('../services/usuario');
const { validarRequisicao, tratarErro } = require('./helpers');

const rota = express.Router();
const usuarioServico = new UsuarioServico(usuario, { anuncio, anuncioImagem });

rota.get('/perfil', async (req, res) => {
  try {
    const resposta = await usuarioServico.buscarPerfil(req.usuario.id);
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

// 5.3 — Senha atual obrigatória para alterar dados do perfil (back-end)
rota.put(
  '/perfil',
  [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório.'),
    body('email').trim().isEmail().withMessage('E-mail inválido.'),
    body('telefone').trim().isLength({ min: 10 }).withMessage('Telefone inválido.'),
    body('cidade').trim().notEmpty().withMessage('Cidade é obrigatória.'),
    body('estado').trim().isLength({ min: 2, max: 2 }).withMessage('Estado inválido.'),
    body('senhaAtual').notEmpty().withMessage('Senha atual é obrigatória para confirmar a alteração.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await usuarioServico.atualizarPerfil(req.usuario.id, req.body);
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.put(
  '/perfil/senha',
  [
    body('senhaAtual').notEmpty().withMessage('Senha atual é obrigatória.'),
    body('novaSenha').isLength({ min: 6 }).withMessage('A nova senha deve ter no mínimo 6 caracteres.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await usuarioServico.alterarSenha(req.usuario.id, req.body.senhaAtual, req.body.novaSenha);
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.get('/perfil/foto', async (req, res) => {
  try {
    const resposta = await usuarioServico.obterFotoPerfil(req.usuario.id);
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

const uploadFotoMiddleware = [upload.single('foto')];

rota.post('/perfil/foto', uploadFotoMiddleware, async (req, res) => {
  try {
    const resposta = await usuarioServico.atualizarFotoPerfil(req.usuario.id, req.file);
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.put('/perfil/foto', uploadFotoMiddleware, async (req, res) => {
  try {
    const resposta = await usuarioServico.atualizarFotoPerfil(req.usuario.id, req.file);
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.get('/anuncios', async (req, res) => {
  try {
    const resposta = await usuarioServico.listarMeusAnuncios(req.usuario.id);
    return res.status(200).json({ items: resposta });
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

module.exports = rota;
