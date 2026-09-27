const { criarErro, serializarUsuario } = require('./utils');

class AdminServico {
  constructor(UsuarioModel, dependencias = {}) {
    this.usuario = UsuarioModel;
    this.anuncioServico = dependencias.anuncioServico;
    this.bannerServico = dependencias.bannerServico;
  }

  async listarUsuarios() {
    const usuarios = await this.usuario.findAll({
      order: [['criadoEm', 'DESC']],
    });

    return usuarios.map((item) => serializarUsuario(item));
  }

  async alterarStatusUsuario(id, status) {
    const usuario = await this.usuario.findByPk(id);
    if (!usuario) {
      throw criarErro('Usuário não encontrado.', 404);
    }

    usuario.status = status;
    await usuario.save();

    return {
      message: 'Status do usuário atualizado com sucesso.',
      usuario: serializarUsuario(usuario),
    };
  }

  async listarAnuncios() {
    return this.anuncioServico.listarTodos();
  }

  async excluirAnuncio(id) {
    return this.anuncioServico.excluir(id, null, { admin: true });
  }

  async listarBanners() {
    return this.bannerServico.listarTodos();
  }

  async criarBanner(dados, arquivo) {
    return this.bannerServico.criar(dados, arquivo);
  }

  async atualizarBanner(id, dados, arquivo) {
    return this.bannerServico.atualizar(id, dados, arquivo);
  }

  async excluirBanner(id) {
    return this.bannerServico.excluir(id);
  }
}

module.exports = AdminServico;
