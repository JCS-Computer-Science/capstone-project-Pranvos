const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let users = new Map(); 
let rooms = new Map(); 

// game configuration 
const GAME_ROOM_ID = 'mainRoom'; 
const ROUND_TIME = 60; 
const MAX_ROUNDS = 3;

// load words from JSON file 
let gameWords = [];
try {
    gameWords = require('./public/words.json'); 
    console.log(`Loaded ${gameWords.length} words from words.json`);
} catch (error) {
    console.error('Error loading words.json:', error.message);
    gameWords = ['fallback', 'words', 'error', 'loading']; 
}


const generateRandomWord = () => {
    if (gameWords.length === 0) {
        console.warn("No words loaded! Using a generic fallback word.");
        return "default"; 
    }
    return gameWords[Math.floor(Math.random() * gameWords.length)];
};

const getWordHint = (word) => {
    let hint = '';
    for (let i = 0; i < word.length; i++) {
        hint += '_ ';
    }
    return hint.trim();
};

const emitPlayerList = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const playerList = Array.from(room.players.values()).map(user => ({
        id: user.id,
        username: user.username,
        score: user.score
    }));
    io.to(roomId).emit('updatePlayerList', playerList);
};

const startGame = async (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.gameStarted) return;

    room.gameStarted = true;
    room.currentRound = 0;
    io.to(roomId).emit('chatMessage', { user: 'System', message: 'Game starting!' });
    startNewRound(roomId);
};

const startNewRound = async (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.currentRound++;
    if (room.currentRound > room.maxRounds) {
        endGame(roomId);
        return;
    }

    room.players.forEach(player => player.isDrawer = false);
    io.to(roomId).emit('clearCanvas');

    const playerIds = Array.from(room.players.keys());
    if (playerIds.length === 0) {
        endGame(roomId); // No players left
        return;
    }

    let nextDrawerIndex = 0;
    if (room.drawerId) {
        const currentDrawerIndex = playerIds.indexOf(room.drawerId);
        nextDrawerIndex = (currentDrawerIndex + 1) % playerIds.length;
    }
    room.drawerId = playerIds[nextDrawerIndex];
    const drawerUser = room.players.get(room.drawerId);
    drawerUser.isDrawer = true;

    room.currentWord = generateRandomWord();
    room.wordHint = getWordHint(room.currentWord);

    io.to(roomId).emit('chatMessage', { user: 'System', message: `Round ${room.currentRound}/${room.maxRounds} begins!` });
    io.to(roomId).emit('updateGameInfo', {
        currentWordHint: room.wordHint,
        drawerName: drawerUser.username,
        roundInfo: `${room.currentRound}/${room.maxRounds}`
    });

    // Inform the drawer of the word
    io.to(room.drawerId).emit('setWordToDraw', room.currentWord);
    io.to(room.drawerId).emit('enableDrawing');

    let timeLeft = ROUND_TIME;
    io.to(roomId).emit('updateTimer', timeLeft);
    clearInterval(room.roundTimer);
    room.roundTimer = setInterval(() => {
        timeLeft--;
        io.to(roomId).emit('updateTimer', timeLeft);
        if (timeLeft <= 0) {
            clearInterval(room.roundTimer);
            io.to(roomId).emit('chatMessage', { user: 'System', message: `Time's up! The word was "${room.currentWord}".` });
            startNewRound(roomId);
        }
    }, 1000);

    emitPlayerList(roomId); // Update player list to show current drawer
};

const endGame = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    clearInterval(room.roundTimer);
    room.gameStarted = false;
    room.currentWord = '';
    room.drawerId = '';
    room.wordHint = '';
    room.players.forEach(player => player.isDrawer = false); 
    io.to(roomId).emit('chatMessage', { user: 'System', message: 'Game over! Scores:' });

    const finalScores = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
    finalScores.forEach(player => {
        io.to(roomId).emit('chatMessage', { user: 'System', message: `${player.username}: ${player.score} points` });
    });

    io.to(roomId).emit('updateGameInfo', {
        currentWordHint: '_ _ _ _', 
        drawerName: '',
        roundInfo: ''
    });
    io.to(roomId).emit('disableDrawing'); 
    io.to(roomId).emit('showStartGameButton'); 

    emitPlayerList(roomId); 
};


