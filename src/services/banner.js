const { uploadImagem, removerImagem } = require('../config/cloudinary');
const { criarErro, serializarBanner, toBoolean } = require('./utils');

class BannerServico {
  constructor(BannerModel) {
    this.banner = BannerModel;
  }

  async listarAtivos() {
    const banners = await this.banner.findAll({
      where: { ativo: true },
      order: [['criadoEm', 'DESC']],
    });

    return banners.map((item) => serializarBanner(item));
  }

  async listarTodos() {
    const banners = await this.banner.findAll({
      order: [['criadoEm', 'DESC']],
    });

    return banners.map((item) => serializarBanner(item));
  }

  async criar(dados, arquivo) {
    if (!arquivo) {
      throw criarErro('A imagem do banner é obrigatória.', 400);
    }

    const upload = await uploadImagem(arquivo.path, 'banners');

    const banner = await this.banner.create({
      titulo: dados.titulo,
      link: dados.link || null,
      ativo: toBoolean(dados.ativo !== undefined ? dados.ativo : true),
      imagem: upload.url,
      imagemPublicId: upload.publicId,
    });

    return serializarBanner(banner);
  }

  async atualizar(id, dados, arquivo) {
    const banner = await this.banner.findByPk(id);
    if (!banner) {
      throw criarErro('Banner não encontrado.', 404);
    }

    if (dados.titulo !== undefined) banner.titulo = dados.titulo;
    if (dados.link !== undefined) banner.link = dados.link || null;
    if (dados.ativo !== undefined) banner.ativo = toBoolean(dados.ativo);

    if (arquivo) {
      const upload = await uploadImagem(arquivo.path, 'banners');
      await removerImagem(banner.imagemPublicId, banner.imagem).catch(() => null);
      banner.imagem = upload.url;
      banner.imagemPublicId = upload.publicId;
    }

    await banner.save();
    return serializarBanner(banner);
  }

  async excluir(id) {
    const banner = await this.banner.findByPk(id);
    if (!banner) {
      throw criarErro('Banner não encontrado.', 404);
    }

    await removerImagem(banner.imagemPublicId, banner.imagem).catch(() => null);
    await banner.destroy();

    return { message: 'Banner removido com sucesso.' };
  }
}

module.exports = BannerServico;
