const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Hashea una contraseña
async function createHashedPassword(password) {
    const saltRounds = `${process.env.BCRYPT_SALT_ROUNDS}`;
    return await bcrypt.hash(password, saltRounds);
}

// Verifica una contraseña
async function verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

// Crea un JWT token
function createAccessToken(data) {
    const payload = { ...data };
    const expiresIn = `${process.env.TOKEN_EXPIRE_MIN}m`;

    return jwt.sign(payload, process.env.SECRET_KEY, {
        algorithm: process.env.ALGORITHM || 'HS256',
        expiresIn
    });
}

// Verifica el token JWT
async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY, {
        algorithms: [process.env.ALGORITHM || 'HS256']
        });
        return decoded.sub;
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return 'Token expired'; 
        }
        return 'Invalid token'; 
    }
}

module.exports = {
    createHashedPassword,
    verifyPassword,
    createAccessToken,
    verifyToken
};
