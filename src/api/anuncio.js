const express = require('express');
const { body, query } = require('express-validator');
const upload = require('../middleware/uploadConfig');
const { exigirVendedorOuAdmin } = require('../middleware/autenticacao');
const { anuncio, anuncioImagem, usuario } = require('../models');
const AnuncioServico = require('../services/anuncio');
const { validarRequisicao, tratarErro } = require('./helpers');

const rota = express.Router();
const anuncioServico = new AnuncioServico(anuncio, { anuncioImagem, usuario });

const uploadAnuncio = upload.fields([
  { name: 'imagens', maxCount: 5 },
  { name: 'imagem', maxCount: 1 },
]);

const obterArquivosAnuncio = (req) => {
  if (!req.files) return [];
  const imagens = req.files.imagens || [];
  const imagemUnica = req.files.imagem || [];
  return [...imagens, ...imagemUnica];
};

rota.get(
  '/',
  [
    query('pagina').optional().isInt({ min: 1 }).withMessage('Página inválida.'),
    query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('Limite inválido.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await anuncioServico.listar(req.query);
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.get('/destaques', async (req, res) => {
  try {
    const resposta = await anuncioServico.listarDestaques(req.query.limite || 6);
    return res.status(200).json({ items: resposta });
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.get('/:id', async (req, res) => {
  try {
    const resposta = await anuncioServico.buscarPorId(req.params.id, { incrementarVisualizacao: true });
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.post(
  '/',
  exigirVendedorOuAdmin,
  uploadAnuncio,
  [
    body('titulo').trim().notEmpty().withMessage('Título é obrigatório.'),
    body('descricao').trim().notEmpty().withMessage('Descrição é obrigatória.'),
    body('categoria').isIn(['BOVINA', 'SUINA', 'FRANGO', 'OUTROS']).withMessage('Categoria inválida.'),
    body('tipoCarne').trim().notEmpty().withMessage('Tipo de carne é obrigatório.'),
    body('quantidade').isFloat({ gt: 0 }).withMessage('Quantidade deve ser maior que zero.'),
    body('preco').isFloat({ gt: 0 }).withMessage('Preço deve ser maior que zero.'),
    body('cidade').trim().notEmpty().withMessage('Cidade é obrigatória.'),
    body('estado').trim().isLength({ min: 2, max: 2 }).withMessage('Estado inválido.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await anuncioServico.criar(req.usuario.id, req.body, obterArquivosAnuncio(req));
      return res.status(201).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.put(
  '/:id',
  exigirVendedorOuAdmin,
  uploadAnuncio,
  [
    body('titulo').optional().trim().notEmpty().withMessage('Título inválido.'),
    body('descricao').optional().trim().notEmpty().withMessage('Descrição inválida.'),
    body('categoria').optional().isIn(['BOVINA', 'SUINA', 'FRANGO', 'OUTROS']).withMessage('Categoria inválida.'),
    body('tipoCarne').optional().trim().notEmpty().withMessage('Tipo de carne inválido.'),
    body('quantidade').optional().isFloat({ gt: 0 }).withMessage('Quantidade deve ser maior que zero.'),
    body('preco').optional().isFloat({ gt: 0 }).withMessage('Preço deve ser maior que zero.'),
    body('estado').optional().trim().isLength({ min: 2, max: 2 }).withMessage('Estado inválido.'),
    body('status').optional().isIn(['ATIVO', 'PAUSADO', 'VENDIDO']).withMessage('Status inválido.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await anuncioServico.atualizar(req.params.id, req.usuario.id, req.body, obterArquivosAnuncio(req), {
        admin: req.usuario.tipoUsuario === 'ADMIN',
      });
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.delete('/:id', exigirVendedorOuAdmin, async (req, res) => {
  try {
    const resposta = await anuncioServico.excluir(req.params.id, req.usuario.id, {
      admin: req.usuario.tipoUsuario === 'ADMIN',
    });
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.put('/:id/destaque', exigirVendedorOuAdmin, async (req, res) => {
  try {
    const resposta = await anuncioServico.ativarDestaque(req.params.id, req.usuario.id, req.body?.destaque, {
      admin: req.usuario.tipoUsuario === 'ADMIN',
    });
    return res.status(200).json(resposta);
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

module.exports = rota;
