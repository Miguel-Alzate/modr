const express = require('express');
const swaggerDocs = require('./src/core/config/swaggerConfig');
const { createServer } = require('http');
const { Server } = require('socket.io');
const SocketManager = require('./src/core/sockets/socketManager');
const ModrMiddleware = require('./src/middleware/ModrMiddleware');
const path = require('path');

// Importar rutas
const modrRoutes = require('./src/routes/modrRoutes');

require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
    }
});

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de Socket.IO
io.on('connection', (socket) => {
    // Enviar estadísticas iniciales al conectarse
    socket.emit('modr:connected', {
        message: 'Connected to MODR real-time monitoring',
        timestamp: new Date().toISOString()
    });
});

// Después de crear la instancia de io
const socketManager = new SocketManager(io);
socketManager.initialize();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/modr', modrRoutes);

// Documentacion de swagger
swaggerDocs(app);

// Middleware de bypass para rutas que NO deben ser capturadas por MODR
const bypassPaths = [
    '/modr',
    '/api/v1/modr', 
    '/api/v1/docs',
    '/swagger',
    '/favicon.ico', 
    '/health',
    '/socket.io'
];

app.use((req, res, next) => {
    const reqPath = (req.originalUrl || req.url || '').toLowerCase();
    const shouldBypass = bypassPaths.some(path => 
        reqPath === path.toLowerCase() || 
        reqPath.startsWith(path.toLowerCase() + '/') ||
        reqPath.startsWith(path.toLowerCase() + '?')
    );
    
    if (shouldBypass) {
        req.modrBypass = true;
        console.log(`[MODR Bypass] Ignorando: ${req.originalUrl || req.url}`);
    }
    
    next();
});

// Inicializar MODR middleware
const modrMiddleware = new ModrMiddleware(io);
modrMiddleware.configure({
    ignorePaths: bypassPaths, // Usar la misma lista
    captureResponseBody: true,
    maxBodySize: 100000, // 100KB
    onlyErrors: false,
    captureMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});


// Aplicar middleware de MODR DESPUÉS de definir las rutas a ignorar
app.use(modrMiddleware.capture());
app.use(modrMiddleware.captureErrors());
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`[MODR] Server running on port ${PORT}`);
    console.log(`[MODR] Documentation at: ${process.env.API_DOCS_URL}`);
    console.log(`[MODR] Dashboard available at: http://localhost:${PORT}/modr`);
});
