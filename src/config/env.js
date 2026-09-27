const dotenv = require('dotenv');

dotenv.config();

const toBoolean = (valor, padrao = false) => {
  if (valor === undefined) return padrao;
  return ['true', '1', 'sim', 'yes'].includes(String(valor).toLowerCase());
};

const toNumber = (valor, padrao) => {
  const numero = Number(valor);
  return Number.isNaN(numero) ? padrao : numero;
};

const env = {
  porta: toNumber(process.env.PORTA, 4000),
  node_env: process.env.NODE_ENV || 'development',
  api_url: process.env.API_URL || 'http://localhost:4000',
  cliente_url: process.env.CLIENTE_URL || 'http://localhost:5173',
  jwt_secret: process.env.JWT_SECRET || 'easy-meat-secret',
  jwt_tempo: process.env.JWT_TEMPO || '7d',
  jwt_cookie_nome: process.env.JWT_COOKIE_NOME || 'easymeat_token',
  bcrypt_salt: toNumber(process.env.BCRYPT_SALT, 10),
  upload_limite_mb: toNumber(process.env.UPLOAD_LIMITE_MB, 8),
  rotas_publicas: (process.env.ROTAS_PUBLICAS || '')
    .split(',')
    .map((rota) => rota.trim())
    .filter(Boolean),
  banco: {
    host: process.env.DB_HOST || 'localhost',
    port: toNumber(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'easy_meat',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: toBoolean(process.env.DB_LOGGING, false),
  },
  default_admin: {
    nome: process.env.DEFAULT_ADMIN_NOME || '',
    email: process.env.DEFAULT_ADMIN_EMAIL || '',
    senha: process.env.DEFAULT_ADMIN_SENHA || '',
    telefone: process.env.DEFAULT_ADMIN_TELEFONE || '',
    cidade: process.env.DEFAULT_ADMIN_CIDADE || '',
    estado: process.env.DEFAULT_ADMIN_ESTADO || '',
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  },
};

module.exports = env;
