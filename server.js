const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let activeUsers = 0;

io.on('connection', (socket) => {
    activeUsers++;
    // Envia o número atualizado de usuários para todos
    io.emit('stats', { activeUsers });

    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        activeUsers = Math.max(0, activeUsers - 1);
        io.emit('stats', { activeUsers });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
