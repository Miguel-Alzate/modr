const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Status = sequelize.define('Status', {
    status_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'status',
    timestamps: false
  });

  Status.associate = function(models) {
    Status.hasMany(models.Request, {
      foreignKey: 'status_id',
      as: 'requests'
    });
  };

  return Status;
};
