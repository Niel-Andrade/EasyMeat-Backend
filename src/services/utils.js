function criarErro(message, status = 400) {
  const erro = new Error(message);
  erro.status = status;
  return erro;
}

function toNumber(valor, padrao = 0) {
  if (valor === null || valor === undefined || valor === '') return padrao;
  const numero = Number(valor);
  return Number.isNaN(numero) ? padrao : numero;
}

function toBoolean(valor) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'string') {
    return ['true', '1', 'sim', 'yes'].includes(valor.toLowerCase());
  }
  return Boolean(valor);
}

function serializarUsuario(usuario) {
  if (!usuario) return null;

  const origem = usuario.toJSON ? usuario.toJSON() : usuario;

  return {
    id: origem.id,
    nome: origem.nome,
    email: origem.email,
    telefone: origem.telefone,
    cidade: origem.cidade,
    estado: origem.estado,
    tipoUsuario: origem.tipoUsuario,
    status: origem.status,
    foto: origem.foto || null,
    plano: origem.plano,
    premium: origem.premium,
    ultimoLoginEm: origem.ultimoLoginEm,
    criadoEm: origem.criadoEm,
    atualizadoEm: origem.atualizadoEm,
  };
}

function serializarUsuarioPublico(usuario) {
  const base = serializarUsuario(usuario);
  if (!base) return null;

  return {
    id: base.id,
    nome: base.nome,
    telefone: base.telefone,
    cidade: base.cidade,
    estado: base.estado,
    foto: base.foto,
    tipoUsuario: base.tipoUsuario,
  };
}

function serializarAnuncio(anuncio) {
  if (!anuncio) return null;

  const origem = anuncio.toJSON ? anuncio.toJSON() : anuncio;
  const imagens = (origem.imagensAnuncio || origem.imagens || [])
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map((imagem) => imagem.url || imagem);

  return {
    id: origem.id,
    titulo: origem.titulo,
    descricao: origem.descricao,
    categoria: origem.categoria,
    tipoCarne: origem.tipoCarne,
    quantidade: origem.quantidade !== undefined && origem.quantidade !== null ? Number(origem.quantidade) : null,
    preco: origem.preco !== undefined && origem.preco !== null ? Number(origem.preco) : null,
    cidade: origem.cidade,
    estado: origem.estado,
    status: origem.status,
    destaque: Boolean(origem.destaque),
    visualizacoes: origem.visualizacoes || 0,
    imagens,
    imagem: imagens[0] || null,
    criadoEm: origem.criadoEm,
    atualizadoEm: origem.atualizadoEm,
    vendedor: serializarUsuarioPublico(origem.vendedor),
  };
}

function serializarBanner(banner) {
  if (!banner) return null;

  const origem = banner.toJSON ? banner.toJSON() : banner;

  return {
    id: origem.id,
    titulo: origem.titulo,
    imagem: origem.imagem || null,
    link: origem.link || null,
    ativo: Boolean(origem.ativo),
    criadoEm: origem.criadoEm,
    atualizadoEm: origem.atualizadoEm,
  };
}

module.exports = {
  criarErro,
  toNumber,
  toBoolean,
  serializarUsuario,
  serializarUsuarioPublico,
  serializarAnuncio,
  serializarBanner,
};
