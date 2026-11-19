const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { usuario } = require('../models');

function combinarCaminho(baseUrl, path) {
  const base = baseUrl && baseUrl !== '/' ? baseUrl : '';
  const sufixo = path || '';
  const completo = `${base}${sufixo}` || '/';
  return completo.replace(/\/+/g, '/');
}

function correspondePadrao(padrao, metodo, caminho) {
  const [metodoPadrao, caminhoPadrao] = String(padrao).split(':');

  if (!metodoPadrao || !caminhoPadrao) return false;

  if (metodoPadrao.toUpperCase() !== metodo.toUpperCase()) {
    return false;
  }

  if (caminhoPadrao.endsWith('/*')) {
    const prefixo = caminhoPadrao.replace(/\/\*$/, '');
    return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
  }

  return caminhoPadrao === caminho;
}

function rotaPublica(req) {
  if (req.method === 'OPTIONS') return true;

  const caminho = combinarCaminho(req.baseUrl, req.path);

  return env.rotas_publicas.some((padrao) =>
    correspondePadrao(padrao, req.method, caminho)
  );
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

async function verificarToken(req, res, next) {
  const publico = rotaPublica(req);
  const token = extrairToken(req);

  if (!token && publico) {
    return next();
  }

  if (!token) {
    return res.status(401).json({
      message: 'Token não informado.',
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, env.jwt_secret,{
      algorithms: ['HS256'],
    });
  } catch (_erro) {
    if (publico) {
      return next();
    }

    return res.status(401).json({
      message: 'Token inválido ou expirado.',
    });
  }

  // Verifica se o token possui um identificador de usuário válido.
  if (!payload || typeof payload !== 'object' || !payload.sub) {
    if (publico) {
      return next();
    }

    return res.status(401).json({
      message: 'Token inválido ou expirado.',
    });
  }

  try {
    // Consulta o estado atual do usuário no banco de dados.
    const usuarioAutenticado = await usuario.findByPk(payload.sub);

    if (!usuarioAutenticado) {
      if (publico) {
        return next();
      }

      return res.status(401).json({
        message: 'Usuário não encontrado.',
      });
    }

    if (usuarioAutenticado.status !== 'ATIVO') {
      if (publico) {
        return next();
      }

      return res.status(403).json({
        message: 'Sua conta está bloqueada.',
      });
    }

    // Utiliza os dados atuais do banco, não os dados do JWT.
    req.usuario = {
      id: usuarioAutenticado.id,
      email: usuarioAutenticado.email,
      tipoUsuario: usuarioAutenticado.tipoUsuario,
    };

    return next();
  } catch (erro) {
    return next(erro);
  }
}

function exigirAdmin(req, res, next) {
  if (!req.usuario || req.usuario.tipoUsuario !== 'ADMIN') {
    return res.status(403).json({
      message: 'Acesso permitido apenas para administradores.',
    });
  }

  return next();
}

function exigirVendedorOuAdmin(req, res, next) {
  if (
    !req.usuario ||
    !['VENDEDOR', 'ADMIN'].includes(req.usuario.tipoUsuario)
  ) {
    return res.status(403).json({
      message: 'Acesso permitido apenas para vendedores ou administradores.',
    });
  }

  return next();
}

module.exports = {
  verificarToken,
  exigirAdmin,
  exigirVendedorOuAdmin,
};
