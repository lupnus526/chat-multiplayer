const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Função para ler o arquivo users.txt
function getUsers() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'users.txt'), 'utf8');
        const lines = data.split('\n');
        const users = {};
        lines.forEach(line => {
            const [username, password, role] = line.trim().split(':');
            if (username && password) {
                users[username] = { password, role: role || 'membro' };
            }
        });
        return users;
    } catch (err) {
        console.error("Erro ao ler users.txt:", err);
        return {};
    }
}

// Rota de Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();

    if (users[username] && users[username].password === password) {
        res.json({ success: true, username, role: users[username].role });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha incorretos!' });
    }
});

// Rota para processar o print do Banco da Guilda (GB)
app.post('/api/gb/depositar', upload.single('print'), (req, res) => {
    const { username } = req.body;
    const filePath = req.file ? req.file.path : null;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
    }

    // Registro em código dos dados do depósito
    const registroData = {
        membro: username,
        data: new Date().toISOString(),
        status: 'Registrado com sucesso via print'
    };

    const logEntry = `[${registroData.data}] Membro: ${username} enviou comprovante para o GB.\n`;
    fs.appendFileSync(path.join(__dirname, 'gb_logs.txt'), logEntry);

    // DELETA A FOTO APÓS O PROCESSAMENTO
    fs.unlink(filePath, (err) => {
        if (err) console.error("Erro ao deletar a foto temporária:", err);
    });

    res.json({ success: true, message: 'Print processado, registrado em código e foto apagada com sucesso!' });
});

let activeUsers = 0;

io.on('connection', (socket) => {
    activeUsers++;
    io.emit('stats', { activeUsers });

    // Chat Geral da Guilda
    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    // Avisos de Quest (Somente Admins)
    socket.on('guild alert', (data) => {
        const users = getUsers();
        if (users[data.name] && users[data.name].role === 'admin') {
            io.emit('guild alert', data);
        }
    });

    // Chat Privado (Estilo WhatsApp entre pessoas)
    socket.on('private message', (data) => {
        io.to(data.receiver).emit('private message', data);
        socket.emit('private message', data);
    });

    socket.on('register-user-socket', (username) => {
        socket.join(username);
    });

    socket.on('disconnect', () => {
        activeUsers--;
        io.emit('stats', { activeUsers });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
