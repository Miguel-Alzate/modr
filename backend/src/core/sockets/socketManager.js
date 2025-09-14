class SocketManager {
    constructor(io) {
        this.io = io;
        this.connections = new Map();
    }

    initialize() {
        this.io.on('connection', (socket) => {
        this.handleConnection(socket);
        this.setupEventListeners(socket);
        });
    }

    handleConnection(socket) {
        this.connections.set(socket.id, socket);
        socket.on('disconnect', () => {
        this.connections.delete(socket.id);
        });
    }
}

module.exports = SocketManager;