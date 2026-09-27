module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    'usuario',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      senha: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      telefone: {
        type: DataTypes.STRING,
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
      // 3.2 — CPF obrigatório para vendedores (back-end)
      cpf: {
        type: DataTypes.STRING(14),
        allowNull: true,
      },
      cep: {
        type: DataTypes.STRING(9),
        allowNull: true,
      },
      tipoUsuario: {
        type: DataTypes.ENUM('COMPRADOR', 'VENDEDOR', 'ADMIN'),
        allowNull: false,
        defaultValue: 'COMPRADOR',
      },
      status: {
        type: DataTypes.ENUM('ATIVO', 'BLOQUEADO'),
        allowNull: false,
        defaultValue: 'ATIVO',
      },
      foto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fotoPublicId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      plano: {
        type: DataTypes.ENUM('free', 'basico', 'premium'),
        allowNull: false,
        defaultValue: 'free',
      },
      premium: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ultimoLoginEm: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'usuarios',
      createdAt: 'criadoEm',
      updatedAt: 'atualizadoEm',
    }
  );

  return Usuario;
};
