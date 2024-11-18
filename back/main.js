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
const nbrFeed = 500
let feed = []
const gameAreaSize = 10000;

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

const color = () => {
    return `rgb(${getRandomInt(255)},${getRandomInt(255)},${getRandomInt(255)})`
}

io.on('connection', (socket) => {
    
    socket.on ('init-player', () => {
        const couleur = color()
        const playerData = { id: socket.id, color : couleur };

        const d = [...player];
        const find = d.find((p) => p.id === socket.id);
        if (!find) {
        player.add(playerData);
        }
        socket.emit("init-player-ok", find);

        console.log("emit new player list to all");
        socket.broadcast.emit("new-player", { player: [...player] });
        socket.emit("new-player", { player: [...player] });
    });

    socket.on('init-feed', () => {
        if(feed.length === 0) {
            for (let i = 0; i<nbrFeed; i++){
                const x = getRandomInt(gameAreaSize)
                const y = getRandomInt(gameAreaSize)
                const feedData = {id: i,x: x, y: y, rad: 10}
                feed.push(feedData)
            }
        }
        console.log(feed)
        socket.emit('init-feed-ok', {feed})
    })

    socket.on('coordonne', (data) => {
        socket.broadcast.emit('new_coordonne', {
            id: socket.id,
            x: data.x,
            y: data.y,
        })
    });

    socket.on('disconnect', () => {
        console.log('Client déconnecté :', socket.id);
        
        player = new Set([...player].filter(p => p.id !== socket.id));

        feed = []
        
        io.emit('playerDisconnected', socket.id);
        
        console.log('Joueurs restants :', player);
    });
});


server.listen(port, () => {
    console.log(`Serveur API en écoute sur http://localhost:${port}`);
})