io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);


    if (!rooms.has(GAME_ROOM_ID)) {
        rooms.set(GAME_ROOM_ID, {
            players: new Map(),
            currentWord: '',
            drawerId: '',
            roundTimer: null,
            currentRound: 0,
            maxRounds: MAX_ROUNDS,
            gameStarted: false,
            wordHint: ''
        });
    }

    const currentRoom = rooms.get(GAME_ROOM_ID);

    socket.on('joinGame', ({ username }) => { 
        if (!username || username.trim() === '') {
            username = `Guest-${Math.floor(Math.random() * 1000)}`;
        }

        const newUser = {
            id: socket.id,
            username: username,
            score: 0,
            isDrawer: false
        };
        currentRoom.players.set(socket.id, newUser);
        socket.join(GAME_ROOM_ID); 

        console.log(`User ${username} (${socket.id}) joined.`);
        io.to(GAME_ROOM_ID).emit('chatMessage', { user: 'System', message: `${username} has joined the game.` });
        emitPlayerList(GAME_ROOM_ID);
        socket.emit('gameJoined'); 


        if (currentRoom.gameStarted) {
            socket.emit('updateGameInfo', {
                currentWordHint: socket.id === currentRoom.drawerId ? currentRoom.currentWord : currentRoom.wordHint,
                drawerName: currentRoom.players.get(currentRoom.drawerId)?.username,
                roundInfo: `${currentRoom.currentRound}/${currentRoom.maxRounds}`
            });
            if (socket.id === currentRoom.drawerId) {
                socket.emit('enableDrawing');
            } else {
                socket.emit('disableDrawing');
            }

            if (currentRoom.roundTimer) {
                io.to(socket.id).emit('syncTimer', ROUND_TIME);
            }
        } else {
            socket.emit('showStartGameButton');
            socket.emit('disableDrawing'); 
        }
    });

    socket.on('chatMessage', (message) => {
        const user = currentRoom.players.get(socket.id);
        if (!user || message.trim() === '') return;
        // hacker mode cheat, type: reveal_word_42
        if (message.trim().toLowerCase() === 'reveal_word_42') {
            if (socket.id === currentRoom.drawerId) {
                socket.emit('chatMessage', { user: 'System', message: "You're the drawer, you already know the word!" });
            } else if (currentRoom.gameStarted && currentRoom.currentWord) {
                socket.emit('chatMessage', { user: 'Hacker', message: `The secret word is: ${currentRoom.currentWord}` });
            } else {
                socket.emit('chatMessage', { user: 'System', message: 'No game in progress or word available to reveal.' });
            }
            return; 
        }


        if (currentRoom.gameStarted && user.id !== currentRoom.drawerId && message.trim().toLowerCase() === currentRoom.currentWord.toLowerCase()) {
            io.to(GAME_ROOM_ID).emit('chatMessage', { user: 'System', message: `${user.username} has guessed the word!` });
            user.score += 100; 
            currentRoom.players.get(currentRoom.drawerId).score += 50; 
            emitPlayerList(GAME_ROOM_ID);
            clearInterval(currentRoom.roundTimer); // Stop current round
            io.to(GAME_ROOM_ID).emit('chatMessage', { user: 'System', message: `The word was "${currentRoom.currentWord}".` });
            startNewRound(GAME_ROOM_ID); // Start new round immediately
            return;
        }

        io.to(GAME_ROOM_ID).emit('chatMessage', { user: user.username, message: message.trim() });
    });

    socket.on('drawing', (data) => {
        const user = currentRoom.players.get(socket.id);
        if (user && user.isDrawer && currentRoom.gameStarted) { 
            socket.broadcast.to(GAME_ROOM_ID).emit('drawing', {
                x0: data.x0,
                y0: data.y0,
                x1: data.x1,
                y1: data.y1,
                color: data.color,
                size: data.size,
                tool: data.tool
            });
        }
    });

    socket.on('clearCanvas', () => {
        const user = currentRoom.players.get(socket.id);
        if (user && user.isDrawer && currentRoom.gameStarted) { 
            io.to(GAME_ROOM_ID).emit('clearCanvas');
        }
    });

    socket.on('startGame', () => {
        const user = currentRoom.players.get(socket.id);
        if (user && !currentRoom.gameStarted && currentRoom.players.size >= 2) { 
            startGame(GAME_ROOM_ID);
        } else if (currentRoom.players.size < 2) {
            socket.emit('chatMessage', { user: 'System', message: 'Need at least 2 players to start the game!' });
        }
    });


    socket.on('rateDrawing', ({ rating, drawerId }) => {
        const user = currentRoom.players.get(socket.id);
        const drawer = currentRoom.players.get(drawerId);
        if (user && drawer && user.id !== drawer.id && currentRoom.gameStarted && drawer.isDrawer) {
            if (rating === 'up') {
                drawer.score += 5;
                io.to(GAME_ROOM_ID).emit('chatMessage', { user: 'System', message: `${user.username} liked ${drawer.username}'s drawing!` });
            } else if (rating === 'down') {
                drawer.score -= 2; 
                io.to(GAME_ROOM_ID).emit('chatMessage', { user: 'System', message: `${user.username} disliked ${drawer.username}'s drawing.` });
            }
            emitPlayerList(GAME_ROOM_ID);
        }
    });


    socket.on('disconnect', () => {
        const user = currentRoom.players.get(socket.id);
        if (user) {
            console.log(`User disconnected: ${user.username} (${socket.id})`);
            currentRoom.players.delete(socket.id);
            io.to(GAME_ROOM_ID).emit('chatMessage', { user: 'System', message: `${user.username} has left the game.` });
            emitPlayerList(GAME_ROOM_ID);


            if (socket.id === currentRoom.drawerId && currentRoom.gameStarted) {
                clearInterval(currentRoom.roundTimer);
                io.to(GAME_ROOM_ID).emit('chatMessage', { user: 'System', message: 'Drawer disconnected, starting new round.' });
                startNewRound(GAME_ROOM_ID);
            }

            if (currentRoom.players.size === 0) {
                endGame(GAME_ROOM_ID);
            }
        } else {
            console.log(`Unknown user disconnected: ${socket.id}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});