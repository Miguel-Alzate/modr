const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const swaggerDocs = require('./src/core/config/swaggerConfig');
const SocketManager = require('./src/core/sockets/socketManager');
const MonitoringMiddleware = require('./src/middlewares/MonitoringMiddleware');
const monitoringRoutes = require('./src/routes/monitoringRoutes');
require('dotenv').config();

// Inicializar Express y HTTP server
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
    socket.emit('modr:connected', {
        message: 'Connected to MODR real-time monitoring',
        timestamp: new Date().toISOString()
    });
});

// Después de crear la instancia del socket.io
const socketManager = new SocketManager(io);
socketManager.initialize();

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routa de el dashboard para el monitoreo
app.use('/api/v1/modr', monitoringRoutes);

// Swagger docs
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

// Monitoring middleware initialization
const monitoringMiddleware = new MonitoringMiddleware(io);
monitoringMiddleware.configure({
    ignorePaths: bypassPaths,
    captureResponseBody: true,
    maxBodySize: 100000, // 100KB
    onlyErrors: false,
    captureMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});

// Inicializar Monitoring middleware
app.use(monitoringMiddleware.capture());
app.use(monitoringMiddleware.captureErrors());

// Por si ocurre un error global
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`[MODR] Server running on port ${PORT}`);
    console.log(`[MODR] Documentation at: ${process.env.API_DOCS_URL}`);
});