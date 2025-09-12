const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payload = sequelize.define('Payload', {
    payload_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    payload_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    sent_from: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'payloads',
    timestamps: false
  });

  Payload.associate = function(models) {
    Payload.hasMany(models.Request, {
      foreignKey: 'payload_id',
      as: 'requests'
    });
  };

  return Payload;
};
