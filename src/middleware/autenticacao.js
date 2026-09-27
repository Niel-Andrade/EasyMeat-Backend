const jwt = require('jsonwebtoken');
const env = require('../config/env');

function combinarCaminho(baseUrl, path) {
  const base = baseUrl && baseUrl !== '/' ? baseUrl : '';
  const sufixo = path || '';
  const completo = `${base}${sufixo}` || '/';
  return completo.replace(/\/+/g, '/');
}

function correspondePadrao(padrao, metodo, caminho) {
  const [metodoPadrao, caminhoPadrao] = String(padrao).split(':');
  if (!metodoPadrao || !caminhoPadrao) return false;
  if (metodoPadrao.toUpperCase() !== metodo.toUpperCase()) return false;

  if (caminhoPadrao.endsWith('/*')) {
    const prefixo = caminhoPadrao.replace(/\/\*$/, '');
    return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
  }

  return caminhoPadrao === caminho;
}

function rotaPublica(req) {
  if (req.method === 'OPTIONS') return true;

  const caminho = combinarCaminho(req.baseUrl, req.path);
  return env.rotas_publicas.some((padrao) => correspondePadrao(padrao, req.method, caminho));
}

function extrairToken(req) {
  const tokenCookie = req.cookies?.[env.jwt_cookie_nome];
  if (tokenCookie) return tokenCookie;

  const authorization = req.headers.authorization || '';
  if (authorization.startsWith('Bearer ')) {
    return authorization.replace('Bearer ', '').trim();
  }

  return null;
}

function verificarToken(req, res, next) {
  const publico = rotaPublica(req);
  const token = extrairToken(req);

  if (!token && publico) {
    return next();
  }

  if (!token) {
    return res.status(401).json({ message: 'Token não informado.' });
  }

  try {
    const payload = jwt.verify(token, env.jwt_secret);
    req.usuario = {
      id: payload.sub,
      email: payload.email,
      tipoUsuario: payload.tipoUsuario,
    };

    return next();
  } catch (_erro) {
    if (publico) {
      return next();
    }

    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

function exigirAdmin(req, res, next) {
  if (!req.usuario || req.usuario.tipoUsuario !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso permitido apenas para administradores.' });
  }

  return next();
}

function exigirVendedorOuAdmin(req, res, next) {
  if (!req.usuario || !['VENDEDOR', 'ADMIN'].includes(req.usuario.tipoUsuario)) {
    return res.status(403).json({ message: 'Acesso permitido apenas para vendedores ou administradores.' });
  }

  return next();
}

module.exports = {
  verificarToken,
  exigirAdmin,
  exigirVendedorOuAdmin,
};
