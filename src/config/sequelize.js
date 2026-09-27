const { Sequelize } = require('sequelize');
const bancoDados = require('./bancoDados');
const env = require('./env');

const configuracao = bancoDados[env.node_env] || bancoDados.development;

const sequelize = new Sequelize(
  configuracao.database,
  configuracao.username,
  configuracao.password,
  {
    host: configuracao.host,
    port: configuracao.port,
    dialect: configuracao.dialect,
    logging: configuracao.logging ? console.log : false,
    define: {
      freezeTableName: true,
      underscored: true,
    },
  }
);

module.exports = sequelize;
