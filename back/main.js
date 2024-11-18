const { Server } = require('socket.io');
const express = require('express');
const app = express();
const server = require('http').createServer(app);

const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
});

const port = 3001

let player = new Set()

io.on('connection', (socket) => {
    
    socket.on ('init', () => {
        const playerData = { id: socket.id };

        const d = [...player];
        const find = d.find((p) => p.id === socket.id);
        if (!find) {
        player.add(playerData);
        }
        socket.emit("init-ok", find);

        console.log("emit new player list to all");
        socket.broadcast.emit("new-player", { player: [...player] });
        socket.emit("new-player", { player: [...player] });
    });

    socket.on('coordonne', (data) => {
        console.log(data.x, data.y)
        socket.broadcast.emit('new_coordonne', {
            id: socket.id,
            x: data.x,
            y: data.y,
        })
    });

    socket.on('disconnect', () => {
        console.log('Client déconnecté :', socket.id);
        
        player = new Set([...player].filter(p => p.id !== socket.id));
        
        io.emit('playerDisconnected', socket.id);
        
        console.log('Joueurs restants :', player);
    });
});


server.listen(port, () => {
    console.log(`Serveur API en écoute sur http://localhost:${port}`);
})