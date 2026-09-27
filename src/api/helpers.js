const { validationResult } = require('express-validator');

function validarRequisicao(req, res, next) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(422).json({
      message: 'Dados inválidos.',
      errors: erros.array(),
    });
  }

  return next();
}

function tratarErro(res, erro) {
  return res.status(erro.status || 500).json({
    message: erro.message || 'Erro interno do servidor.',
  });
}

module.exports = {
  validarRequisicao,
  tratarErro,
};
