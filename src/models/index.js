const Sequelize = require('sequelize');
const sequelize = require('../config/sequelize');
const Usuario = require('./usuario');
const Anuncio = require('./anuncio');
const AnuncioImagem = require('./anuncioImagem');
const Banner = require('./banner');
const RecuperacaoSenha = require('./recuperacaoSenha');

const usuario = Usuario(sequelize, Sequelize.DataTypes);
const anuncio = Anuncio(sequelize, Sequelize.DataTypes);
const anuncioImagem = AnuncioImagem(sequelize, Sequelize.DataTypes);
const banner = Banner(sequelize, Sequelize.DataTypes);
const recuperacaoSenha = RecuperacaoSenha(sequelize, Sequelize.DataTypes);

usuario.hasMany(anuncio, {
  foreignKey: 'usuarioId',
  as: 'anuncios',
});

anuncio.belongsTo(usuario, {
  foreignKey: 'usuarioId',
  as: 'vendedor',
});

anuncio.hasMany(anuncioImagem, {
  foreignKey: 'anuncioId',
  as: 'imagensAnuncio',
});

anuncioImagem.belongsTo(anuncio, {
  foreignKey: 'anuncioId',
  as: 'anuncio',
});

usuario.hasMany(recuperacaoSenha, {
  foreignKey: 'usuarioId',
  as: 'tokensRecuperacao',
});

recuperacaoSenha.belongsTo(usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
});

module.exports = {
  sequelize,
  usuario,
  anuncio,
  anuncioImagem,
  banner,
  recuperacaoSenha,
};
