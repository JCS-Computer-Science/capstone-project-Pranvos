const socket = io();
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;


const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');
const joinScreen = document.getElementById('join-screen');
const gameContainer = document.getElementById('game-container');
const brushSizeSlider = document.getElementById('brush-size');
const brushSizeValueSpan = document.getElementById('brush-size-value');
const playerListUl = document.getElementById('player-list');
const currentWordSpan = document.getElementById('current-word');
const drawerNameSpan = document.getElementById('drawer-name');
const timeLeftSpan = document.getElementById('time-left');
const roundInfoSpan = document.getElementById('round-info');
const drawingTools = document.getElementById('drawing-tools');
const startGameButton = document.getElementById('start-game-button');
const rateDrawingContainer = document.getElementById('rate-drawing-container');
const rateUpButton = document.getElementById('rate-up-button');
const rateDownButton = document.getElementById('rate-down-button');
const clearCanvasButton = document.getElementById('clear-canvas-button');
const eraserButton = document.getElementById('eraser-button');
const colorPickerContainer = document.getElementById('color-picker-container');
const hueSlider = document.getElementById('hue-slider');

let drawing = false;
let currentColor = '#000000'; // Default to black
let currentBrushSize = 5;
let lastX = 0;
let lastY = 0;
let isMyTurnToDraw = false;
let currentDrawerId = null;
let currentTool = 'pen'; 


colorPickerContainer.style.backgroundColor = currentColor;

function resizeCanvas() {
    if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
    clearCanvas(); 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
}

window.addEventListener('load', () => {
    requestAnimationFrame(resizeCanvas);
});
window.addEventListener('resize', resizeCanvas);


function drawLine(x0, y0, x1, y1, color, size, tool) {
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'; 
        ctx.strokeStyle = 'rgba(0,0,0,1)'; 
    } else {
        ctx.globalCompositeOperation = 'source-over'; 
        ctx.strokeStyle = color;
    }

    ctx.beginPath();
    ctx.lineWidth = size;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();
}

function startDrawing(e) {
    if (!isMyTurnToDraw) return;
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
        color: currentColor,
        size: currentBrushSize,
        tool: currentTool 
    });
    drawLine(lastX, lastY, currentX, currentY, currentColor, currentBrushSize, currentTool);
    lastX = currentX;
    lastY = currentY;
}

function stopDrawing() {
    drawing = false;
    ctx.globalCompositeOperation = 'source-over';
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function addChatMessage(user, message) {
    const msgEl = document.createElement('div');
    msgEl.textContent = `${user}: ${message}`;
    if (user === 'System') {
        msgEl.style.fontStyle = 'italic';
        msgEl.style.color = 'gray';
    }
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function enableDrawing() {
    isMyTurnToDraw = true;
    drawingTools.style.opacity = '1'; // Show tools
    drawingTools.style.pointerEvents = 'auto';
    canvas.style.cursor = 'crosshair';
    chatInput.disabled = true;
    chatInput.placeholder = "You are drawing!";
    currentWordSpan.parentNode.style.display = 'block'; 
    startGameButton.style.display = 'none'; // Hide start game button
    rateDrawingContainer.style.display = 'none'; // Hide rating for drawer
    activatePenTool();
    hueSlider.style.display = 'none';
}

function disableDrawing() {
    isMyTurnToDraw = false;
    drawingTools.style.opacity = '0.5'; // Dim tools
    drawingTools.style.pointerEvents = 'none';
    canvas.style.cursor = 'not-allowed';
    chatInput.disabled = false;
    chatInput.placeholder = "Type your guess or message...";
    currentWordSpan.parentNode.style.display = 'block';
    rateDrawingContainer.style.display = 'block'; 
    hueSlider.style.display = 'none'; // Hide slider when not drawing
}

function activatePenTool() {
    currentTool = 'pen';
    eraserButton.classList.remove('active');
    ctx.globalCompositeOperation = 'source-over'; // Ensure pen mode
    ctx.strokeStyle = currentColor; 
}

function activateEraserTool() {
    currentTool = 'eraser';
    eraserButton.classList.add('active');
    hueSlider.style.display = 'none';
    ctx.globalCompositeOperation = 'destination-out'; 
    ctx.strokeStyle = 'rgba(0,0,0,1)';
}


canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });

