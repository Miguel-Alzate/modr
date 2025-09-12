require('dotenv').config();
const path = require('path');

module.exports = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'db_password',
        database: process.env.DB_NAME || 'db_name',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        migrationStorageTableName: 'sequelize_meta',
        seederStorageTableName: 'sequelize_data',
        migrations: path.resolve(__dirname, '../database/migrations'),
        seeders: path.resolve(__dirname, '../database/seeders'),
    },
};
