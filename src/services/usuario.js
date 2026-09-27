const bcrypt = require('bcrypt');
const { uploadImagem, removerImagem } = require('../config/cloudinary');
const env = require('../config/env');
const { criarErro, serializarUsuario, serializarAnuncio } = require('./utils');

class UsuarioServico {
  constructor(UsuarioModel, dependencias = {}) {
    this.usuario = UsuarioModel;
    this.anuncio = dependencias.anuncio;
    this.anuncioImagem = dependencias.anuncioImagem;
  }

  async buscarPerfil(usuarioId) {
    const usuario = await this.usuario.findByPk(usuarioId);
    if (!usuario) {
      throw criarErro('Usuário não encontrado.', 404);
    }

    return serializarUsuario(usuario);
  }

  // 5.3 — Exige senha atual; se inválida, não altera nada.
  async atualizarPerfil(usuarioId, dados) {
    const usuario = await this.usuario.findByPk(usuarioId);
    if (!usuario) {
      throw criarErro('Usuário não encontrado.', 404);
    }

    if (!dados.senhaAtual) {
      throw criarErro('Senha atual é obrigatória para atualizar o perfil.', 400);
    }

    const senhaCorreta = bcrypt.compareSync(String(dados.senhaAtual), usuario.senha);
    if (!senhaCorreta) {
      throw criarErro('Senha atual incorreta. Os dados não foram alterados.', 400);
    }

    if (dados.email && dados.email !== usuario.email) {
      const emailExistente = await this.usuario.findOne({ where: { email: String(dados.email).trim().toLowerCase() } });
      if (emailExistente && emailExistente.id !== usuario.id) {
        throw criarErro('Este e-mail já está em uso por outra conta.', 409);
      }
      usuario.email = String(dados.email).trim().toLowerCase();
    }

    if (dados.cpf && dados.cpf !== usuario.cpf) {
      // Vendedor pode fornecer/alterar CPF desde que válido
      const digits = String(dados.cpf).replace(/\D/g, '');
      if (digits.length !== 11) {
        throw criarErro('CPF inválido.', 400);
      }
      if (/^(\d)\1+$/.test(digits)) {
        throw criarErro('CPF inválido.', 400);
      }
      const calc = (slice) => {
        let soma = 0;
        for (let i = 0; i < slice.length; i++) {
          soma += Number(slice[i]) * (slice.length + 1 - i);
        }
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
      };
      if (calc(digits.slice(0, 9)) !== Number(digits[9]) ||
          calc(digits.slice(0, 10)) !== Number(digits[10])) {
        throw criarErro('CPF inválido.', 400);
      }
      const cpfExistente = await this.usuario.findOne({ where: { cpf: digits } });
      if (cpfExistente && cpfExistente.id !== usuario.id) {
        throw criarErro('Este CPF já está em uso por outra conta.', 409);
      }
      usuario.cpf = digits;
    }

    if (dados.cep !== undefined) {
      usuario.cep = dados.cep ? String(dados.cep).replace(/\D/g, '') : null;
    }

    usuario.nome = dados.nome;
    usuario.telefone = dados.telefone;
    usuario.cidade = dados.cidade;
    usuario.estado = String(dados.estado || '').toUpperCase();

    await usuario.save();

    return serializarUsuario(usuario);
  }

  async alterarSenha(usuarioId, senhaAtual, novaSenha) {
    const usuario = await this.usuario.findByPk(usuarioId);
    if (!usuario) {
      throw criarErro('Usuário não encontrado.', 404);
    }

    const senhaCorreta = bcrypt.compareSync(senhaAtual, usuario.senha);
    if (!senhaCorreta) {
      throw criarErro('A senha atual está incorreta.', 400);
    }

    usuario.senha = bcrypt.hashSync(novaSenha, env.bcrypt_salt);
    await usuario.save();

    return { message: 'Senha alterada com sucesso.' };
  }

  async atualizarFotoPerfil(usuarioId, arquivo) {
    const usuario = await this.usuario.findByPk(usuarioId);
    if (!usuario) {
      throw criarErro('Usuário não encontrado.', 404);
    }

    if (!arquivo) {
      throw criarErro('Nenhuma imagem foi enviada.', 400);
    }

    const upload = await uploadImagem(arquivo.path, 'perfil');

    if (usuario.foto) {
      await removerImagem(usuario.fotoPublicId, usuario.foto).catch(() => null);
    }

    usuario.foto = upload.url;
    usuario.fotoPublicId = upload.publicId;
    await usuario.save();

    return {
      message: 'Foto de perfil atualizada com sucesso.',
      foto: usuario.foto,
      usuario: serializarUsuario(usuario),
    };
  }

  async obterFotoPerfil(usuarioId) {
    const usuario = await this.usuario.findByPk(usuarioId);
    if (!usuario) {
      throw criarErro('Usuário não encontrado.', 404);
    }

    return {
      foto: usuario.foto || null,
    };
  }

  async listarMeusAnuncios(usuarioId) {
    const anuncios = await this.anuncio.findAll({
      where: {
        usuarioId,
      },
      include: [
        {
          model: this.anuncioImagem,
          as: 'imagensAnuncio',
        },
      ],
      order: [['criadoEm', 'DESC']],
    });

    return anuncios
      .filter((item) => item.status !== 'EXCLUIDO')
      .map((item) => serializarAnuncio(item));
  }
}

module.exports = UsuarioServico;
