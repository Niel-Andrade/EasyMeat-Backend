const express = require('express');
const { body } = require('express-validator');
const env = require('../config/env');
const { usuario, recuperacaoSenha } = require('../models');
const AuthServico = require('../services/auth');
const { validarRequisicao, tratarErro } = require('./helpers');

const rota = express.Router();
const authServico = new AuthServico(usuario, recuperacaoSenha);

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.node_env === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function validarCpfRegra(value, { req }) {
  if (req.body.tipoUsuario !== 'VENDEDOR') return true;
  // Vendedor: CPF é obrigatório e deve estar em formato válido (11 dígitos)
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits || digits.length !== 11) {
    throw new Error('CPF é obrigatório para vendedores.');
  }
  if (/^(\d)\1+$/.test(digits)) {
    throw new Error('CPF inválido.');
  }
  const calc = (slice) => {
    let soma = 0;
    for (let i = 0; i < slice.length; i++) {
      soma += Number(slice[i]) * (slice.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  if (calc(digits.slice(0, 9)) !== Number(digits[9])) {
    throw new Error('CPF inválido.');
  }
  if (calc(digits.slice(0, 10)) !== Number(digits[10])) {
    throw new Error('CPF inválido.');
  }
  return true;
}

rota.post(
  '/register',
  [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório.'),
    body('email').trim().isEmail().withMessage('E-mail inválido.'),
    body('senha').isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres.'),
    body('telefone').trim().isLength({ min: 10 }).withMessage('Telefone inválido.'),
    body('cidade').trim().notEmpty().withMessage('Cidade é obrigatória.'),
    body('estado').trim().isLength({ min: 2, max: 2 }).withMessage('Estado inválido.'),
    body('tipoUsuario').isIn(['COMPRADOR', 'VENDEDOR']).withMessage('Tipo de usuário inválido.'),
    body('cpf').custom(validarCpfRegra),
    body('cep').optional({ checkFalsy: true }).isLength({ min: 8, max: 9 }).withMessage('CEP inválido.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await authServico.cadastrar(req.body);
      res.cookie(env.jwt_cookie_nome, resposta.token, cookieOptions);
      return res.status(201).json({
        success: true,
        usuario: resposta.usuario,
      });
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('E-mail inválido.'),
    body('senha').notEmpty().withMessage('Senha é obrigatória.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await authServico.login(req.body.email, req.body.senha);
      res.cookie(env.jwt_cookie_nome, resposta.token, cookieOptions);
      return res.status(200).json({
        success: true,
        usuario: resposta.usuario,
      });
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.post('/logout', async (_req, res) => {
  res.clearCookie(env.jwt_cookie_nome, cookieOptions);
  return res.status(200).json({ success: true, message: 'Logout realizado com sucesso.' });
});

rota.get('/me', async (req, res) => {
  try {
    const resposta = await authServico.obterUsuarioAutenticado(req.usuario.id);
    return res.status(200).json({ usuario: resposta });
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

rota.post(
  '/recuperar-senha',
  [body('email').trim().isEmail().withMessage('E-mail inválido.')],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await authServico.solicitarRecuperacaoSenha(req.body.email);
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

rota.post(
  '/redefinir-senha',
  [
    body('token').trim().notEmpty().withMessage('Token é obrigatório.'),
    body('novaSenha').isLength({ min: 6 }).withMessage('A nova senha deve ter no mínimo 6 caracteres.'),
  ],
  validarRequisicao,
  async (req, res) => {
    try {
      const resposta = await authServico.redefinirSenha(req.body.token, req.body.novaSenha);
      return res.status(200).json(resposta);
    } catch (erro) {
      return tratarErro(res, erro);
    }
  }
);

module.exports = rota;
