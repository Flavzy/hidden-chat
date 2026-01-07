const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve file statis (html, css)
app.use(express.static(__dirname));

// Penyimpanan sementara (RAM) - Reset saat server restart/tidur
let rooms = {}; 

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // 1. CREATE ROOM
    socket.on('create_room', ({ username, roomName, maxUsers }) => {
        // Cek jika room sudah ada
        if (rooms[roomName]) {
            socket.emit('notification', { type: 'error', text: 'ERROR: ROOM_ALREADY_EXISTS' });
            return;
        }

        // Validasi input
        if (!roomName || !username) return;

        // Buat room di memori
        rooms[roomName] = {
            maxUsers: parseInt(maxUsers) || 5,
            users: []
        };

        joinRoomLogic(socket, roomName, username);
    });

    // 2. JOIN ROOM
    socket.on('join_room', ({ username, roomName }) => {
        const room = rooms[roomName];

        // Validasi Room
        if (!room) {
            socket.emit('notification', { type: 'error', text: 'ERROR: ROOM_NOT_FOUND_404' });
            return;
        }

        // Validasi Kapasitas
        if (room.users.length >= room.maxUsers) {
            socket.emit('notification', { type: 'error', text: 'ERROR: ROOM_FULL_ACCESS_DENIED' });
            return;
        }

        joinRoomLogic(socket, roomName, username);
    });

    // 3. CHAT MESSAGE
    socket.on('chat_message', (msg) => {
        const user = socket.data;
        if (user.room) {
            io.to(user.room).emit('message', {
                user: user.username,
                text: msg,
                isSystem: false
            });
        }
    });

    // 4. DISCONNECT
    socket.on('disconnect', () => {
        const user = socket.data;
        if (user.room && rooms[user.room]) {
            // Hapus user dari array
            rooms[user.room].users = rooms[user.room].users.filter(id => id !== socket.id);
            
            // Info ke user lain
            io.to(user.room).emit('message', {
                user: 'SYSTEM',
                text: `${user.username} connection lost...`,
                isSystem: true
            });

            // Hapus room jika kosong (Opsional, agar hemat memori)
            if (rooms[user.room].users.length === 0) {
                delete rooms[user.room];
                console.log(`Room ${user.room} deleted (empty).`);
            }
        }
    });
});

// Fungsi Helper Join
function joinRoomLogic(socket, roomName, username) {
    socket.data.username = username;
    socket.data.room = roomName;

    socket.join(roomName);
    rooms[roomName].users.push(socket.id);

    socket.emit('room_joined', { roomName });

    io.to(roomName).emit('message', {
        user: 'SYSTEM',
        text: `User ${username} initialized connection.`,
        isSystem: true
    });
}

// SETUP PORT UNTUK RENDER
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});