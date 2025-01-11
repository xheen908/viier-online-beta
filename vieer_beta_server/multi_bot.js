const io = require("socket.io-client");

const PLAYER_COUNT = 9; // Anzahl der simulierten Spieler
const bots = [];
const botNames = Array.from({ length: PLAYER_COUNT }, (_, i) => `Bot_${i + 1}`);

for (let i = 0; i < PLAYER_COUNT; i++) {
  setTimeout(() => createBot(i + 1), i * 1000);
}

function createBot(botId) {
  const socket = io("https://game.x3.dynu.com", { transports: ["websocket"] });

  let myRole = null;
  let currentPlayer = null;
  let board = Array.from({ length: 6 }, () => Array(7).fill(0));
  let room = null;
  let gameOver = false;
  let timeoutHandle = null;

  const resetBoard = () => Array.from({ length: 6 }, () => Array(7).fill(0));

  socket.on("connect", () => {
    console.log(`${botNames[botId - 1]}: Verbunden mit dem Server. Trete der Warteschlange bei...`);
    joinQueue();
  });

  const resetTimeout = () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(() => {
      console.log(`${botNames[botId - 1]}: Timeout erreicht! Verlasse das Spiel und trete der Warteschlange erneut bei...`);
      joinQueue();
    }, 100000);
  };

  const joinQueue = () => {
    console.log(`${botNames[botId - 1]}: Tritt der Warteschlange bei...`);
    board = resetBoard();
    myRole = null;
    currentPlayer = null;
    room = null;
    gameOver = false;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    socket.emit("join_game", { name: botNames[botId - 1] });
  };

  socket.on("game_start", ({ room: gameRoom, role, opponent }) => {
    if (opponent && opponent.startsWith("Bot_")) {
      console.log(`${botNames[botId - 1]}: Gegner ist ein anderer Bot (${opponent}). Trete der Warteschlange erneut bei...`);
      setTimeout(joinQueue, 2000);
      return;
    }

    console.log(`${botNames[botId - 1]}: Spiel gestartet!`, { room: gameRoom, role, opponent });
    room = gameRoom;
    myRole = role;
    currentPlayer = 1;
    gameOver = false;
    resetTimeout();
    console.log(`${botNames[botId - 1]}: Meine Rolle: Spieler ${myRole}`);
    if (myRole === 1) {
      console.log(`${botNames[botId - 1]}: Ich beginne das Spiel.`);
      makeMove();
    } else {
      console.log(`${botNames[botId - 1]}: Warte auf Spieler 1...`);
    }
  });

  socket.on("board_update", ({ board: updatedBoard, currentPlayer: nextPlayer }) => {
    if (gameOver) return;

    console.log(`${botNames[botId - 1]}: Ereignis empfangen: board_update`, {
      board: updatedBoard,
      currentPlayer: nextPlayer,
    });

    board = updatedBoard;
    currentPlayer = nextPlayer;
    resetTimeout();

    if (board.flat().every((cell) => cell !== 0)) {
      console.log(`${botNames[botId - 1]}: Das Spiel ist unentschieden!`);
      setTimeout(joinQueue, 2000);
      return;
    }

    if (nextPlayer === myRole) {
      console.log(`${botNames[botId - 1]}: Ich bin am Zug. Bereite Zug vor...`);
      makeMove();
    } else {
      console.log(`${botNames[botId - 1]}: Warte auf Gegner...`);
    }
  });

  socket.on("spiel_ende", ({ winner }) => {
    if (gameOver) return;

    gameOver = true;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (winner === myRole) {
      console.log(`${botNames[botId - 1]}: 🎉 Du hast gewonnen!`);
    } else if (winner === null) {
      console.log(`${botNames[botId - 1]}: Das Spiel endete unentschieden.`);
    } else {
      console.log(`${botNames[botId - 1]}: Du hast verloren. 😢`);
    }

    console.log(`${botNames[botId - 1]}: Das Spiel ist vorbei. Trete der Warteschlange erneut bei...`);
    setTimeout(joinQueue, 2000);
  });

  socket.on("opponent_left", () => {
    if (gameOver) return;
    console.log(`${botNames[botId - 1]}: Der Gegner hat das Spiel verlassen. Trete der Warteschlange erneut bei...`);
    joinQueue();
  });

  const makeMove = () => {
    if (gameOver || currentPlayer !== myRole) {
      console.log(`${botNames[botId - 1]}: Nicht mein Zug oder Spiel ist vorbei.`);
      return;
    }

    const col = getBestMove(board, myRole);
    if (col === -1) {
      console.log(`${botNames[botId - 1]}: Keine gültigen Züge verfügbar.`);
      return;
    }

    console.log(`${botNames[botId - 1]}: Spieler ${myRole} spielt in Spalte ${col}`);
    socket.emit("spielzug", { room, col, player: myRole });
  };

  const getBestMove = (board, player) => {
    // Versuche zu gewinnen
    for (let col = 0; col < 7; col++) {
      const tempBoard = JSON.parse(JSON.stringify(board));
      if (applyMove(tempBoard, col, player) !== -1 && checkWin(tempBoard, player)) {
        return col;
      }
    }

    // Verhindere gegnerischen Sieg
    const opponent = 3 - player;
    for (let col = 0; col < 7; col++) {
      const tempBoard = JSON.parse(JSON.stringify(board));
      if (applyMove(tempBoard, col, opponent) !== -1 && checkWin(tempBoard, opponent)) {
        return col;
      }
    }

    // Spiele strategisch (Mitte bevorzugen)
    const preferredOrder = [3, 2, 4, 1, 5, 0, 6];
    for (const col of preferredOrder) {
      if (applyMove(board, col, player) !== -1) {
        return col;
      }
    }

    return -1;
  };

  const applyMove = (board, col, player) => {
    for (let row = 5; row >= 0; row--) {
      if (board[row][col] === 0) {
        board[row][col] = player;
        return row;
      }
    }
    return -1;
  };

  const checkWin = (board, player) => {
    const directions = [
      { dr: 0, dc: 1 }, // Horizontal
      { dr: 1, dc: 0 }, // Vertikal
      { dr: 1, dc: 1 }, // Diagonal rechts unten
      { dr: 1, dc: -1 }, // Diagonal links unten
    ];
  
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        if (board[row][col] === player) {
          for (const { dr, dc } of directions) {
            let count = 1;
  
            for (let i = 1; i < 4; i++) {
              const r = row + dr * i;
              const c = col + dc * i;
  
              // Prüfen, ob das nächste Feld gültig ist
              if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
                count++;
              } else {
                break;
              }
            }
  
            if (count === 4) {
              return true; // Gewinn gefunden
            }
          }
        }
      }
    }
    return false;
  };
  
  const evaluateBoard = (board, player) => {
    const directions = [
      { dr: 0, dc: 1 }, // Horizontal
      { dr: 1, dc: 0 }, // Vertikal
      { dr: 1, dc: 1 }, // Diagonal rechts unten
      { dr: 1, dc: -1 }, // Diagonal links unten
    ];
  
    let score = 0;
  
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        if (board[row][col] === player) {
          for (const { dr, dc } of directions) {
            let count = 0;
            let blocked = false;
  
            for (let i = 0; i < 4; i++) {
              const r = row + dr * i;
              const c = col + dc * i;
  
              if (r >= 0 && r < 6 && c >= 0 && c < 7) {
                if (board[r][c] === player) {
                  count++;
                } else if (board[r][c] !== 0) {
                  blocked = true;
                  break;
                }
              } else {
                blocked = true;
                break;
              }
            }
  
            if (count === 4) return Infinity; // Sofortiger Gewinn
            if (!blocked) score += count ** 2; // Nur offene Linien werten
          }
        }
      }
    }
  
    return score;
  };
  
  socket.on("disconnect", () => {
    console.log(`${botNames[botId - 1]}: Verbindung zum Server verloren. Versuche, erneut zu verbinden...`);
  });

  socket.onAny((event, data) => {
    console.log(`${botNames[botId - 1]}: Ereignis empfangen: ${event}`, data);
    resetTimeout();
  });
}
