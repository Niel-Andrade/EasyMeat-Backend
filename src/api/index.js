const express = require('express');
const authRota = require('./auth');
const usuarioRota = require('./usuario');
const anuncioRota = require('./anuncio');
const bannerRota = require('./banner');
const adminRota = require('./admin');

const rota = express.Router();

//Uma rota de checagem de resposta da aplicação
rota.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'ok' });
});

rota.use('/auth', authRota);
rota.use('/usuarios', usuarioRota);
rota.use('/anuncios', anuncioRota);
rota.use('/banners', bannerRota);
rota.use('/admin', adminRota);

module.exports = rota;
