const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));


let users = new Map();


io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);


    socket.on('joinGame', (username) => {
        if (!username || username.trim() === '') {
            username = `Guest-${Math.floor(Math.random() * 1000)}`; 
        }
        users.set(socket.id, username);
        console.log(`User ${username} (${socket.id}) joined.`);
        io.emit('chatMessage', { user: 'System', message: `${username} has joined the chat.` });
    });

    socket.on('chatMessage', (message) => {
        const username = users.get(socket.id) || 'Unknown'; 
        if (message.trim() === '') return; 
        io.emit('chatMessage', { user: username, message: message.trim() }); 
    });


    socket.on('drawing', (data) => {
        socket.broadcast.emit('drawing', data); 
    });


    socket.on('clearCanvas', () => {
        io.emit('clearCanvas'); 
    });


    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            console.log(`User disconnected: ${username} (${socket.id})`);
            users.delete(socket.id);
            io.emit('chatMessage', { user: 'System', message: `${username} has left the chat.` });
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