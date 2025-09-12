const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Method = sequelize.define('Method', {
    method_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'methods',
    timestamps: false
  });

  Method.associate = function(models) {
    Method.hasMany(models.Request, {
      foreignKey: 'method_id',
      as: 'requests'
    });
  };

  return Method;
};
