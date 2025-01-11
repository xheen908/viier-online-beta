const io = require("socket.io-client");

const PLAYER_COUNT = 1000; // Anzahl der simulierten Spieler
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
    }, 25000); // Standard-Timeout
  };
  
  socket.on("opponent_left", () => {
    console.log(`${botNames[botId - 1]}: Der Gegner hat das Spiel verlassen.`);
    if (timeoutHandle) clearTimeout(timeoutHandle); // Timeout abbrechen
    console.log(`${botNames[botId - 1]}: Trete der Warteschlange erneut bei...`);
    joinQueue(); // Direkt der Warteschlange beitreten
  });
  

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
    if (gameOver) {
      console.log(`${botNames[botId - 1]}: Spielende bereits verarbeitet.`);
      return;
    }

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
    setTimeout(() => {
      gameOver = false; // Zurücksetzen für das nächste Spiel
      joinQueue();
    }, 2000);
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
    const MAX_DEPTH = 5;

    const minimax = (board, depth, alpha, beta, maximizingPlayer) => {
      const winner = checkWin(board, 1) ? 1 : checkWin(board, 2) ? 2 : null;
      if (winner === player) return { score: Infinity };
      if (winner === 3 - player) return { score: -Infinity };
      if (board.flat().every(cell => cell !== 0)) return { score: 0 }; // Unentschieden
      if (depth === 0) return { score: evaluateBoard(board, player) };

      const validMoves = [];
      for (let col = 0; col < 7; col++) {
        if (board[0][col] === 0) validMoves.push(col);
      }

      if (maximizingPlayer) {
        let maxEval = -Infinity;
        let bestCol = -1;
        for (const col of validMoves) {
          const tempBoard = JSON.parse(JSON.stringify(board));
          applyMove(tempBoard, col, player);
          const eval = minimax(tempBoard, depth - 1, alpha, beta, false).score;
          if (eval > maxEval) {
            maxEval = eval;
            bestCol = col;
          }
          alpha = Math.max(alpha, eval);
          if (beta <= alpha) break;
        }
        return { score: maxEval, col: bestCol };
      } else {
        let minEval = Infinity;
        for (const col of validMoves) {
          const tempBoard = JSON.parse(JSON.stringify(board));
          applyMove(tempBoard, col, 3 - player);
          const eval = minimax(tempBoard, depth - 1, alpha, beta, true).score;
          minEval = Math.min(minEval, eval);
          beta = Math.min(beta, eval);
          if (beta <= alpha) break;
        }
        return { score: minEval };
      }
    };

    const bestMove = minimax(board, MAX_DEPTH, -Infinity, Infinity, true);
    return bestMove.col;
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
        if (board[row][col] === player || board[row][col] === 0) {
          for (const { dr, dc } of directions) {
            let count = 0;
            let openEnds = 0;

            for (let i = 0; i < 4; i++) {
              const r = row + dr * i;
              const c = col + dc * i;
              if (r >= 0 && r < 6 && c >= 0 && c < 7) {
                if (board[r][c] === player) count++;
                else if (board[r][c] === 0) openEnds++;
              } else {
                break;
              }
            }

            if (count > 0 && count + openEnds === 4) {
              score += Math.pow(10, count);
            }
          }
        }
      }
    }

    return score;
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

  socket.on("disconnect", () => {
    console.log(`${botNames[botId - 1]}: Verbindung zum Server verloren. Versuche, erneut zu verbinden...`);
  });

  socket.onAny((event, data) => {
    console.log(`${botNames[botId - 1]}: Ereignis empfangen: ${event}`, data);
    resetTimeout();
  });
}
