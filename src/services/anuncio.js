const { Op } = require('sequelize');
const { uploadImagem, removerImagem } = require('../config/cloudinary');
const { criarErro, serializarAnuncio, toBoolean, toNumber } = require('./utils');

class AnuncioServico {
  constructor(AnuncioModel, dependencias = {}) {
    this.anuncio = AnuncioModel;
    this.anuncioImagem = dependencias.anuncioImagem;
    this.usuario = dependencias.usuario;
  }

  montarInclude() {
    return [
      {
        model: this.anuncioImagem,
        as: 'imagensAnuncio',
      },
      {
        model: this.usuario,
        as: 'vendedor',
        attributes: ['id', 'nome', 'telefone', 'cidade', 'estado', 'foto', 'tipoUsuario'],
      },
    ];
  }

  async listar(filtros = {}) {
    const pagina = Math.max(toNumber(filtros.pagina, 1), 1);
    const limite = Math.max(Math.min(toNumber(filtros.limite, 12), 100), 1);
    const offset = (pagina - 1) * limite;

    const where = {
      status: { [Op.ne]: 'EXCLUIDO' },
    };

    if (filtros.categoria) where.categoria = filtros.categoria;
    if (filtros.cidade) where.cidade = { [Op.iLike]: `%${filtros.cidade}%` };
    if (filtros.estado) where.estado = String(filtros.estado).toUpperCase();
    if (filtros.precoMin) where.preco = { ...(where.preco || {}), [Op.gte]: Number(filtros.precoMin) };
    if (filtros.precoMax) where.preco = { ...(where.preco || {}), [Op.lte]: Number(filtros.precoMax) };
    if (filtros.destaque !== undefined && filtros.destaque !== '') {
      where.destaque = toBoolean(filtros.destaque);
    }
    if (filtros.busca) {
      where[Op.or] = [
        { titulo: { [Op.iLike]: `%${filtros.busca}%` } },
        { descricao: { [Op.iLike]: `%${filtros.busca}%` } },
        { tipoCarne: { [Op.iLike]: `%${filtros.busca}%` } },
      ];
    }

    const order = [['criadoEm', 'DESC']];
    switch (filtros.ordenacao) {
      case 'destaque':
        order.unshift(['destaque', 'DESC']);
        break;
      case 'menor-preco':
        order.unshift(['preco', 'ASC']);
        break;
      case 'maior-preco':
        order.unshift(['preco', 'DESC']);
        break;
      default:
        order.unshift(['destaque', 'DESC']);
        break;
    }

    const { rows, count } = await this.anuncio.findAndCountAll({
      where,
      include: this.montarInclude(),
      order,
      offset,
      limit: limite,
      distinct: true,
    });

    return {
      items: rows.map((item) => serializarAnuncio(item)),
      total: count,
      pagina,
      limite,
      totalPaginas: Math.ceil(count / limite),
    };
  }

  async listarDestaques(limite = 6) {
    const anuncios = await this.anuncio.findAll({
      where: {
        status: 'ATIVO',
        destaque: true,
      },
      include: this.montarInclude(),
      order: [
        ['criadoEm', 'DESC'],
      ],
      limit: Math.max(Math.min(Number(limite) || 6, 20), 1),
    });

    return anuncios.map((item) => serializarAnuncio(item));
  }

  async buscarPorId(id, opcoes = {}) {
    const anuncio = await this.anuncio.findByPk(id, {
      include: this.montarInclude(),
    });

    if (!anuncio || anuncio.status === 'EXCLUIDO') {
      throw criarErro('Anúncio não encontrado.', 404);
    }

    if (opcoes.incrementarVisualizacao) {
      anuncio.visualizacoes += 1;
      await anuncio.save();
      await anuncio.reload({ include: this.montarInclude() });
    }

    return serializarAnuncio(anuncio);
  }

