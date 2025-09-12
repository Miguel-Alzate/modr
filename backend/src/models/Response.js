const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Response = sequelize.define('Response', {
    response_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.JSON,
      allowNull: true
    },
    size: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    sent_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'responses',
    timestamps: false
  });

  Response.associate = function(models) {
    Response.hasMany(models.Request, {
      foreignKey: 'response_id',
      as: 'requests'
    });
  };

  return Response;
};
