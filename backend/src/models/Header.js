const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Header = sequelize.define('Header', {
    header_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'headers',
    timestamps: false
  });

  Header.associate = function(models) {
    Header.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    
    Header.belongsToMany(models.Request, {
      through: 'request_headers',
      foreignKey: 'header_id',
      otherKey: 'request_id',
      as: 'requests'
    });
  };

  return Header;
};
