module.exports = (sequelize, DataTypes) => {
  const RecuperacaoSenha = sequelize.define(
    'recuperacaoSenha',
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
      tokenHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expiraEm: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      utilizadoEm: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'recuperacao_senhas',
      createdAt: 'criadoEm',
      updatedAt: 'atualizadoEm',
    }
  );

  return RecuperacaoSenha;
};
