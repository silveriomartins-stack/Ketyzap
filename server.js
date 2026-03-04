// ========== DINHOZAP - CHAT EXCLUSIVO ==========
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
const usuarios = new Map();
let historicoGrupo = [];

// Senha para limpar conversas
const SENHA_LIMPAR = "dinho123456";

app.use(express.json());

// Rota principal
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>DinhoZap - Preto & Azul 💙</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        body {
            background: linear-gradient(135deg, #0a0f0f 0%, #1a2f3f 100%);
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
            background: #0f1a1f;
            border-radius: 35px;
            box-shadow: 0 20px 40px rgba(0, 100, 255, 0.3);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 3px solid #2c3e50;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #0a1929 0%, #0d2b3e 100%);
            padding: 15px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 2px solid #2c5282;
        }

        .avatar {
            width: 45px;
            height: 45px;
            background: #1e3a5f;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            border: 3px solid #4299e1;
            color: #4299e1;
        }

        .header h1 {
            font-size: 20px;
            font-weight: 600;
            color: #e2e8f0;
        }

        .header h1 span {
            font-size: 12px;
            font-weight: normal;
            opacity: 0.8;
            display: block;
            color: #90cdf4;
        }

        .online-count {
            margin-left: auto;
            background: #1e3a5f;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            color: #90cdf4;
            border: 1px solid #4299e1;
        }

        /* Botão Limpar */
        .btn-limpar {
            background: #1e3a5f;
            border: 1px solid #4299e1;
            color: #90cdf4;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 5px;
            transition: all 0.3s;
        }

        .btn-limpar:hover {
            background: #2c5282;
            color: white;
            transform: scale(1.1);
        }

        /* Seleção de usuário */
        .user-selector {
            display: flex;
            padding: 12px;
            gap: 15px;
            background: #0f1f2b;
            border-bottom: 2px solid #2c3e50;
            justify-content: center;
        }

        .user-btn {
            background: #1a2b3a;
            border: 2px solid #2c5282;
            padding: 12px 20px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 16px;
            font-weight: 600;
            color: #e2e8f0;
            flex: 1;
            justify-content: center;
            max-width: 140px;
        }

        .user-btn.ativo {
            background: #2c5282;
            color: white;
            border-color: #63b3ed;
            transform: scale(1.02);
            box-shadow: 0 0 15px rgba(66, 153, 225, 0.5);
        }

        .user-btn .online-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #4a5568;
            transition: background 0.3s;
        }

        .user-btn.ativo .online-indicator {
            background: #9ae6b4;
        }

        /* Chat Area */
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #0f1a1f;
            overflow: hidden;
        }

        .chat-header {
            background: #0d2b3e;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2c5282;
        }

        .grupo-info {
            display: flex;
            flex-direction: column;
        }

        .grupo-nome {
            font-size: 15px;
            font-weight: bold;
            color: #90cdf4;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .participantes {
            font-size: 10px;
            color: #a0aec0;
        }

        .digitando {
            font-size: 11px;
            color: #90cdf4;
            font-style: italic;
            height: 16px;
            text-align: right;
        }

        .mensagens {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #0f1a1f;
        }

        .mensagem {
            max-width: 85%;
            padding: 10px 14px;
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
            background: #1a2b3a;
            border: 2px solid #2c5282;
            align-self: flex-start;
            border-bottom-left-radius: 4px;
            color: #e2e8f0;
        }

        .mensagem.minha {
            background: #2c5282;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
            border: 2px solid #4299e1;
        }

        .mensagem .remetente {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 4px;
            color: #90cdf4;
        }

        .mensagem.minha .remetente {
            color: #bee3f8;
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
            color: #a0aec0;
        }

        .mensagem.minha .footer {
            color: #bee3f8;
        }

        /* Input Area */
        .input-area {
            background: #0f1f2b;
            padding: 12px;
            display: flex;
            gap: 8px;
            border-top: 2px solid #2c5282;
        }

        .input-area input {
            flex: 1;
            padding: 12px 18px;
            border: 2px solid #2c5282;
            border-radius: 30px;
            outline: none;
            font-size: 14px;
            background: #1a2b3a;
            color: #e2e8f0;
        }

        .input-area input:disabled {
            background: #2d3748;
            cursor: not-allowed;
            opacity: 0.6;
            color: #a0aec0;
        }

        .input-area input::placeholder {
            color: #718096;
        }

        .input-area input:focus {
            border-color: #4299e1;
            box-shadow: 0 0 10px rgba(66, 153, 225, 0.3);
        }

        .btn-enviar {
            background: #2c5282;
            border: 2px solid #4299e1;
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
            background: #2d3748;
            border-color: #4a5568;
            color: #718096;
            cursor: not-allowed;
        }

        .btn-enviar:active:not(:disabled) {
            transform: scale(0.95);
            background: #4299e1;
        }

        /* Modal de senha */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }

        .modal-overlay.ativo {
            opacity: 1;
            visibility: visible;
        }

        .modal {
            background: #0f1f2b;
            border-radius: 30px;
            padding: 25px;
            width: 300px;
            text-align: center;
            border: 3px solid #2c5282;
            transform: scale(0.8);
            transition: all 0.3s;
        }

        .modal-overlay.ativo .modal {
            transform: scale(1);
        }

        .modal h3 {
            color: #90cdf4;
            margin-bottom: 15px;
            font-size: 20px;
        }

        .modal p {
            color: #a0aec0;
            margin-bottom: 15px;
            font-size: 14px;
        }

        .modal input {
            width: 100%;
            padding: 12px;
            border: 2px solid #2c5282;
            border-radius: 25px;
            margin-bottom: 20px;
            font-size: 14px;
            outline: none;
            text-align: center;
            background: #1a2b3a;
            color: #e2e8f0;
        }

        .modal input:focus {
            border-color: #4299e1;
        }

        .modal-botoes {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .modal-btn {
            padding: 10px 25px;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            flex: 1;
        }

        .modal-btn.confirmar {
            background: #2c5282;
            color: white;
            border: 2px solid #4299e1;
        }

        .modal-btn.cancelar {
            background: #2d3748;
            color: #a0aec0;
            border: 2px solid #4a5568;
        }

        .modal-btn.confirmar:hover {
            background: #4299e1;
        }

        .modal-btn.cancelar:hover {
            background: #4a5568;
            color: white;
        }

        .erro-senha {
            color: #fc8181;
            font-size: 12px;
            margin-top: -10px;
            margin-bottom: 10px;
            display: none;
        }

        .notificacao {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #2c5282;
            color: white;
            padding: 10px 20px;
            border-radius: 40px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            z-index: 1000;
            animation: slideDown 0.3s ease;
            font-size: 14px;
            border: 2px solid #4299e1;
        }

        .notificacao.erro {
            background: #9b2c2c;
            border-color: #fc8181;
        }

        @keyframes slideDown {
            from { top: -100px; }
            to { top: 20px; }
        }

        .mensagens::-webkit-scrollbar {
            width: 4px;
        }

        .mensagens::-webkit-scrollbar-track {
            background: #1a2b3a;
        }

        .mensagens::-webkit-scrollbar-thumb {
            background: #2c5282;
            border-radius: 4px;
        }

        .empty-state {
            text-align: center;
            color: #718096;
            padding: 40px 20px;
            font-size: 14px;
        }

        .senha-hint {
            font-size: 11px;
            color: #718096;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="avatar">💙</div>
            <h1>DinhoZap<br><span>by Dinho</span></h1>
            <div class="online-count" id="onlineCount">0 online</div>
            <button class="btn-limpar" onclick="abrirModalSenha()" title="Limpar todas as mensagens (requer senha)">🗑️</button>
        </div>

        <!-- Seleção de usuário -->
        <div class="user-selector" id="userSelector">
            <div class="user-btn" data-user="dinho" onclick="selecionarUsuario('dinho')">
                <span class="online-indicator" id="status-dinho"></span>
                <span>👨 Dinho</span>
            </div>
            <div class="user-btn" data-user="liliane" onclick="selecionarUsuario('liliane')">
                <span class="online-indicator" id="status-liliane"></span>
                <span>👩 Liliane</span>
            </div>
        </div>

        <!-- Chat Area -->
        <div class="chat-area">
            <div class="chat-header">
                <div class="grupo-info">
                    <div class="grupo-nome">
                        <span>💬 Conversa Exclusiva</span>
                    </div>
                    <div class="participantes" id="participantesText">Ninguém online</div>
                </div>
                <div class="digitando" id="digitando"></div>
            </div>

            <!-- Mensagens -->
            <div class="mensagens" id="mensagens">
                <div class="empty-state" id="emptyState">
                    💙 Nenhuma mensagem ainda<br>
                    Comece a conversar!
                </div>
            </div>

            <!-- Input -->
            <div class="input-area">
                <input type="text" id="mensagemInput" placeholder="Escolha seu nome acima para conversar..." disabled>
                <button class="btn-enviar" id="btnEnviar" disabled>➤</button>
            </div>
        </div>
    </div>

    <!-- Modal de senha para limpar mensagens -->
    <div class="modal-overlay" id="modalSenha">
        <div class="modal">
            <h3>🔐 Área Restrita</h3>
            <p>Digite a senha para limpar todas as mensagens:</p>
            <input type="password" id="senhaInput" placeholder="••••••••" maxlength="20">
            <div class="erro-senha" id="erroSenha">Senha incorreta!</div>
            <div class="modal-botoes">
                <button class="modal-btn cancelar" onclick="fecharModalSenha()">Cancelar</button>
                <button class="modal-btn confirmar" onclick="verificarSenha()">Limpar</button>
            </div>
            <div class="senha-hint">💡 Apenas o Dinho sabe a senha</div>
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
        const emptyState = document.getElementById('emptyState');
        const mensagemInput = document.getElementById('mensagemInput');
        const btnEnviar = document.getElementById('btnEnviar');
        const digitandoSpan = document.getElementById('digitando');
        const onlineCount = document.getElementById('onlineCount');
        const participantesText = document.getElementById('participantesText');
        const modalSenha = document.getElementById('modalSenha');
        const senhaInput = document.getElementById('senhaInput');
        const erroSenha = document.getElementById('erroSenha');
        
        // Cores para cada usuário
        const cores = {
            dinho: '#4299e1',
            liliane: '#9f7aea'
        };

        // Nomes formatados
        const nomes = {
            dinho: 'Dinho',
            liliane: 'Liliane'
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
                mensagemInput.placeholder = \`Digite como \${meuNome}... 💙\`;
                mensagemInput.focus();
                
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
                        if (historico.length === 0) {
                            mensagensDiv.appendChild(emptyState);
                        } else {
                            historico.forEach(msg => {
                                adicionarMensagem(msg);
                            });
                        }
                    });

                setupEventListeners();
                
                notificar(\`💙 Você entrou como \${meuNome}\`);
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

            senhaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') verificarSenha();
            });
        }

        // Modal functions
        function abrirModalSenha() {
            modalSenha.classList.add('ativo');
            senhaInput.value = '';
            erroSenha.style.display = 'none';
            setTimeout(() => senhaInput.focus(), 300);
        }

        function fecharModalSenha() {
            modalSenha.classList.remove('ativo');
        }

        function verificarSenha() {
            const senha = senhaInput.value;
            
            fetch('/api/verificar-senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senha: senha })
            })
            .then(res => res.json())
            .then(data => {
                if (data.valida) {
                    // Senha correta - limpar mensagens
                    fetch('/api/limpar', { method: 'POST' })
                        .then(res => res.json())
                        .then(() => {
                            mensagensDiv.innerHTML = '';
                            mensagensDiv.appendChild(emptyState);
                            notificar('✨ Todas as mensagens foram limpas!');
                            fecharModalSenha();
                        });
                } else {
                    // Senha errada
                    erroSenha.style.display = 'block';
                    senhaInput.style.borderColor = '#fc8181';
                    notificar('❌ Senha incorreta!', true);
                }
            });
        }

        // Socket events
        socket.on('historico_grupo', (historico) => {
            mensagensDiv.innerHTML = '';
            if (historico.length === 0) {
                mensagensDiv.appendChild(emptyState);
            } else {
                historico.forEach(msg => {
                    adicionarMensagem(msg);
                });
            }
        });

        socket.on('nova_mensagem_grupo', (msg) => {
            if (mensagensDiv.contains(emptyState)) {
                mensagensDiv.innerHTML = '';
            }
            adicionarMensagem(msg);
            
            if (msg.de !== meuContato) {
                notificar(\`💬 \${msg.nome}: \${msg.texto}\`);
            }
        });

        socket.on('mensagens_limpas', () => {
            mensagensDiv.innerHTML = '';
            mensagensDiv.appendChild(emptyState);
            notificar('🧹 Chat foi limpo por alguém');
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
                remetente.style.color = cores[msg.de] || '#90cdf4';
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
                badge.style.background = online ? '#9ae6b4' : '#4a5568';
            }
        }

        function atualizarContagemOnline() {
            const count = usuariosOnline.size;
            onlineCount.textContent = \`\${count} online\`;
            
            if (count === 0) {
                participantesText.textContent = 'Ninguém online';
            } else {
                const nomesOnline = Array.from(usuariosOnline.values())
                    .map(u => u.nome)
                    .join(', ');
                participantesText.textContent = nomesOnline;
            }
        }

        function notificar(texto, erro = false) {
            const notif = document.createElement('div');
            notif.className = 'notificacao' + (erro ? ' erro' : '');
            notif.textContent = texto;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }

        // Tornar funções globais
        window.selecionarUsuario = selecionarUsuario;
        window.abrirModalSenha = abrirModalSenha;
        window.fecharModalSenha = fecharModalSenha;
        window.verificarSenha = verificarSenha;
    </script>
</body>
</html>`);
});

