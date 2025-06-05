const socket = io();
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');
const joinScreen = document.getElementById('join-screen');
const gameContainer = document.getElementById('game-container');
const brushSizeSlider = document.getElementById('brush-size');
const brushSizeValueSpan = document.getElementById('brush-size-value');
const playerListUl = document.getElementById('player-list');

let drawing = false;
let currentColor = '#000000';
let currentBrushSize = 5;
let lastX = 0;
let lastY = 0;

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = currentColor;
ctx.lineWidth = currentBrushSize;

function drawLine(x0, y0, x1, y1, color, size) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();
}

function startDrawing(e) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
}

function draw(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    socket.emit('drawing', {
        x0: lastX / canvas.width, y0: lastY / canvas.height,
        x1: currentX / canvas.width, y1: currentY / canvas.height,
        color: currentColor, size: currentBrushSize
    });
    drawLine(lastX, lastY, currentX, currentY, currentColor, currentBrushSize);
    lastX = currentX;
    lastY = currentY;
}

function stopDrawing() {
    drawing = false;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function addChatMessage(user, message) {
    const msgEl = document.createElement('div');
    msgEl.classList.add('mb-1', 'p-1', 'rounded-md');
    msgEl.innerHTML = user === 'System' ?
        `<span class="text-center text-gray-600 italic text-sm">${message}</span>` :
        `<span class="font-semibold text-blue-700">${user}:</span> ${message}`;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });

document.querySelectorAll('.color-box').forEach(box => {
    box.addEventListener('click', () => {
        currentColor = box.dataset.color;
        document.querySelectorAll('.color-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        ctx.strokeStyle = currentColor;
    });
});
document.querySelector('.color-box[data-color="#000000"]').classList.add('active');

brushSizeSlider.addEventListener('input', () => {
    currentBrushSize = brushSizeSlider.value;
    brushSizeValueSpan.textContent = currentBrushSize;
    ctx.lineWidth = currentBrushSize;
});

document.getElementById('clear-canvas-button').addEventListener('click', () => socket.emit('clearCanvas'));

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && chatInput.value.trim()) {
        socket.emit('chatMessage', chatInput.value);
        chatInput.value = '';
    }
});

joinButton.addEventListener('click', () => {
    let enteredUsername = usernameInput.value.trim();
    if (enteredUsername === '') {
        enteredUsername = `Guest-${Math.floor(Math.random() * 1000)}`;
    }
    socket.emit('joinGame', enteredUsername);

    joinScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    addChatMessage('System', `Welcome, ${enteredUsername}! You can now draw and chat.`);

    document.getElementById('drawing-tools').classList.remove('disabled');
    canvas.classList.add('cursor-crosshair');
    canvas.classList.remove('cursor-not-allowed');

    document.getElementById('current-word').parentElement.classList.add('hidden');
    document.getElementById('start-game-button').classList.add('hidden');
});

socket.on('chatMessage', (data) => addChatMessage(data.user, data.message));
socket.on('drawing', (data) => drawLine(data.x0 * canvas.width, data.y0 * canvas.height, data.x1 * canvas.width, data.y1 * canvas.height, data.color, data.size));
socket.on('clearCanvas', clearCanvas);

socket.on('updatePlayerList', (players) => {
    playerListUl.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.classList.add('text-gray-700');
        li.textContent = player;
        playerListUl.appendChild(li);
    });
    playerListUl.parentElement.classList.remove('hidden');
});