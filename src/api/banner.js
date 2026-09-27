const express = require('express');
const { banner } = require('../models');
const BannerServico = require('../services/banner');
const { tratarErro } = require('./helpers');

const rota = express.Router();
const bannerServico = new BannerServico(banner);

rota.get('/', async (_req, res) => {
  try {
    const resposta = await bannerServico.listarAtivos();
    return res.status(200).json({ items: resposta });
  } catch (erro) {
    return tratarErro(res, erro);
  }
});

module.exports = rota;
