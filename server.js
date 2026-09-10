const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuração do Multer para prints do Banco GB
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Controle de usuários ativos
let activeUsersCount = 0;

// Garante que o arquivo users.txt exista
if (!fs.existsSync('users.txt')) {
    fs.writeFileSync('users.txt', 'gaijin:admin:ADMINFFFGH\n', 'utf8');
}

// Rota de Cadastro
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ success: false, message: 'Preencha todos os campos.' });
    }

    fs.readFile('users.txt', 'utf8', (err, data) => {
        if (err) data = '';
        const lines = data.split('\n');
        
        for (let line of lines) {
            if (line.trim()) {
                const parts = line.split(':');
                if (parts[0] === username) {
                    return res.json({ success: false, message: 'Este nome de usuário já está em uso.' });
                }
            }
        }

        const newUserLine = `${username}:${password}:membro\n`;
        fs.appendFile('users.txt', newUserLine, (err) => {
            if (err) {
                return res.json({ success: false, message: 'Erro ao salvar o registro.' });
            }
            res.json({ success: true, message: 'Conta criada com sucesso!' });
        });
    });
});

// Rota de Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ success: false, message: 'Preencha usuário e senha.' });
    }

    fs.readFile('users.txt', 'utf8', (err, data) => {
        if (err) {
            return res.json({ success: false, message: 'Erro interno ao ler registros.' });
        }

        const lines = data.split('\n');
        let authenticated = false;
        let userRole = 'membro';

        for (let line of lines) {
            if (line.trim()) {
                const parts = line.split(':');
                const fileUser = parts[0];
                const filePass = parts[1];
                const fileRole = parts[2] ? parts[2].trim() : (fileUser === 'gaijin' ? 'ADMINFFFGH' : 'membro');

                if (fileUser === username && filePass === password) {
                    authenticated = true;
                    userRole = fileRole;
                    break;
                }
            }
        }

        if (authenticated) {
            res.json({ success: true, username, role: userRole });
        } else {
            res.json({ success: false, message: 'Usuário ou senha incorretos.' });
        }
    });
});

// Rota para listar todos os usuários registrados
app.get('/api/users', (req, res) => {
    fs.readFile('users.txt', 'utf8', (err, data) => {
        if (err) {
            return res.json({ success: false, users: [] });
        }
        const lines = data.split('\n');
        const users = [];
        lines.forEach(line => {
            if (line.trim()) {
                const parts = line.split(':');
                if (parts[0]) {
                    users.push(parts[0].trim());
                }
            }
        });
        res.json({ success: true, users });
    });
});

// Rota para alterar o cargo de um usuário (Apenas Admin)
app.post('/api/users/role', (req, res) => {
    const { adminUser, targetUser, newRole } = req.body;

    fs.readFile('users.txt', 'utf8', (err, data) => {
        if (err) {
            return res.json({ success: false, message: 'Erro ao ler registros.' });
        }

        const lines = data.split('\n');
        let updated = false;
        let adminAuthorized = false;

        for (let line of lines) {
            if (line.trim()) {
                const parts = line.split(':');
                if (parts[0] === adminUser) {
                    const role = parts[2] ? parts[2].trim() : (parts[0] === 'gaijin' ? 'ADMINFFFGH' : 'membro');
                    if (role.toLowerCase().includes('admin')) {
                        adminAuthorized = true;
                    }
                    break;
                }
            }
        }

        if (!adminAuthorized) {
            return res.json({ success: false, message: 'Ação não autorizada.' });
        }

        const newLines = lines.map(line => {
            if (!line.trim()) return line;
            const parts = line.split(':');
            if (parts[0] === targetUser) {
                updated = true;
                const pass = parts[1];
                return `${targetUser}:${pass}:${newRole}`;
            }
            return line;
        });

        if (!updated) {
            return res.json({ success: false, message: 'Usuário não encontrado.' });
        }

        fs.writeFile('users.txt', newLines.join('\n'), 'utf8', (err) => {
            if (err) {
                return res.json({ success: false, message: 'Erro ao salvar alteração.' });
            }
            res.json({ success: true, message: `Cargo de ${targetUser} alterado para ${newRole} com sucesso!` });
        });
    });
});

// Rota para resgatar histórico de mensagens privadas
app.get('/api/messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;
    
    if (!fs.existsSync('messages.txt')) {
        return res.json({ success: true, messages: [] });
    }

    fs.readFile('messages.txt', 'utf8', (err, data) => {
        if (err) {
            return res.json({ success: false, messages: [] });
        }

        const lines = data.split('\n');
        const messages = [];

        lines.forEach(line => {
            if (line.trim()) {
                const parts = line.split('|');
                if (parts.length >= 3) {
                    const sender = parts[0];
                    const receiver = parts[1];
                    const message = parts[2];

                    if ((sender === user1 && receiver === user2) || (sender === user2 && receiver === user1)) {
                        messages.push({ sender, receiver, message });
                    }
                }
            }
        });

        res.json({ success: true, messages });
    });
});

// Rota de Depósito / Banco GB
app.post('/api/gb/depositar', upload.single('print'), (req, res) => {
    const username = req.body.username || 'Desconhecido';
    const file = req.file;

    if (!file) {
        return res.json({ success: false, message: 'Nenhum print enviado.' });
    }

    const logEntry = `[${new Date().toLocaleString('pt-BR')}] Membro: ${username} | Arquivo: ${file.originalname} - Registrado com sucesso!\n`;

    fs.appendFile('gb_logs.txt', logEntry, (err) => {
        if (err) {
            return res.json({ success: false, message: 'Erro ao registrar no Banco GB.' });
        }
        res.json({ success: true, message: 'Print auditado e doação registrada no Banco GB com sucesso!' });
    });
});

app.get('/api/gb/logs', (req, res) => {
    if (!fs.existsSync('gb_logs.txt')) {
        return res.json({ success: true, logs: 'Nenhum registro no Banco GB ainda.' });
    }
    fs.readFile('gb_logs.txt', 'utf8', (err, data) => {
        if (err) {
            return res.json({ success: false, logs: 'Erro ao carregar logs.' });
        }
        res.json({ success: true, logs: data });
    });
});

// Configuração do Socket.io
io.on('connection', (socket) => {
    activeUsersCount++;
    io.emit('stats', { activeUsers: activeUsersCount });

    socket.on('register-user-socket', (username) => {
        socket.username = username;
    });

    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });

    socket.on('guild alert', (data) => {
        io.emit('guild alert', data);
    });

    socket.on('private message', (data) => {
        const logEntry = `${data.sender}|${data.receiver}|${data.message}|${Date.now()}\n`;
        
        fs.appendFile('messages.txt', logEntry, (err) => {
            if (err) console.error("Erro ao salvar mensagem privada:", err);
        });

        for (let [id, sock] of io.of('/').sockets) {
            if (sock.username === data.receiver || sock.username === data.sender) {
                sock.emit('private message', data);
            }
        }
    });

    socket.on('disconnect', () => {
        activeUsersCount = Math.max(0, activeUsersCount - 1);
        io.emit('stats', { activeUsers: activeUsersCount });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
