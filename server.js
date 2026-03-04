// ========== KATYZAP - VERSÃO RAILWAY ==========
// Tudo inline, pronto para deploy!

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

// Configurações
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const usuarios = new Map();
const mensagensSalvas = {
    dinho: [],
    mara: [],
    katy: []
};

// Mensagens iniciais
const mensagensIniciais = {
    dinho: [
        { de: 'dinho', para: 'todos', texto: 'E aí, galera! 💪', hora: '10:30', timestamp: Date.now() - 3600000 },
        { de: 'katy', para: 'todos', texto: 'Oiii 💗', hora: '10:31', timestamp: Date.now() - 3599000 }
    ],
    mara: [
        { de: 'mara', para: 'todos', texto: 'Bom dia! 🌸', hora: '09:15', timestamp: Date.now() - 7200000 },
        { de: 'dinho', para: 'todos', texto: 'Bom dia, Mara!', hora: '09:16', timestamp: Date.now() - 7199000 }
    ],
    katy: [
        { de: 'katy', para: 'todos', texto: 'Prontos pro rolê? 💕', hora: '14:20', timestamp: Date.now() - 1800000 },
        { de: 'mara', para: 'todos', texto: 'Já tô chegando! 🚗', hora: '14:22', timestamp: Date.now() - 1798000 }
    ]
};

