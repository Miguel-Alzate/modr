const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Exception = sequelize.define('Exception', {
    exception_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    request_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'request_id'
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    stack_trace: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    occurred_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'exceptions',
    timestamps: false
  });

  Exception.associate = function(models) {
    Exception.belongsTo(models.Request, {
      foreignKey: 'request_id',
      as: 'request'
    });
  };

  return Exception;
};
