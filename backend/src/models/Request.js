const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Request = sequelize.define('Request', {
    request_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    status_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'status',
        key: 'status_id'
      }
    },
    method_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'methods',
        key: 'method_id'
      }
    },
    payload_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'payloads',
        key: 'payload_id'
      }
    },
    response_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'responses',
        key: 'response_id'
      }
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    controller: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    happened: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    duration: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    made_by: {
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
    tableName: 'requests',
    timestamps: false, // Manejamos manualmente created_at
    indexes: [
      { fields: ['happened'] },
      { fields: ['status_id'] },
      { fields: ['method_id'] },
      { fields: ['path'] },
      { fields: ['created_at'] }
    ]
  });

  // Definir asociaciones
  Request.associate = function(models) {
    Request.belongsTo(models.Status, { 
      foreignKey: 'status_id',
      as: 'status'
    });
    
    Request.belongsTo(models.Method, { 
      foreignKey: 'method_id',
      as: 'method'
    });
    
    Request.belongsTo(models.Payload, { 
      foreignKey: 'payload_id',
      as: 'payload'
    });
    
    Request.belongsTo(models.Response, { 
      foreignKey: 'response_id',
      as: 'response'
    });
    
    Request.belongsTo(models.User, { 
      foreignKey: 'made_by',
      as: 'user'
    });
    
    Request.hasMany(models.Query, { 
      foreignKey: 'request_id',
      as: 'queries'
    });
    
    Request.hasMany(models.Exception, { 
      foreignKey: 'request_id',
      as: 'exceptions'
    });
    
    Request.belongsToMany(models.Header, {
      through: 'request_headers',
      foreignKey: 'request_id',
      otherKey: 'header_id',
      as: 'headers'
    });
  };

  // Métodos estáticos para consultas comunes
  Request.getRecentRequests = async function(limit = 50, includeDetails = false) {
    const include = includeDetails ? [
      { model: sequelize.models.Status, as: 'status' },
      { model: sequelize.models.Method, as: 'method' },
      { model: sequelize.models.Payload, as: 'payload' },
      { model: sequelize.models.Response, as: 'response' },
      { model: sequelize.models.User, as: 'user' }
    ] : [
      { model: sequelize.models.Status, as: 'status' },
      { model: sequelize.models.Method, as: 'method' }
    ];

    return this.findAll({
      limit,
      order: [['happened', 'DESC']],
      include
    });
  };

  Request.getRequestStats = async function() {
    const { Op } = require('sequelize');
    
    const totalRequests = await this.count();
    const errorRequests = await this.count({
      include: [{
        model: sequelize.models.Status,
        as: 'status',
        where: {
          code: { [Op.gte]: 400 }
        }
      }]
    });
    
    const avgDuration = await this.aggregate('duration', 'AVG', {
      where: {
        duration: { [Op.ne]: null }
      }
    });

    return {
      total: totalRequests,
      errors: errorRequests,
      successRate: totalRequests > 0 ? ((totalRequests - errorRequests) / totalRequests * 100).toFixed(2) : 0,
      avgResponseTime: avgDuration ? Math.round(avgDuration) : 0
    };
  };

  return Request;
};
