const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos
const sequelize = new Sequelize(
  process.env.DB_NAME || 'modr_monitoring',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'db_password',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      freezeTableName: true, // Evita que Sequelize pluralice nombres de tablas
      underscored: false // Mantiene el formato de campos como están definidos
    }
  }
);

const db = {
  Sequelize,
  sequelize,
  models: {}
};

// Importar modelos
const Request = require('./Request')(sequelize);
const Status = require('./Status')(sequelize);
const Method = require('./Method')(sequelize);
const Payload = require('./Payload')(sequelize);
const Response = require('./Response')(sequelize);
const Header = require('./Header')(sequelize);
const User = require('./User')(sequelize);
const Exception = require('./Exception')(sequelize);
const Query = require('./Query')(sequelize);

// Agregar modelos al objeto db
db.models.Request = Request;
db.models.Status = Status;
db.models.Method = Method;
db.models.Payload = Payload;
db.models.Response = Response;
db.models.Header = Header;
db.models.User = User;
db.models.Exception = Exception;
db.models.Query = Query;

// Establecer asociaciones
Object.keys(db.models).forEach(modelName => {
  if (db.models[modelName].associate) {
    db.models[modelName].associate(db.models);
  }
});

module.exports = db;
