const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Für Entwicklungszwecke offen
    methods: ["GET", "POST"],
  },
  transports: ['websocket'], // Nur WebSocket verwenden
});

const waitingPlayers = []; // Warteschlange für wartende Spieler
const rooms = {}; // Speichere den Zustand für jeden Raum

// Statische Dateien für CSS und APK
app.use(express.static(path.join(__dirname, 'public')));

// Serverstatus Route
app.get('/', (req, res) => {
  const serverStatus = {
    onlinePlayers: io.engine.clientsCount,
    activeRooms: Object.keys(rooms).length,
  };

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Status</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f9;
          color: #333;
          text-align: center;
          margin: 0;
          padding: 20px;
        }
        .status-container {
          margin-top: 50px;
        }
        .status-box {
          display: inline-block;
          padding: 20px;
          margin: 10px;
          background-color: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .status-box h3 {
          margin: 0;
          font-size: 1.5rem;
        }
        .download-link {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-size: 1rem;
        }
        .download-link:hover {
          background-color: #0056b3;
        }
      </style>
    </head>
    <body>
      <h1>WebSocket Server Status</h1>
      <div class="status-container">
        <div class="status-box">
          <h3>Online Players: ${serverStatus.onlinePlayers}</h3>
        </div>
        <div class="status-box">
          <h3>Active Rooms: ${serverStatus.activeRooms}</h3>
        </div>
      </div>
      <a class="download-link" href="/apk/my-game.apk" download>Download APK</a>
    </body>
    </html>
  `);
});

// WebSocket Setup
io.on('connection', (socket) => {
  console.log(`[DEBUG] Spieler verbunden: ${socket.id}`);

  socket.on('join_game', () => {
    console.log(`[DEBUG] Spieler ${socket.id} sucht ein Spiel`);
    waitingPlayers.push(socket); 
    tryPairPlayers();
  });

  socket.on('spielzug', (data) => {
    console.log(`[DEBUG] Spielzug von Spieler ${data.player} in Raum ${data.room}, Spalte ${data.col}`);
    const room = rooms[data.room];

    if (room) {
      const { board, currentPlayer } = room;

      let winningMove = false;
      for (let r = board.length - 1; r >= 0; r--) {
        if (board[r][data.col] === 0) {
          board[r][data.col] = data.player;
          winningMove = checkWin(board, r, data.col, data.player);
          break;
        }
      }

      io.to(data.room).emit('board_update', {
        board,
        currentPlayer: currentPlayer === 1 ? 2 : 1,
      });

      if (winningMove) {
        setTimeout(() => {
          io.to(data.room).emit('game_over', { winner: data.player });
          console.log(`[DEBUG] Spieler ${data.player} gewinnt das Spiel in Raum ${data.room}`);
        }, 200);
        return;
      }

      room.currentPlayer = currentPlayer === 1 ? 2 : 1;
    }
  });

  socket.on('disconnect', () => {
    console.log(`[DEBUG] Spieler getrennt: ${socket.id}`);
    const index = waitingPlayers.findIndex((player) => player.id === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
  });
});

// Pairing-Funktion, checkWin Funktion wie vorher...

server.listen(7777, () => {
  console.log('[INFO] WebSocket Server läuft auf http://localhost:7777');
});
