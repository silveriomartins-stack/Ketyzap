// ========== DINHOZAP - COM PAINEL DE ADMIN ==========
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

// Configuração inicial de participantes
let participantes = [
    { id: 'dinho', nome: 'Dinho', emoji: '👨', cor: '#4299e1' },
    { id: 'gabi', nome: 'Gabi', emoji: '👩', cor: '#9f7aea' },
    { id: 'amanda', nome: 'Amanda', emoji: '👸', cor: '#f687b3' }
];

// Senha para limpar conversas e acessar admin
const SENHA_ADMIN = "dinho123456";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>DinhoZap - Grupo 💙</title>
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
            position: relative;
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

        /* Botões do Header */
        .btn-admin, .btn-limpar {
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

        .btn-admin:hover, .btn-limpar:hover {
            background: #2c5282;
            color: white;
            transform: scale(1.1);
        }

        /* Seleção de usuário */
        .user-selector {
            display: flex;
            padding: 12px;
            gap: 8px;
            background: #0f1f2b;
            border-bottom: 2px solid #2c3e50;
            justify-content: center;
            flex-wrap: wrap;
            min-height: 80px;
            overflow-x: auto;
        }

        .user-btn {
            background: #1a2b3a;
            border: 2px solid #2c5282;
            padding: 10px 15px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
            font-weight: 600;
            color: #e2e8f0;
            flex: 1;
            justify-content: center;
            min-width: 100px;
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

        /* Modal */
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
            width: 320px;
            text-align: center;
            border: 3px solid #2c5282;
            transform: scale(0.8);
            transition: all 0.3s;
            max-height: 80vh;
            overflow-y: auto;
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

        .modal input, .modal select {
            width: 100%;
            padding: 12px;
            border: 2px solid #2c5282;
            border-radius: 25px;
            margin-bottom: 15px;
            font-size: 14px;
            outline: none;
            background: #1a2b3a;
            color: #e2e8f0;
        }

        .modal input:focus, .modal select:focus {
            border-color: #4299e1;
        }

        .modal-botoes {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }

        .modal-btn {
            padding: 10px 20px;
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

        .modal-btn.remover {
            background: #9b2c2c;
            color: white;
            border: 2px solid #fc8181;
        }

        .modal-btn.confirmar:hover {
            background: #4299e1;
        }

        .modal-btn.cancelar:hover {
            background: #4a5568;
            color: white;
        }

        .modal-btn.remover:hover {
            background: #c53030;
        }

        .erro-msg {
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

        /* Lista de participantes no modal */
        .participante-item {
            background: #1a2b3a;
            border: 2px solid #2c5282;
            border-radius: 30px;
            padding: 10px 15px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #e2e8f0;
        }

        .participante-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .participante-cor {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
        }

        .btn-remover-participante {
            background: none;
            border: none;
            color: #fc8181;
            font-size: 18px;
            cursor: pointer;
            padding: 5px;
        }

        .btn-remover-participante:hover {
            color: #feb2b2;
        }

        .cores-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 15px;
        }

        .cor-opcao {
            width: 100%;
            aspect-ratio: 1;
            border-radius: 50%;
            cursor: pointer;
            border: 3px solid transparent;
            transition: all 0.3s;
        }

        .cor-opcao.selecionada {
            border-color: white;
            transform: scale(1.1);
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
            <button class="btn-admin" onclick="abrirModalAdmin()" title="Gerenciar participantes">⚙️</button>
            <button class="btn-limpar" onclick="abrirModalSenha()" title="Limpar todas as mensagens">🗑️</button>
        </div>

        <!-- Seleção de usuário (dinâmico) -->
        <div class="user-selector" id="userSelector"></div>

        <!-- Chat Area -->
        <div class="chat-area">
            <div class="chat-header">
                <div class="grupo-info">
                    <div class="grupo-nome">
                        <span>💬 Grupo do Dinho</span>
                    </div>
                    <div class="participantes" id="participantesText">Carregando...</div>
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

    <!-- Modal de Admin -->
    <div class="modal-overlay" id="modalAdmin">
        <div class="modal">
            <h3>⚙️ Administração</h3>
            <p>Digite a senha para gerenciar participantes:</p>
            <input type="password" id="senhaAdminInput" placeholder="senha admin">
            <div class="erro-msg" id="erroAdminSenha">Senha incorreta!</div>
            
            <div id="adminConteudo" style="display: none;">
                <hr style="border: 1px solid #2c5282; margin: 15px 0;">
                
                <h4>Participantes Atuais:</h4>
                <div id="listaParticipantes"></div>
                
                <hr style="border: 1px solid #2c5282; margin: 15px 0;">
                
                <h4>Adicionar Novo Participante:</h4>
                <input type="text" id="novoNome" placeholder="Nome">
                <select id="novoEmoji">
                    <option value="👨">👨 Homem</option>
                    <option value="👩">👩 Mulher</option>
                    <option value="👧">👧 Menina</option>
                    <option value="👦">👦 Menino</option>
                    <option value="🧑">🧑 Pessoa</option>
                    <option value="👤">👤 Silhueta</option>
                </select>
                
                <p>Cor:</p>
                <div class="cores-grid" id="seletorCores">
                    <div class="cor-opcao" style="background: #4299e1;" onclick="selecionarCor('#4299e1')"></div>
                    <div class="cor-opcao" style="background: #9f7aea;" onclick="selecionarCor('#9f7aea')"></div>
                    <div class="cor-opcao" style="background: #f687b3;" onclick="selecionarCor('#f687b3')"></div>
                    <div class="cor-opcao" style="background: #48bb78;" onclick="selecionarCor('#48bb78')"></div>
                    <div class="cor-opcao" style="background: #ed8936;" onclick="selecionarCor('#ed8936')"></div>
                    <div class="cor-opcao" style="background: #f56565;" onclick="selecionarCor('#f56565')"></div>
                    <div class="cor-opcao" style="background: #38b2ac;" onclick="selecionarCor('#38b2ac')"></div>
                    <div class="cor-opcao" style="background: #b794f4;" onclick="selecionarCor('#b794f4')"></div>
                </div>
                
                <input type="hidden" id="novaCor" value="#4299e1">
                
                <div class="modal-botoes">
                    <button class="modal-btn confirmar" onclick="adicionarParticipante()">Adicionar</button>
                </div>
            </div>
            
            <div class="modal-botoes" style="margin-top: 20px;">
                <button class="modal-btn cancelar" onclick="fecharModalAdmin()">Fechar</button>
            </div>
        </div>
    </div>

    <!-- Modal de senha para limpar mensagens -->
    <div class="modal-overlay" id="modalSenha">
        <div class="modal">
            <h3>🔐 Limpar Conversa</h3>
            <p>Digite a senha para limpar todas as mensagens:</p>
            <input type="password" id="senhaInput" placeholder="••••••••">
            <div class="erro-msg" id="erroSenha">Senha incorreta!</div>
            <div class="modal-botoes">
                <button class="modal-btn cancelar" onclick="fecharModalSenha()">Cancelar</button>
                <button class="modal-btn confirmar" onclick="verificarSenha()">Limpar</button>
            </div>
        </div>
    </div>

    <script>
        // ========== CONFIGURAÇÃO ==========
        const socket = io();
        let meuNome = '';
        let meuContato = '';
        let usuariosOnline = new Map();
        let participantes = [];
        let corSelecionada = '#4299e1';
        
        // Elementos
        const mensagensDiv = document.getElementById('mensagens');
        const emptyState = document.getElementById('emptyState');
        const mensagemInput = document.getElementById('mensagemInput');
        const btnEnviar = document.getElementById('btnEnviar');
        const digitandoSpan = document.getElementById('digitando');
        const onlineCount = document.getElementById('onlineCount');
        const participantesText = document.getElementById('participantesText');
        const userSelector = document.getElementById('userSelector');
        
        // Modais
        const modalAdmin = document.getElementById('modalAdmin');
        const modalSenha = document.getElementById('modalSenha');
        const senhaInput = document.getElementById('senhaInput');
        const senhaAdminInput = document.getElementById('senhaAdminInput');
        const erroSenha = document.getElementById('erroSenha');
        const erroAdminSenha = document.getElementById('erroAdminSenha');
        const adminConteudo = document.getElementById('adminConteudo');
        const listaParticipantes = document.getElementById('listaParticipantes');
        const novoNome = document.getElementById('novoNome');
        const novoEmoji = document.getElementById('novoEmoji');
        const novaCor = document.getElementById('novaCor');

        // ========== CARREGAR PARTICIPANTES ==========
        function carregarParticipantes() {
            fetch('/api/participantes')
                .then(res => res.json())
                .then(data => {
                    participantes = data;
                    atualizarBotoesUsuario();
                    participantesText.textContent = participantes.map(p => p.nome).join(', ');
                });
        }

        // ========== ATUALIZAR BOTÕES ==========
        function atualizarBotoesUsuario() {
            userSelector.innerHTML = '';
            participantes.forEach(p => {
                const btn = document.createElement('div');
                btn.className = 'user-btn';
                btn.dataset.user = p.id;
                btn.setAttribute('onclick', \`selecionarUsuario('\${p.id}')\`);
                
                const indicator = document.createElement('span');
                indicator.className = 'online-indicator';
                indicator.id = \`status-\${p.id}\`;
                
                const span = document.createElement('span');
                span.textContent = \`\${p.emoji} \${p.nome}\`;
                
                btn.appendChild(indicator);
                btn.appendChild(span);
                userSelector.appendChild(btn);
            });
        }

        // ========== FUNÇÕES ==========
        function selecionarUsuario(contato) {
            if (!meuContato) {
                const participante = participantes.find(p => p.id === contato);
                if (!participante) return;
                
                meuContato = contato;
                meuNome = participante.nome;
                
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

                notificar(\`💙 Você entrou como \${meuNome}\`);
            }
        }

        // Modal Admin
        function abrirModalAdmin() {
            modalAdmin.classList.add('ativo');
            senhaAdminInput.value = '';
            adminConteudo.style.display = 'none';
            erroAdminSenha.style.display = 'none';
        }

        function fecharModalAdmin() {
            modalAdmin.classList.remove('ativo');
        }

        function verificarAdminSenha() {
            const senha = senhaAdminInput.value;
            
            fetch('/api/verificar-senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senha: senha })
            })
            .then(res => res.json())
            .then(data => {
                if (data.valida) {
                    adminConteudo.style.display = 'block';
                    erroAdminSenha.style.display = 'none';
                    carregarListaParticipantes();
                } else {
                    erroAdminSenha.style.display = 'block';
                }
            });
        }

        function carregarListaParticipantes() {
            fetch('/api/participantes')
                .then(res => res.json())
                .then(data => {
                    listaParticipantes.innerHTML = '';
                    data.forEach(p => {
                        const div = document.createElement('div');
                        div.className = 'participante-item';
                        div.innerHTML = \`
                            <div class="participante-info">
                                <span class="participante-cor" style="background: \${p.cor}"></span>
                                <span>\${p.emoji} \${p.nome}</span>
                            </div>
                            <button class="btn-remover-participante" onclick="removerParticipante('\${p.id}')">✖</button>
                        \`;
                        listaParticipantes.appendChild(div);
                    });
                });
        }

        function selecionarCor(cor) {
            corSelecionada = cor;
            novaCor.value = cor;
            
            document.querySelectorAll('.cor-opcao').forEach(el => {
                el.classList.remove('selecionada');
                if (el.style.background === cor) {
                    el.classList.add('selecionada');
                }
            });
        }

        function adicionarParticipante() {
            const nome = novoNome.value.trim();
            const emoji = novoEmoji.value;
            
            if (!nome) {
                alert('Digite um nome!');
                return;
            }
            
            fetch('/api/adicionar-participante', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nome,
                    emoji: emoji,
                    cor: corSelecionada
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    carregarParticipantes();
                    carregarListaParticipantes();
                    novoNome.value = '';
                    notificar(\`✅ \${nome} adicionado!\`);
                }
            });
        }

        function removerParticipante(id) {
            if (participantes.length <= 1) {
                alert('Deve ter pelo menos 1 participante!');
                return;
            }
            
            fetch('/api/remover-participante', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    carregarParticipantes();
                    carregarListaParticipantes();
                    notificar('✅ Participante removido!');
                }
            });
        }

        // Modal Limpar
        function abrirModalSenha() {
            modalSenha.classList.add('ativo');
            senhaInput.value = '';
            erroSenha.style.display = 'none';
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
                    fetch('/api/limpar', { method: 'POST' })
                        .then(res => res.json())
                        .then(() => {
                            mensagensDiv.innerHTML = '';
                            mensagensDiv.appendChild(emptyState);
                            notificar('✨ Mensagens limpas!');
                            fecharModalSenha();
                        });
                } else {
                    erroSenha.style.display = 'block';
                    notificar('❌ Senha incorreta!', true);
                }
            });
        }

        // Socket events
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
        });

        socket.on('usuario_online', (usuario) => {
            usuariosOnline.set(usuario.contato, usuario);
            atualizarStatus(usuario.contato, true);
            atualizarContagemOnline();
            notificar(\`✨ \${usuario.nome} entrou\`);
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

        socket.on('participantes_atualizados', () => {
            carregarParticipantes();
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
            const participante = participantes.find(p => p.id === msg.de);
            const cor = participante ? participante.cor : '#90cdf4';
            
            const div = document.createElement('div');
            div.className = \`mensagem \${msg.de === meuContato ? 'minha' : 'outra'}\`;
            
            if (msg.de !== meuContato) {
                const remetente = document.createElement('div');
                remetente.className = 'remetente';
                remetente.textContent = msg.nome;
                remetente.style.color = cor;
                div.appendChild(remetente);
            }
            
            const texto = document.createElement('div');
            texto.className = 'texto';
            texto.textContent = msg.texto;
            div.appendChild(texto);
            
            const footer = document.createElement('div');
            footer.className = 'footer';
            footer.textContent = msg.hora || '';
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
        }

        function notificar(texto, erro = false) {
            const notif = document.createElement('div');
            notif.className = 'notificacao' + (erro ? ' erro' : '');
            notif.textContent = texto;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }

        // Event Listeners
        senhaAdminInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarAdminSenha();
        });

        senhaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarSenha();
        });

        btnEnviar.addEventListener('click', enviarMensagem);
        mensagemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarMensagem();
        });
        mensagemInput.addEventListener('input', () => {
            if (meuNome) {
                socket.emit('digitando', { nome: meuNome });
            }
        });

        // Inicializar
        carregarParticipantes();

        // Tornar funções globais
        window.selecionarUsuario = selecionarUsuario;
        window.abrirModalAdmin = abrirModalAdmin;
        window.fecharModalAdmin = fecharModalAdmin;
        window.verificarAdminSenha = verificarAdminSenha;
        window.abrirModalSenha = abrirModalSenha;
        window.fecharModalSenha = fecharModalSenha;
        window.verificarSenha = verificarSenha;
        window.adicionarParticipante = adicionarParticipante;
        window.removerParticipante = removerParticipante;
        window.selecionarCor = selecionarCor;
    </script>
</body>
</html>`);
});

// API Participantes
app.get('/api/participantes', (req, res) => {
    res.json(participantes);
});

// API Adicionar participante
app.post('/api/adicionar-participante', (req, res) => {
    const { nome, emoji, cor } = req.body;
    
    const novoParticipante = {
        id: nome.toLowerCase().replace(/\s/g, '') + Date.now(),
        nome: nome,
        emoji: emoji || '👤',
        cor: cor || '#4299e1'
    };
    
    participantes.push(novoParticipante);
    io.emit('participantes_atualizados');
    
    res.json({ success: true, participante: novoParticipante });
});

// API Remover participante
app.post('/api/remover-participante', (req, res) => {
    const { id } = req.body;
    
    if (participantes.length <= 1) {
        return res.json({ success: false, error: 'Deve ter pelo menos 1 participante' });
    }
    
    participantes = participantes.filter(p => p.id !== id);
    io.emit('participantes_atualizados');
    
    res.json({ success: true });
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
    res.json({ valida: senha === SENHA_ADMIN });
});

// API Limpar mensagens
app.post('/api/limpar', (req, res) => {
    historicoGrupo = [];
    io.emit('mensagens_limpas');
    res.json({ success: true });
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
    console.log('💙 DINHOZAP - COM PAINEL ADMIN 💙');
    console.log('='.repeat(50));
    console.log(`📱 Porta: ${PORT}`);
    console.log(`🔐 Senha Admin: dinho123456`);
    console.log(`👥 Gerencie participantes pelo botão ⚙️`);
    console.log('='.repeat(50) + '\n');
});

