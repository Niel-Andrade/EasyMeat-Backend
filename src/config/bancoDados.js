const env = require('./env');

if (
  env.node_env === 'test' &&
  (
    !env.bancoTeste.database ||
    env.bancoTeste.database === env.banco.database
  )
) {
  throw new Error(
    'Configure um banco de dados exclusivo para testes em DB_TEST_NAME.'
  );
}

module.exports = {
  development: env.banco,
  test: env.bancoTeste,
  production: env.banco,
};