colorPickerContainer.addEventListener('click', () => {
    if (isMyTurnToDraw) {
        hueSlider.style.display = hueSlider.style.display === 'none' ? 'inline-block' : 'none';
        if (hueSlider.style.display === 'inline-block') {
            activatePenTool();
        }
    }
});

hueSlider.addEventListener('input', () => {
    if (isMyTurnToDraw) {
        const hue = hueSlider.value;
        currentColor = `hsl(${hue}, 100%, 50%)`; 
        colorPickerContainer.style.backgroundColor = currentColor;
        activatePenTool(); 
    }
});

brushSizeSlider.addEventListener('input', () => {
    if (!isMyTurnToDraw) return;
    currentBrushSize = brushSizeSlider.value;
    brushSizeValueSpan.textContent = currentBrushSize;
    ctx.lineWidth = currentBrushSize;
});

clearCanvasButton.addEventListener('click', () => {
    if (!isMyTurnToDraw) return;
    socket.emit('clearCanvas');
});

eraserButton.addEventListener('click', () => {
    if (!isMyTurnToDraw) return;
    activateEraserTool();
});

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
        addChatMessage('System', 'No username entered, joining as ' + enteredUsername);
    }
    socket.emit('joinGame', { username: enteredUsername });
});

startGameButton.addEventListener('click', () => {
    socket.emit('startGame');
    startGameButton.style.display = 'none';
});

rateUpButton.addEventListener('click', () => {
    if (currentDrawerId && socket.id !== currentDrawerId) {
        socket.emit('rateDrawing', { rating: 'up', drawerId: currentDrawerId });
    } else if (socket.id === currentDrawerId) {
        addChatMessage('System', "You can't rate your own drawing!");
    } else {
        addChatMessage('System', "There's no drawing to rate right now.");
    }
});

rateDownButton.addEventListener('click', () => {
    if (currentDrawerId && socket.id !== currentDrawerId) {
        socket.emit('rateDrawing', { rating: 'down', drawerId: currentDrawerId });
    } else if (socket.id === currentDrawerId) {
        addChatMessage('System', "You can't rate your own drawing!");
    } else {
        addChatMessage('System', "There's no drawing to rate right now.");
    }
});


socket.on('chatMessage', (data) => addChatMessage(data.user, data.message));
socket.on('drawing', (data) => {
    drawLine(data.x0 * canvas.width, data.y0 * canvas.height, data.x1 * canvas.width, data.y1 * canvas.height, data.color, data.size, data.tool);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor; 
    ctx.lineWidth = currentBrushSize; 
});
socket.on('clearCanvas', clearCanvas);

socket.on('gameJoined', () => {
    joinScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    chatInput.focus();
    resizeCanvas();
    addChatMessage('System', 'You have successfully joined the game!');
});

socket.on('updatePlayerList', (players) => {
    playerListUl.innerHTML = '';
    players.sort((a, b) => b.score - a.score);
    players.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `${player.username}: ${player.score} ${player.isDrawer ? '(Drawer)' : ''}`;
        playerListUl.appendChild(li);

        if (player.isDrawer) {
            currentDrawerId = player.id;
        }
    });
    if (!players.some(p => p.isDrawer)) {
        currentDrawerId = null;
        drawerNameSpan.textContent = '';
    } else {
        const drawerPlayer = players.find(p => p.isDrawer);
        if (drawerPlayer) {
            drawerNameSpan.textContent = drawerPlayer.username;
        }
    }
    playerListUl.parentNode.style.display = 'block';
});

socket.on('updateGameInfo', (data) => {
    currentWordSpan.textContent = data.currentWordHint;
    roundInfoSpan.textContent = data.roundInfo;
});

socket.on('setWordToDraw', (word) => {
    currentWordSpan.textContent = word;
});

socket.on('enableDrawing', () => {
    enableDrawing();
});

socket.on('disableDrawing', () => {
    disableDrawing();
});

socket.on('updateTimer', (timeLeft) => {
    timeLeftSpan.textContent = timeLeft;
});

socket.on('showStartGameButton', () => {
    startGameButton.style.display = 'block';
});


disableDrawing();
currentWordSpan.parentNode.style.display = 'none';
startGameButton.style.display = 'block';
rateDrawingContainer.style.display = 'none';