// ========== KATYZAP - CHAT EM GRUPO ==========
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const usuarios = new Map(); // {socketId: {nome: 'Dinho', contato: 'dinho'}}

// Histórico único do grupo
let historicoGrupo = [
    { de: 'dinho', nome: 'Dinho', texto: 'E aí, galera! 💪', hora: '10:30', timestamp: Date.now() - 3600000 },
    { de: 'katy', nome: 'Katy', texto: 'Oiii 💗', hora: '10:31', timestamp: Date.now() - 3599000 },
    { de: 'mara', nome: 'Mara', texto: 'Bom dia! 🌸', hora: '09:15', timestamp: Date.now() - 7200000 },
    { de: 'dinho', nome: 'Dinho', texto: 'Bom dia, Mara!', hora: '09:16', timestamp: Date.now() - 7199000 },
    { de: 'katy', nome: 'Katy', texto: 'Prontos pro rolê? 💕', hora: '14:20', timestamp: Date.now() - 1800000 },
    { de: 'mara', nome: 'Mara', texto: 'Já tô chegando! 🚗', hora: '14:22', timestamp: Date.now() - 1798000 }
].sort((a, b) => a.timestamp - b.timestamp);

app.use(express.json());

// Rota principal
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>KatyZap - Grupo 💗</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        body {
            background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }

        .container {
            width: 100%;
            max-width: 380px;
            height: 750px;
            background: #fff5f7;
            border-radius: 35px;
            box-shadow: 0 20px 40px rgba(255, 105, 180, 0.3);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 3px solid #ffb6c1;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
            padding: 15px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 2px solid #ffb6c1;
        }

        .avatar {
            width: 45px;
            height: 45px;
            background: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            border: 3px solid #fff;
        }

        .header h1 {
            font-size: 20px;
            font-weight: 600;
        }

        .header h1 span {
            font-size: 12px;
            font-weight: normal;
            opacity: 0.9;
            display: block;
        }

        .online-count {
            margin-left: auto;
            background: rgba(255,255,255,0.2);
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
        }

        /* Seleção de usuário */
        .user-selector {
            display: flex;
            padding: 12px;
            gap: 8px;
            background: #ffe4ec;
            border-bottom: 2px solid #ffb6c1;
            justify-content: center;
        }

        .user-btn {
            background: white;
            border: 2px solid #ffb6c1;
            padding: 10px 20px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 15px;
            font-weight: 600;
            color: #444;
            flex: 1;
            justify-content: center;
            max-width: 110px;
        }

        .user-btn.ativo {
            background: #ff7eb3;
            color: white;
            border-color: #ff4d7a;
            transform: scale(1.02);
        }

        .user-btn .online-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #9e9e9e;
        }

        .user-btn.ativo .online-indicator {
            background: white;
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
            padding: 12px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #ff99aa;
        }

        .grupo-info {
            display: flex;
            flex-direction: column;
        }

        .grupo-nome {
            font-size: 16px;
            font-weight: bold;
            color: #4a2c5f;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .participantes {
            font-size: 11px;
            color: #663399;
        }

        .digitando {
            font-size: 12px;
            color: #666;
            font-style: italic;
            height: 18px;
        }

        .mensagens {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #fff5f9;
        }

        .mensagem {
            max-width: 85%;
            padding: 8px 12px;
            border-radius: 18px;
            position: relative;
            animation: fadeIn 0.3s ease;
            word-break: break-word;
            font-size: 14px;
            line-height: 1.4;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .mensagem.outra {
            background: white;
            border: 2px solid #ffb6c1;
            align-self: flex-start;
            border-bottom-left-radius: 4px;
        }

        .mensagem.minha {
            background: #ff7eb3;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
        }

        .mensagem .remetente {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 4px;
            color: #ff4d7a;
        }

        .mensagem.minha .remetente {
            color: rgba(255,255,255,0.9);
        }

        .mensagem .texto {
            margin-bottom: 4px;
        }

        .mensagem .footer {
            display: flex;
            justify-content: flex-end;
            gap: 5px;
            font-size: 9px;
            opacity: 0.7;
        }

        .mensagem.outra .footer {
            color: #666;
        }

        .mensagem.minha .footer {
            color: rgba(255,255,255,0.8);
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
            padding: 12px 18px;
            border: 2px solid #ffb6c1;
            border-radius: 30px;
            outline: none;
            font-size: 14px;
            background: white;
            color: #333;
        }

        .input-area input:disabled {
            background: #f5f5f5;
            cursor: not-allowed;
            opacity: 0.6;
        }

        .input-area input::placeholder {
            color: #999;
        }

        .input-area input:focus {
            border-color: #ff7eb3;
        }

        .btn-enviar {
            background: #ff7eb3;
            border: none;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            color: white;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .btn-enviar:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .btn-enviar:active:not(:disabled) {
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
            border-radius: 40px;
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

        .mensagens::-webkit-scrollbar {
            width: 4px;
        }

        .mensagens::-webkit-scrollbar-track {
            background: #ffe4ec;
        }

        .mensagens::-webkit-scrollbar-thumb {
            background: #ffb6c1;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="avatar">💗</div>
            <h1>KatyZap<br><span>Grupo das Amigas</span></h1>
            <div class="online-count" id="onlineCount">3 online</div>
        </div>

        <!-- Seleção de usuário (quem você é) -->
        <div class="user-selector" id="userSelector">
            <div class="user-btn" data-user="dinho" onclick="selecionarUsuario('dinho')">
                <span class="online-indicator" id="status-dinho"></span>
                <span>👨 Dinho</span>
            </div>
            <div class="user-btn" data-user="mara" onclick="selecionarUsuario('mara')">
                <span class="online-indicator" id="status-mara"></span>
                <span>👩 Mara</span>
            </div>
            <div class="user-btn" data-user="katy" onclick="selecionarUsuario('katy')">
                <span class="online-indicator" id="status-katy"></span>
                <span>👸 Katy</span>
            </div>
        </div>

        <!-- Chat Area -->
        <div class="chat-area">
            <div class="chat-header">
                <div class="grupo-info">
                    <div class="grupo-nome">
                        <span>💬 Grupo KatyZap</span>
                    </div>
                    <div class="participantes" id="participantesText">Dinho, Mara, Katy</div>
                </div>
                <div class="digitando" id="digitando"></div>
            </div>

            <!-- Mensagens -->
            <div class="mensagens" id="mensagens"></div>

            <!-- Input (só aparece depois de escolher quem é) -->
            <div class="input-area">
                <input type="text" id="mensagemInput" placeholder="Escolha seu nome acima para conversar..." disabled>
                <button class="btn-enviar" id="btnEnviar" disabled>➤</button>
            </div>
        </div>
    </div>

    <script>
        // ========== CONFIGURAÇÃO ==========
        const socket = io();
        let meuNome = '';
        let meuContato = '';
        let usuariosOnline = new Map();
        
        // Elementos
        const mensagensDiv = document.getElementById('mensagens');
        const mensagemInput = document.getElementById('mensagemInput');
        const btnEnviar = document.getElementById('btnEnviar');
        const digitandoSpan = document.getElementById('digitando');
        const onlineCount = document.getElementById('onlineCount');
        const participantesText = document.getElementById('participantesText');
        
        // Cores para cada usuário
        const cores = {
            dinho: '#FF6B6B',
            mara: '#4ECDC4',
            katy: '#FFB347'
        };

        // Nomes formatados
        const nomes = {
            dinho: 'Dinho',
            mara: 'Mara',
            katy: 'Katy'
        };

        // ========== FUNÇÕES ==========
        function selecionarUsuario(contato) {
            if (!meuContato) {
                meuContato = contato;
                meuNome = nomes[contato];
                
                // Atualizar UI dos botões
                document.querySelectorAll('.user-btn').forEach(btn => {
                    btn.classList.remove('ativo');
                    if (btn.dataset.user === contato) {
                        btn.classList.add('ativo');
                    }
                });

                // Habilitar input
                mensagemInput.disabled = false;
                btnEnviar.disabled = false;
                mensagemInput.placeholder = \`Digite como \${meuNome}... 💗\`;
                
                // Entrar no chat
                socket.emit('entrar', {
                    nome: meuNome,
                    contato: meuContato
                });

                // Carregar histórico
                fetch('/api/historico')
                    .then(res => res.json())
                    .then(historico => {
                        mensagensDiv.innerHTML = '';
                        historico.forEach(msg => {
                            adicionarMensagem(msg);
                        });
                    });

                setupEventListeners();
                
                notificar(\`💗 Você entrou como \${meuNome}\`);
            }
        }

        function setupEventListeners() {
            btnEnviar.addEventListener('click', enviarMensagem);
            
            mensagemInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') enviarMensagem();
            });

            mensagemInput.addEventListener('input', () => {
                socket.emit('digitando', { nome: meuNome });
            });
        }

        // Socket events
        socket.on('historico_grupo', (historico) => {
            mensagensDiv.innerHTML = '';
            historico.forEach(msg => {
                adicionarMensagem(msg);
            });
        });

        socket.on('nova_mensagem_grupo', (msg) => {
            adicionarMensagem(msg);
            
            if (msg.de !== meuContato) {
                notificar(\`💬 \${msg.nome}: \${msg.texto}\`);
            }
        });

        socket.on('usuario_online', (usuario) => {
            usuariosOnline.set(usuario.contato, usuario);
            atualizarStatus(usuario.contato, true);
            atualizarContagemOnline();
            notificar(\`✨ \${usuario.nome} entrou no grupo\`);
        });

        socket.on('usuario_offline', (usuario) => {
            usuariosOnline.delete(usuario.contato);
            atualizarStatus(usuario.contato, false);
            atualizarContagemOnline();
        });

        socket.on('alguem_digitando', (dados) => {
            if (dados.nome !== meuNome) {
                digitandoSpan.textContent = \`\${dados.nome} está digitando...\`;
                setTimeout(() => { digitandoSpan.textContent = ''; }, 3000);
            }
        });

        function enviarMensagem() {
            if (!meuContato) {
                alert('Escolha seu nome primeiro!');
                return;
            }

            const texto = mensagemInput.value.trim();
            if (!texto) return;

            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            socket.emit('mensagem_grupo', {
                de: meuContato,
                nome: meuNome,
                texto: texto,
                hora: hora
            });
            
            mensagemInput.value = '';
        }

        function adicionarMensagem(msg) {
            const div = document.createElement('div');
            div.className = \`mensagem \${msg.de === meuContato ? 'minha' : 'outra'}\`;
            
            // Remetente (se não for minha mensagem)
            if (msg.de !== meuContato) {
                const remetente = document.createElement('div');
                remetente.className = 'remetente';
                remetente.textContent = msg.nome;
                remetente.style.color = cores[msg.de] || '#ff4d7a';
                div.appendChild(remetente);
            }
            
            // Texto da mensagem
            const texto = document.createElement('div');
            texto.className = 'texto';
            texto.textContent = msg.texto;
            div.appendChild(texto);
            
            // Footer com hora
            const footer = document.createElement('div');
            footer.className = 'footer';
            footer.textContent = msg.hora || '';
            if (msg.automatica) footer.textContent += ' 🤖';
            div.appendChild(footer);
            
            mensagensDiv.appendChild(div);
            mensagensDiv.scrollTop = mensagensDiv.scrollHeight;
        }

        function atualizarStatus(contato, online) {
            const badge = document.getElementById(\`status-\${contato}\`);
            if (badge) {
                badge.style.background = online ? '#4caf50' : '#9e9e9e';
            }
        }

        function atualizarContagemOnline() {
            const count = usuariosOnline.size;
            onlineCount.textContent = \`\${count} online\`;
            
            const nomesOnline = Array.from(usuariosOnline.values())
                .map(u => u.nome)
                .join(', ');
            participantesText.textContent = nomesOnline || 'Ninguém online';
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
                .catch(() => {});
        }, 5000);
    </script>
</body>
</html>`);
});

// API Status
app.get('/api/status', (req, res) => {
    res.json({
        nome: 'KatyZap',
        usuariosOnline: usuarios.size,
        online: Array.from(usuarios.values()).map(u => u.nome)
    });
});

// API Histórico do grupo
app.get('/api/historico', (req, res) => {
    res.json(historicoGrupo);
});

// Socket.IO
io.on('connection', (socket) => {
    console.log(`💗 Novo usuário: ${socket.id}`);

    socket.on('entrar', (dados) => {
        const { nome, contato } = dados;
        usuarios.set(socket.id, { nome, contato, socketId: socket.id });
        
        // Enviar histórico para o novo usuário
        socket.emit('historico_grupo', historicoGrupo);
        
        // Avisar todos que novo usuário entrou
        io.emit('usuario_online', {
            socketId: socket.id,
            nome: nome,
            contato: contato
        });
        
        console.log(`👤 ${nome} entrou no grupo`);
    });

    socket.on('mensagem_grupo', (dados) => {
        const { de, nome, texto, hora } = dados;
        
        const novaMensagem = {
            de: de,
            nome: nome,
            texto: texto,
            hora: hora,
            timestamp: Date.now()
        };
        
        // Salvar no histórico
        historicoGrupo.push(novaMensagem);
        if (historicoGrupo.length > 100) historicoGrupo.shift();
        
        // Enviar para todos
        io.emit('nova_mensagem_grupo', novaMensagem);

        // Resposta automática (10% chance)
        if (Math.random() < 0.1) {
            setTimeout(() => {
                const respostas = [
                    { de: 'katy', nome: 'Katy', texto: 'Que fofo! 💗' },
                    { de: 'mara', nome: 'Mara', texto: 'Concordo! 🌸' },
                    { de: 'dinho', nome: 'Dinho', texto: 'Haha legal! 😄' }
                ];
                
                const resposta = respostas[Math.floor(Math.random() * respostas.length)];
                resposta.hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                resposta.timestamp = Date.now();
                resposta.automatica = true;
                
                historicoGrupo.push(resposta);
                io.emit('nova_mensagem_grupo', resposta);
            }, 3000);
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
            console.log(`💔 ${usuario.nome} saiu do grupo`);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('💗 KATYZAP - GRUPO ÚNICO 💗');
    console.log('='.repeat(50));
    console.log(`📱 Porta: ${PORT}`);
    console.log(`👥 Chat em grupo com Dinho, Mara e Katy`);
    console.log('='.repeat(50) + '\n');
});