  async criar(usuarioId, dados, arquivos = []) {
    const usuario = await this.usuario.findByPk(usuarioId);
    if (!usuario) {
      throw criarErro('Usuário não encontrado.', 404);
    }

    const anuncio = await this.anuncio.create({
      usuarioId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      categoria: dados.categoria,
      tipoCarne: dados.tipoCarne,
      quantidade: Number(dados.quantidade),
      preco: Number(dados.preco),
      cidade: dados.cidade,
      estado: String(dados.estado || '').toUpperCase(),
      status: dados.status || 'ATIVO',
      destaque: toBoolean(dados.destaque || false),
    });

    await this.salvarImagens(anuncio.id, arquivos);

    return this.buscarPorId(anuncio.id);
  }

  async atualizar(id, usuarioId, dados, arquivos = [], opcoes = {}) {
    const anuncio = await this.anuncio.findByPk(id, {
      include: [
        {
          model: this.anuncioImagem,
          as: 'imagensAnuncio',
        },
      ],
    });

    if (!anuncio || anuncio.status === 'EXCLUIDO') {
      throw criarErro('Anúncio não encontrado.', 404);
    }

    if (!opcoes.admin && anuncio.usuarioId !== usuarioId) {
      throw criarErro('Você não tem permissão para editar este anúncio.', 403);
    }

    const camposPermitidos = ['titulo', 'descricao', 'categoria', 'tipoCarne', 'quantidade', 'preco', 'cidade', 'estado', 'status'];
    camposPermitidos.forEach((campo) => {
      if (dados[campo] !== undefined) {
        anuncio[campo] = ['quantidade', 'preco'].includes(campo)
          ? Number(dados[campo])
          : campo === 'estado'
            ? String(dados[campo]).toUpperCase()
            : dados[campo];
      }
    });

    if (dados.destaque !== undefined) {
      anuncio.destaque = toBoolean(dados.destaque);
    }

    await anuncio.save();

    if (arquivos.length > 0) {
      await this.removerImagensDoAnuncio(anuncio.imagensAnuncio || []);
      await this.anuncioImagem.destroy({ where: { anuncioId: anuncio.id } });
      await this.salvarImagens(anuncio.id, arquivos);
    }

    return this.buscarPorId(anuncio.id);
  }

  async excluir(id, usuarioId, opcoes = {}) {
    const anuncio = await this.anuncio.findByPk(id);

    if (!anuncio || anuncio.status === 'EXCLUIDO') {
      throw criarErro('Anúncio não encontrado.', 404);
    }

    if (!opcoes.admin && anuncio.usuarioId !== usuarioId) {
      throw criarErro('Você não tem permissão para excluir este anúncio.', 403);
    }

    anuncio.status = 'EXCLUIDO';
    anuncio.destaque = false;
    await anuncio.save();

    return { message: 'Anúncio removido com sucesso.' };
  }

  async ativarDestaque(id, usuarioId, valor, opcoes = {}) {
    const anuncio = await this.anuncio.findByPk(id);
    if (!anuncio || anuncio.status === 'EXCLUIDO') {
      throw criarErro('Anúncio não encontrado.', 404);
    }

    if (!opcoes.admin && anuncio.usuarioId !== usuarioId) {
      throw criarErro('Você não tem permissão para alterar o destaque deste anúncio.', 403);
    }

    anuncio.destaque = valor !== undefined ? toBoolean(valor) : true;
    await anuncio.save();

    return {
      message: anuncio.destaque ? 'Destaque ativado com sucesso.' : 'Destaque removido com sucesso.',
      anuncio: await this.buscarPorId(id),
    };
  }

  async listarTodos() {
    const anuncios = await this.anuncio.findAll({
      where: {
        status: { [Op.ne]: 'EXCLUIDO' },
      },
      include: this.montarInclude(),
      order: [['criadoEm', 'DESC']],
    });

    return anuncios.map((item) => serializarAnuncio(item));
  }

  async salvarImagens(anuncioId, arquivos = []) {
    for (const [indice, arquivo] of arquivos.entries()) {
      const upload = await uploadImagem(arquivo.path, 'anuncios');
      await this.anuncioImagem.create({
        anuncioId,
        url: upload.url,
        publicId: upload.publicId,
        ordem: indice,
      });
    }
  }

  async removerImagensDoAnuncio(imagens = []) {
    for (const imagem of imagens) {
      await removerImagem(imagem.publicId, imagem.url).catch(() => null);
    }
  }
}

module.exports = AnuncioServico;
