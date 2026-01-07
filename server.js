const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// Setup Folder Public
app.use(express.static(path.join(__dirname, 'public')));

// Route Utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// LOGIKA SOCKET ROOM
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. Saat user ingin join room
    socket.on('join_room', (roomName) => {
        socket.join(roomName); // Fitur ajaib Socket.io untuk masuk kamar
        console.log(`User ${socket.id} joined room: ${roomName}`);
        
        // Beritahu user dia berhasil masuk
        socket.emit('system_message', `You joined room: ${roomName}`);
        
        // Beritahu orang lain di room itu ada yang masuk
        socket.to(roomName).emit('system_message', `A user has joined the room.`);
    });

    // 2. Saat user mengirim pesan
    socket.on('chat_message', (data) => {
        // data berisi: { room: 'nama_room', user: 'nama_user', text: 'pesan' }
        
        // Kirim HANYA ke orang di dalam room tersebut
        io.to(data.room).emit('chat_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Konfigurasi Port & Export untuk Vercel
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    http.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
module.exports = app;