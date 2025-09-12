const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Query = sequelize.define('Query', {
    query_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    request_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'request_id'
      }
    },
    sql: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    duration: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    executed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'queries',
    timestamps: false
  });

  Query.associate = function(models) {
    Query.belongsTo(models.Request, {
      foreignKey: 'request_id',
      as: 'request'
    });
  };

  return Query;
};