// Inicializar mensagens
Object.keys(mensagensIniciais).forEach(key => {
    mensagensSalvas[key] = mensagensIniciais[key];
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Rota principal - HTML INLINE
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>KatyZap - Chat Rosa 💗</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 15px;
        }

        .container {
            width: 100%;
            max-width: 400px;
            height: 85vh;
            background: #fff5f7;
            border-radius: 40px;
            box-shadow: 0 25px 50px rgba(255, 105, 180, 0.4);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 4px solid #ffb6c1;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
            padding: 20px;
            color: white;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .avatar {
            width: 50px;
            height: 50px;
            background: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            border: 3px solid #fff;
        }

        .header h1 {
            font-size: 22px;
            flex: 1;
        }

        .header h1 span {
            font-size: 12px;
            display: block;
            opacity: 0.9;
        }

        .server-status {
            font-size: 10px;
            background: rgba(255,255,255,0.2);
            padding: 4px 8px;
            border-radius: 20px;
        }

        /* Contatos */
        .contatos {
            display: flex;
            padding: 12px;
            gap: 8px;
            background: #ffe4ec;
            overflow-x: auto;
            border-bottom: 2px solid #ffb6c1;
        }

        .contato-card {
            background: white;
            padding: 10px 15px;
            border-radius: 25px;
            display: flex;
            align-items: center;
            gap: 6px;
            border: 2px solid #ffb6c1;
            min-width: 100px;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
            font-weight: 600;
        }

        .contato-card.ativo {
            background: #ff7eb3;
            color: white;
            border-color: #ff4d7a;
            transform: scale(1.02);
        }

        .online-badge {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #9e9e9e;
            display: inline-block;
        }

        .online-badge.online {
            background: #4caf50;
            box-shadow: 0 0 5px #4caf50;
        }

        /* Chat Area */
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #fff0f5;
            overflow: hidden;
        }

        .chat-header {
            background: #ffb6c1;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #ff99aa;
        }

        .contato-info {
            display: flex;
            flex-direction: column;
        }

        .contato-nome {
            font-size: 16px;
            font-weight: bold;
            color: #663399;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-text {
            font-size: 11px;
            transition: color 0.3s;
        }

        .digitando {
            font-size: 11px;
            color: #666;
            font-style: italic;
            height: 15px;
        }

        .mensagens {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .mensagem {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 20px;
            position: relative;
            animation: slideIn 0.3s ease;
            word-wrap: break-word;
            font-size: 14px;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .mensagem.recebida {
            background: white;
            border: 2px solid #ffb6c1;
            align-self: flex-start;
            border-bottom-left-radius: 5px;
        }

        .mensagem.enviada {
            background: #ff7eb3;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 5px;
        }

        .mensagem .footer {
            display: flex;
            justify-content: flex-end;
            gap: 5px;
            margin-top: 5px;
            font-size: 10px;
            opacity: 0.7;
        }

        /* Input Area */
        .input-area {
            background: white;
            padding: 12px;
            display: flex;
            gap: 8px;
            border-top: 2px solid #ffb6c1;
        }

        .input-area input {
            flex: 1;
            padding: 10px 15px;
            border: 2px solid #ffb6c1;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
        }

        .input-area input:focus {
            border-color: #ff7eb3;
        }

        .btn-enviar {
            background: #ff7eb3;
            border: none;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            color: white;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .btn-enviar:active {
            transform: scale(0.95);
        }

        .notificacao {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff7eb3;
            color: white;
            padding: 10px 20px;
            border-radius: 30px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideDown 0.3s ease;
            font-size: 14px;
            border: 2px solid white;
        }

        @keyframes slideDown {
            from { top: -100px; }
            to { top: 20px; }
        }

        .welcome-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #ff7eb3;
            text-align: center;
            padding: 20px;
        }

        .welcome-screen h2 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .welcome-screen p {
            margin-bottom: 20px;
        }

        .btn-escolher {
            background: #ff7eb3;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 30px;
            margin: 5px;
            font-size: 16px;
            cursor: pointer;
            border: 2px solid white;
        }
    </style>
</head>
<body>
    <div class="container" id="app">
        <!-- Header -->
        <div class="header">
            <div class="avatar">💗</div>
            <h1>KatyZap<br><span>by Katy 💕</span></h1>
            <div class="server-status" id="serverStatus">🟢</div>
        </div>

        <!-- Tela de escolha (inicial) -->
        <div id="welcomeScreen" class="welcome-screen">
            <h2>💗 Bem-vinda!</h2>
            <p>Escolha seu nome:</p>
            <button class="btn-escolher" onclick="escolherNome('Dinho')">👨 Dinho</button>
            <button class="btn-escolher" onclick="escolherNome('Mara')">👩 Mara</button>
            <button class="btn-escolher" onclick="escolherNome('Katy')">👸 Katy</button>
        </div>

        <!-- Chat (inicialmente escondido) -->
        <div id="chatContainer" style="display: none; height: 100%; display: flex; flex-direction: none;">
            <!-- Contatos -->
            <div class="contatos" id="contatos">
                <div class="contato-card" data-contato="dinho" data-nome="Dinho">
                    <span class="online-badge" id="status-dinho"></span>
                    <span>👨 Dinho</span>
                </div>
                <div class="contato-card" data-contato="mara" data-nome="Mara">
                    <span class="online-badge" id="status-mara"></span>
                    <span>👩 Mara</span>
                </div>
                <div class="contato-card" data-contato="katy" data-nome="Katy">
                    <span class="online-badge" id="status-katy"></span>
                    <span>👸 Katy</span>
                </div>
            </div>

            <!-- Chat Area -->
            <div class="chat-area">
                <div class="chat-header">
                    <div class="contato-info">
                        <div class="contato-nome">
                            <span id="contatoAtual">Dinho</span>
                            <span class="status-text" id="statusTexto">● online</span>
                        </div>
                        <div class="digitando" id="digitando"></div>
                    </div>
                </div>

                <!-- Mensagens -->
                <div class="mensagens" id="mensagens"></div>

                <!-- Input -->
                <div class="input-area">
                    <input type="text" id="mensagemInput" placeholder="Digite sua mensagem... 💗" autocomplete="off">
                    <button class="btn-enviar" id="btnEnviar">➤</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        // ========== CONFIGURAÇÃO ==========
        const socket = io();
        let meuNome = '';
        let meuContato = '';
        let contatoAtual = 'dinho';
        let usuariosOnline = new Map();
        
        // Elementos
        const welcomeScreen = document.getElementById('welcomeScreen');
        const chatContainer = document.getElementById('chatContainer');
        const mensagensDiv = document.getElementById('mensagens');
        const mensagemInput = document.getElementById('mensagemInput');
        const btnEnviar = document.getElementById('btnEnviar');
        const contatoAtualSpan = document.getElementById('contatoAtual');
        const statusTexto = document.getElementById('statusTexto');
        const digitandoSpan = document.getElementById('digitando');
        const serverStatus = document.getElementById('serverStatus');
        
        // Mapeamento
        const nomes = {
            dinho: 'Dinho',
            mara: 'Mara',
            katy: 'Katy'
        };

        // ========== FUNÇÕES ==========
        function escolherNome(nome) {
            meuNome = nome;
            meuContato = nome.toLowerCase();
            
            // Esconder welcome, mostrar chat
            welcomeScreen.style.display = 'none';
            chatContainer.style.display = 'flex';
            
            // Entrar no chat
            socket.emit('entrar', {
                nome: meuNome,
                contato: meuContato
            });
            
            // Configurar
            setupEventListeners();
            selecionarContato('dinho');
            
            console.log(\`✅ Conectado como \${meuNome}\`);
        }

        function setupEventListeners() {
            btnEnviar.addEventListener('click', enviarMensagem);
            
            mensagemInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') enviarMensagem();
            });

            mensagemInput.addEventListener('input', () => {
                socket.emit('digitando', { contato: contatoAtual });
            });

            document.querySelectorAll('.contato-card').forEach(card => {
                card.addEventListener('click', () => {
                    selecionarContato(card.dataset.contato);
                });
            });
        }

        // Socket events
        socket.on('historico', (historico) => {
            mensagensDiv.innerHTML = '';
            historico.forEach(msg => {
                adicionarMensagem(msg, msg.de === meuContato ? 'enviada' : 'recebida');
            });
        });

        socket.on('nova_mensagem', (msg) => {
            const tipo = msg.de === meuContato ? 'enviada' : 'recebida';
            adicionarMensagem(msg, tipo);
            
            if (msg.de !== meuContato && msg.de === contatoAtual) {
                notificar(\`💗 \${nomes[msg.de]}: \${msg.texto}\`);
            }
        });

        socket.on('usuario_online', (usuario) => {
            usuariosOnline.set(usuario.contato, usuario);
            atualizarStatus(usuario.contato, true);
            notificar(\`✨ \${usuario.nome} entrou\`);
        });

        socket.on('usuario_offline', (usuario) => {
            usuariosOnline.delete(usuario.contato);
            atualizarStatus(usuario.contato, false);
        });

        socket.on('alguem_digitando', (dados) => {
            if (dados.contato === contatoAtual) {
                digitandoSpan.textContent = \`\${nomes[dados.contato]} digitando...\`;
                setTimeout(() => { digitandoSpan.textContent = ''; }, 3000);
            }
        });

        function selecionarContato(contato) {
            contatoAtual = contato;
            
            document.querySelectorAll('.contato-card').forEach(c => {
                c.classList.remove('ativo');
                if (c.dataset.contato === contato) c.classList.add('ativo');
            });

            contatoAtualSpan.textContent = nomes[contato];
            atualizarStatus(contato, usuariosOnline.has(contato));
            
            fetch(\`/api/mensagens/\${contato}\`)
                .then(res => res.json())
                .then(msgs => {
                    mensagensDiv.innerHTML = '';
                    msgs.forEach(msg => {
                        adicionarMensagem(msg, msg.de === meuContato ? 'enviada' : 'recebida');
                    });
                });
        }

        function enviarMensagem() {
            const texto = mensagemInput.value.trim();
            if (!texto) return;

            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            socket.emit('mensagem', {
                de: meuContato,
                para: contatoAtual,
                texto: texto,
                hora: hora
            });
            
            mensagemInput.value = '';
        }

        function adicionarMensagem(msg, tipo) {
            const div = document.createElement('div');
            div.className = \`mensagem \${tipo}\`;
            div.innerHTML = \`
                \${msg.texto}
                <div class="footer">
                    \${msg.hora || ''}
                    \${msg.automatica ? '🤖' : ''}
                </div>
            \`;
            mensagensDiv.appendChild(div);
            mensagensDiv.scrollTop = mensagensDiv.scrollHeight;
        }

        function atualizarStatus(contato, online) {
            const badge = document.getElementById(\`status-\${contato}\`);
            if (badge) {
                badge.className = online ? 'online-badge online' : 'online-badge';
            }
            
            if (contato === contatoAtual) {
                statusTexto.textContent = online ? '● online' : '○ offline';
                statusTexto.style.color = online ? '#4caf50' : '#9e9e9e';
            }
        }

        function notificar(texto) {
            const notif = document.createElement('div');
            notif.className = 'notificacao';
            notif.textContent = texto;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }

        // Status do servidor
        setInterval(() => {
            fetch('/api/status')
                .then(res => res.json())
                .then(() => { serverStatus.innerHTML = '🟢'; })
                .catch(() => { serverStatus.innerHTML = '🔴'; });
        }, 5000);
    </script>
</body>
</html>
    `);
});

// API Status
app.get('/api/status', (req, res) => {
    res.json({
        nome: 'KatyZap',
        versao: '2.0.0',
        usuariosOnline: usuarios.size,
        timestamp: new Date().toISOString()
    });
});

// API Mensagens
app.get('/api/mensagens/:contato', (req, res) => {
    const contato = req.params.contato;
    res.json(mensagensSalvas[contato] || []);
});

// Socket.IO
io.on('connection', (socket) => {
    console.log(`💗 Novo usuário: ${socket.id}`);

    socket.on('entrar', (dados) => {
        const { nome, contato } = dados;
        usuarios.set(socket.id, { nome, contato, socketId: socket.id });
        
        io.emit('usuario_online', {
            socketId: socket.id,
            nome: nome,
            contato: contato
        });

        socket.emit('historico', mensagensSalvas[contato] || []);
        
        console.log(`👤 ${nome} entrou como ${contato}`);
    });

    socket.on('mensagem', (dados) => {
        const { de, para, texto, hora } = dados;
        
        const novaMensagem = {
            de: de,
            para: para,
            texto: texto,
            hora: hora,
            timestamp: Date.now()
        };
        
        if (mensagensSalvas[para]) {
            mensagensSalvas[para].push(novaMensagem);
            if (mensagensSalvas[para].length > 50) mensagensSalvas[para].shift();
        }

        io.emit('nova_mensagem', novaMensagem);

        // Resposta automática (30% chance)
        if (Math.random() < 0.3) {
            setTimeout(() => {
                const respostas = [
                    'Que legal! 💕', 'Entendi! 😊', 'Haha 😄', 
                    'Sério? Que massa!', 'Também acho! 💗', 'Tô online!'
                ];
                
                const resposta = {
                    de: para,
                    para: de,
                    texto: respostas[Math.floor(Math.random() * respostas.length)],
                    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Date.now(),
                    automatica: true
                };
                
                if (mensagensSalvas[de]) {
                    mensagensSalvas[de].push(resposta);
                }
                
                io.emit('nova_mensagem', resposta);
            }, 2000);
        }
    });

    socket.on('digitando', (dados) => {
        socket.broadcast.emit('alguem_digitando', dados);
    });

    socket.on('disconnect', () => {
        const usuario = usuarios.get(socket.id);
        if (usuario) {
            io.emit('usuario_offline', usuario);
            usuarios.delete(socket.id);
            console.log(`💔 ${usuario.nome} saiu`);
        }
    });
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('💗 KATYZAP - PRONTO PARA RAILWAY! 💗');
    console.log('='.repeat(50));
    console.log(`📱 Porta: ${PORT}`);
    console.log(`💕 Contatos: Dinho, Mara, Katy`);
    console.log(`🚀 Socket.IO ativo!`);
    console.log('='.repeat(50) + '\n');
});