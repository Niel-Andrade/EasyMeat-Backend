module.exports = (sequelize, DataTypes) => {
  const Banner = sequelize.define(
    'banner',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      titulo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      imagem: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      imagemPublicId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      link: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'banners',
      createdAt: 'criadoEm',
      updatedAt: 'atualizadoEm',
    }
  );

  return Banner;
};
