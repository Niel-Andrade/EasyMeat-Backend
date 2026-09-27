const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const env = require('../config/env');
const { criarErro, serializarUsuario } = require('./utils');

// 3.2 — Validação de CPF no back-end (formato + dígitos verificadores)
function validarCpfNumerico(cpf) {
  if (!cpf || typeof cpf !== 'string') return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const calc = (slice) => {
    let soma = 0;
    for (let i = 0; i < slice.length; i++) {
      soma += Number(slice[i]) * (slice.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(digits.slice(0, 9)) === Number(digits[9]) &&
         calc(digits.slice(0, 10)) === Number(digits[10]);
}

class AuthServico {
  constructor(UsuarioModel, RecuperacaoSenhaModel) {
    this.usuario = UsuarioModel;
    this.recuperacaoSenha = RecuperacaoSenhaModel;
  }

  gerarToken(usuario) {
    return jwt.sign(
      {
        sub: usuario.id,
        email: usuario.email,
        tipoUsuario: usuario.tipoUsuario,
      },
      env.jwt_secret,
      {
        expiresIn: env.jwt_tempo,
      }
    );
  }

  async cadastrar(dados) {
    const email = String(dados.email || '').trim().toLowerCase();

    const usuarioExistente = await this.usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      throw criarErro('Já existe uma conta cadastrada com este e-mail.', 409);
    }

    // 3.2 — Validação obrigatória de CPF para VENDEDOR
    let cpfNormalizado = null;
    if (dados.tipoUsuario === 'VENDEDOR') {
      if (!dados.cpf || !validarCpfNumerico(dados.cpf)) {
        throw criarErro('CPF inválido ou não informado. Vendedores precisam informar um CPF válido.', 400);
      }
      cpfNormalizado = String(dados.cpf).replace(/\D/g, '');

      // Garante unicidade do CPF entre vendedores
      const cpfExistente = await this.usuario.findOne({
        where: { cpf: cpfNormalizado },
      });
      if (cpfExistente) {
        throw criarErro('Já existe uma conta cadastrada com este CPF.', 409);
      }
    }

    const senhaHash = bcrypt.hashSync(dados.senha, env.bcrypt_salt);

    const usuarioCriado = await this.usuario.create({
      nome: dados.nome,
      email,
      senha: senhaHash,
      telefone: dados.telefone,
      cidade: dados.cidade,
      estado: String(dados.estado || '').toUpperCase(),
      cpf: cpfNormalizado,
      cep: dados.cep ? String(dados.cep).replace(/\D/g, '') : null,
      tipoUsuario: dados.tipoUsuario || 'COMPRADOR',
      status: 'ATIVO',
      plano: 'free',
      premium: false,
    });

    return {
      usuario: serializarUsuario(usuarioCriado),
      token: this.gerarToken(usuarioCriado),
    };
  }

  async login(email, senha) {
    const usuario = await this.usuario.findOne({
      where: { email: String(email || '').trim().toLowerCase() },
    });

    if (!usuario) {
      throw criarErro('Credenciais inválidas.', 401);
    }

    if (usuario.status === 'BLOQUEADO') {
      throw criarErro('Sua conta está bloqueada. Entre em contato com o suporte.', 403);
    }

    const senhaCorreta = bcrypt.compareSync(senha, usuario.senha);
    if (!senhaCorreta) {
      throw criarErro('Credenciais inválidas.', 401);
    }

    usuario.ultimoLoginEm = new Date();
    await usuario.save();

    return {
      usuario: serializarUsuario(usuario),
      token: this.gerarToken(usuario),
    };
  }

  async obterUsuarioAutenticado(usuarioId) {
    const usuario = await this.usuario.findByPk(usuarioId);

    if (!usuario || usuario.status !== 'ATIVO') {
      throw criarErro('Usuário não autenticado.', 401);
    }

    return serializarUsuario(usuario);
  }

  async solicitarRecuperacaoSenha(email) {
    const usuario = await this.usuario.findOne({
      where: { email: String(email || '').trim().toLowerCase() },
    });

    const respostaPadrao = {
      message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação em instantes.',
    };

    if (!usuario) {
      return respostaPadrao;
    }

    await this.recuperacaoSenha.destroy({
      where: {
        usuarioId: usuario.id,
        utilizadoEm: { [Op.is]: null },
      },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.recuperacaoSenha.create({
      usuarioId: usuario.id,
      tokenHash,
      expiraEm: new Date(Date.now() + 1000 * 60 * 60),
    });

    if (env.node_env !== 'production') {
      return {
        ...respostaPadrao,
        token,
        linkRecuperacao: `${env.cliente_url}/redefinir-senha/${token}`,
      };
    }

    return respostaPadrao;
  }

  async redefinirSenha(token, novaSenha) {
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const solicitacao = await this.recuperacaoSenha.findOne({
      where: {
        tokenHash,
        utilizadoEm: { [Op.is]: null },
        expiraEm: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: this.usuario,
          as: 'usuario',
        },
      ],
    });

    if (!solicitacao || !solicitacao.usuario) {
      throw criarErro('Token de recuperação inválido ou expirado.', 400);
    }

    solicitacao.usuario.senha = bcrypt.hashSync(novaSenha, env.bcrypt_salt);
    await solicitacao.usuario.save();

    solicitacao.utilizadoEm = new Date();
    await solicitacao.save();

    return { message: 'Senha redefinida com sucesso.' };
  }
}

module.exports = AuthServico;
