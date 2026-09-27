const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

const pastaUploadsPublicos = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(pastaUploadsPublicos)) {
  fs.mkdirSync(pastaUploadsPublicos, { recursive: true });
}

const cloudinaryHabilitado = Boolean(
  env.cloudinary.cloud_name && env.cloudinary.api_key && env.cloudinary.api_secret
);

if (cloudinaryHabilitado) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloud_name,
    api_key: env.cloudinary.api_key,
    api_secret: env.cloudinary.api_secret,
  });
}

const normalizarNomeArquivo = (nome) =>
  nome
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

const caminhoPublicoParaUrl = (caminhoRelativo) => `${env.api_url}${caminhoRelativo}`;

async function uploadImagem(caminhoTemporario, pasta = 'geral') {
  if (!caminhoTemporario) {
    return { url: null, publicId: null };
  }

  if (cloudinaryHabilitado) {
    const upload = await cloudinary.uploader.upload(caminhoTemporario, {
      folder: `easy-meat/${pasta}`,
      resource_type: 'image',
    });

    fs.existsSync(caminhoTemporario) && fs.unlinkSync(caminhoTemporario);

    return {
      url: upload.secure_url,
      publicId: upload.public_id,
    };
  }

  const nomeArquivo = `${Date.now()}-${normalizarNomeArquivo(path.basename(caminhoTemporario))}`;
  const pastaDestino = path.join(pastaUploadsPublicos, pasta);

  if (!fs.existsSync(pastaDestino)) {
    fs.mkdirSync(pastaDestino, { recursive: true });
  }

  const destinoFinal = path.join(pastaDestino, nomeArquivo);
  fs.renameSync(caminhoTemporario, destinoFinal);

  return {
    url: caminhoPublicoParaUrl(`/uploads/${pasta}/${nomeArquivo}`),
    publicId: null,
  };
}

async function removerImagem(publicId, url) {
  if (publicId && cloudinaryHabilitado) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return;
  }

  if (url && url.startsWith(`${env.api_url}/uploads/`)) {
    const caminhoLocal = url.replace(`${env.api_url}/uploads/`, '');
    const arquivo = path.join(pastaUploadsPublicos, caminhoLocal);

    if (fs.existsSync(arquivo)) {
      fs.unlinkSync(arquivo);
    }
  }
}

module.exports = {
  cloudinary,
  cloudinaryHabilitado,
  uploadImagem,
  removerImagem,
};