// API Status
app.get('/api/status', (req, res) => {
    res.json({
        nome: 'DinhoZap',
        usuariosOnline: usuarios.size,
        online: Array.from(usuarios.values()).map(u => u.nome)
    });
});

// API Histórico
app.get('/api/historico', (req, res) => {
    res.json(historicoGrupo);
});

// API Verificar senha
app.post('/api/verificar-senha', (req, res) => {
    const { senha } = req.body;
    res.json({ valida: senha === SENHA_LIMPAR });
});

// API Limpar mensagens
app.post('/api/limpar', (req, res) => {
    historicoGrupo = [];
    io.emit('mensagens_limpas');
    res.json({ success: true, message: 'Histórico limpo!' });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log(`💙 Novo usuário: ${socket.id}`);

    socket.on('entrar', (dados) => {
        const { nome, contato } = dados;
        usuarios.set(socket.id, { nome, contato, socketId: socket.id });
        
        socket.emit('historico_grupo', historicoGrupo);
        
        io.emit('usuario_online', {
            socketId: socket.id,
            nome: nome,
            contato: contato
        });
        
        console.log(`👤 ${nome} entrou no DinhoZap`);
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
        
        historicoGrupo.push(novaMensagem);
        if (historicoGrupo.length > 200) historicoGrupo.shift();
        
        io.emit('nova_mensagem_grupo', novaMensagem);
    });

    socket.on('digitando', (dados) => {
        socket.broadcast.emit('alguem_digitando', dados);
    });

    socket.on('disconnect', () => {
        const usuario = usuarios.get(socket.id);
        if (usuario) {
            io.emit('usuario_offline', usuario);
            usuarios.delete(socket.id);
            console.log(`💔 ${usuario.nome} saiu do DinhoZap`);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('💙 DINHOZAP - PRETO E AZUL 💙');
    console.log('='.repeat(50));
    console.log(`📱 Porta: ${PORT}`);
    console.log(`👥 Contatos: Dinho e Liliane`);
    console.log(`🔐 Senha: dinho123456`);
    console.log(`🎨 Tema: Preto e Azul`);
    console.log('='.repeat(50) + '\n');
});
