const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const isMobile = /mobile|android|iphone/i.test(req.headers['user-agent'] || '');
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;

  res.send(isMobile ? getMobileHTML(fullUrl) : getDesktopHTML(fullUrl));
});

// ==================== CELULAR - VERSÃO SIMPLES E ESTÁVEL ====================
function getMobileHTML(fullUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
    <title>Sua Sorte BR</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: Arial, sans-serif;
            background: #0f001a;
            color: white;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            background: #ff00aa;
            padding: 15px;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
        }
        .info {
            background: #1f0033;
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            font-size: 15px;
        }
        .question-box {
            background: #2a0044;
            padding: 20px 15px;
            text-align: center;
        }
        .prize { color: gold; font-size: 16px; margin-bottom: 5px; }
        .question { font-size: 18px; margin: 10px 0; }
        .timer { font-size: 32px; color: #ff00aa; font-weight: bold; }

        .chat {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background: #1a002b;
        }
        .msg {
            margin: 8px 0;
            padding: 10px 14px;
            border-radius: 18px;
            max-width: 80%;
        }
        .msg.sent {
            background: #00ff99;
            color: black;
            align-self: flex-end;
            margin-left: auto;
        }
        .msg.received {
            background: #ff00aa;
            color: white;
        }

        .input-area {
            background: #1f0033;
            padding: 12px;
            display: flex;
            gap: 8px;
        }
        .input {
            flex: 1;
            padding: 14px;
            border-radius: 30px;
            border: 2px solid #ff00aa;
            background: #2a0044;
            color: white;
            font-size: 16px;
        }
        .send {
            background: #00ff99;
            color: black;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 22px;
        }

        .consent {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999;
        }
        .consent-box {
            background: #2a0044;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            border: 3px solid #ff00aa;
            max-width: 320px;
        }
    </style>
</head>
<body>

    <div class="consent" id="consent">
        <div class="consent-box">
            <h2>SUA SORTE BR</h2>
            <p>Este é um jogo ao vivo.</p>
            <p>O operador verá sua câmera, áudio e localização.</p>
            <button onclick="startGame()" style="margin-top:20px; padding:15px 30px; font-size:18px; background:#ff00aa; color:white; border:none; border-radius:50px; width:100%;">ACEITAR E JOGAR</button>
        </div>
    </div>

    <div id="main" style="display:none; flex-direction:column; height:100vh;">
        <div class="header">SUA SORTE BR</div>
        <div class="info">
            <span>Saldo:</span>
            <span id="balance" style="color:#00ff99;">R$ 0,00</span>
        </div>

        <div class="question-box">
            <div class="prize" id="prize">Prêmio: R$ 0,00</div>
            <div class="question" id="question">Aguardando pergunta...</div>
            <div class="timer" id="timer">30</div>
        </div>

        <div class="chat" id="chat"></div>

        <div class="input-area">
            <input type="text" class="input" id="msgInput" placeholder="Digite sua resposta...">
            <button class="send" id="sendBtn">➤</button>
        </div>
    </div>

    <video id="localVideo" autoplay playsinline muted style="display:none;"></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');
        let facingMode = 'user';

        function addMsg(text, sent) {
            const chat = document.getElementById('chat');
            const div = document.createElement('div');
            div.className = \`msg \${sent ? 'sent' : 'received'}\`;
            div.textContent = text;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        }

        async function startGame() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                document.getElementById('localVideo').srcObject = stream;

                // Envia vídeo
                setInterval(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 240;
                    canvas.height = 180;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(document.getElementById('localVideo'), 0, 0, 240, 180);
                    socket.emit('frame', canvas.toDataURL('image/jpeg', 0.6));
                }, 300);

                document.getElementById('consent').style.display = 'none';
                document.getElementById('main').style.display = 'flex';
                socket.emit('mobile_online');

            } catch(e) {
                alert("Permita câmera e microfone");
            }
        }

        document.getElementById('sendBtn').onclick = () => {
            const input = document.getElementById('msgInput');
            const text = input.value.trim();
            if (text) {
                addMsg(text, true);
                socket.emit('message', text);
                input.value = '';
            }
        };

        socket.on('question', (data) => {
            document.getElementById('question').textContent = data.question;
            document.getElementById('timer').textContent = data.time || 30;
            document.getElementById('prize').textContent = `Prêmio: R$ ${(data.prize || 0).toFixed(2)}`;
        });

        socket.on('message', (msg) => addMsg(msg, false));

        socket.on('toggle_camera', () => {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            // Reinicia câmera (simples)
            startGame();
        });
    </script>
</body>
</html>`;
}

// ==================== DESKTOP ====================
function getDesktopHTML(fullUrl) {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Controle - Sua Sorte BR</title>
    <style>
        body { background:#0a0a0a; color:white; font-family:Arial; padding:20px; text-align:center; }
        #video { max-width:90%; border:4px solid #ff00aa; border-radius:12px; margin:20px 0; }
        input, button { padding:12px; margin:8px; font-size:16px; border-radius:8px; }
        button { background:#ff00aa; color:white; border:none; cursor:pointer; }
    </style>
</head>
<body>
    <h1>SUA SORTE BR - CONTROLE</h1>
    <img id="video" src="" alt="Câmera do celular">

    <div>
        <input type="text" id="q" placeholder="Pergunta" style="width:80%">
        <br>
        <input type="number" id="time" value="30" style="width:100px">
        <input type="number" id="prize" value="50" style="width:100px">
        <button onclick="sendQuestion()">Enviar Pergunta</button>
        <button onclick="toggleCam()">Trocar Câmera</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');

        function sendQuestion() {
            const q = document.getElementById('q').value;
            const time = document.getElementById('time').value;
            const prize = document.getElementById('prize').value;
            socket.emit('question', {question: q, time: time, prize: prize});
        }

        function toggleCam() {
            socket.emit('toggle_camera');
        }

        socket.on('frame', (data) => {
            document.getElementById('video').src = data;
        });
    </script>
</body>
</html>`;
}

io.on('connection', (socket) => {
  socket.on('message', (msg) => socket.broadcast.emit('message', msg));
  socket.on('frame', (frame) => socket.broadcast.emit('frame', frame));
  socket.on('question', (data) => socket.broadcast.emit('question', data));
  socket.on('toggle_camera', () => socket.broadcast.emit('toggle_camera'));
  socket.on('mobile_online', () => socket.broadcast.emit('mobile_online'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Abra primeiro no CELULAR`);
});
