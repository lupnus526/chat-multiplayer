const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir os arquivos estáticos da pasta "public"
app.use(express.static('public'));

// Gerenciar conexões dos usuários
io.on('connection', (socket) => {
    console.log(`Usuário conectado: ${socket.id}`);

    // Ouvir quando alguém mandar uma mensagem
    socket.on('chat message', (data) => {
        // Enviar a mensagem para todos os conectados, incluindo quem mandou
        io.emit('chat message', data);
    });

    // Quando o usuário desconectar
    socket.on('disconnect', () => {
        console.log(`Usuário desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});