const env = require('./env');

module.exports = {
  development: env.banco,
  test: env.banco,
  production: env.banco,
};
