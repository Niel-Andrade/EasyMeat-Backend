module.exports = (sequelize, DataTypes) => {
  const AnuncioImagem = sequelize.define(
    'anuncioImagem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      anuncioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      publicId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ordem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'anuncio_imagens',
      createdAt: 'criadoEm',
      updatedAt: 'atualizadoEm',
    }
  );

  return AnuncioImagem;
};
