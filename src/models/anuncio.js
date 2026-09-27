module.exports = (sequelize, DataTypes) => {
  const Anuncio = sequelize.define(
    'anuncio',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuarioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      titulo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      categoria: {
        type: DataTypes.ENUM('BOVINA', 'SUINA', 'FRANGO', 'OUTROS'),
        allowNull: false,
      },
      tipoCarne: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantidade: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      preco: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      cidade: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      estado: {
        type: DataTypes.STRING(2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('ATIVO', 'PAUSADO', 'VENDIDO', 'EXCLUIDO'),
        allowNull: false,
        defaultValue: 'ATIVO',
      },
      destaque: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      visualizacoes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'anuncios',
      createdAt: 'criadoEm',
      updatedAt: 'atualizadoEm',
    }
  );

  return Anuncio;
};
