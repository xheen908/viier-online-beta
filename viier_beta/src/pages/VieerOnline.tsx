import React, { useState, useEffect } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
} from "@ionic/react";
import io from "socket.io-client";
import "../styles/Vieer.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import vieerPwndLogo from "../assets/vierLogo.png";

const VieerOnline: React.FC = () => {
  
  const rows = 6;
  const cols = 7;

  
  const [board, setBoard] = useState<number[][]>(Array.from({ length: rows }, () => Array(cols).fill(0)));
  const [currentPlayer, setCurrentPlayer] = useState<number>(1);
  const [myRole, setMyRole] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("Wähle einen Modus");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<string>("");
  const [socket, setSocket] = useState<any>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false); // Neuer Zustand für das Menü
  

  useEffect(() => {
    
    const newSocket = io("https://viiergame.x3.dynu.com/", { transports: ["websocket"] });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log(`[DEBUG] Mit Server verbunden: ${newSocket.id}`);
    });

    newSocket.on("game_start", (data) => {
      setRoom(data.room);
      setMyRole(data.role);
      setCurrentPlayer(1);
      setMessage(data.role === 1 ? "Dein Zug!" : "Warte auf Spieler 1");
      setGameMode("Online");
      setIsWaiting(false);
      resetGame();
    });

    newSocket.on("board_update", (data) => {
      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
      if (data.currentPlayer === myRole) {
        setMessage("Dein Zug!");
      } else {
        setMessage("Warte auf Gegner");
      }
    });

    newSocket.on("game_over", (data) => {
      setMessage(`Spieler ${data.winner} gewinnt!`);
      setGameOver(true);
    });

    newSocket.on("disconnect", () => {
      console.log("[DEBUG] Verbindung zum Server verloren.");
    });

    return () => {
      if (newSocket) {
        newSocket.off("board_update");
        newSocket.off("game_over");
      }
      newSocket.close();
    };
  }, []);

  const resetGame = () => {
    setBoard(Array.from({ length: rows }, () => Array(cols).fill(0)));
    setCurrentPlayer(1);
    setGameOver(false);
  };

  const selectMode = (mode: string) => {
    setGameMode(mode);
    resetGame();
    if (mode === "Online" && socket) {
      setIsWaiting(true);
      setMessage("Warte auf einen Gegner...");
      socket.emit("join_game");
    } else {
      setMessage("Spieler 1 ist an der Reihe");
    }
  };

  const makeMove = (col: number) => {
    if (gameOver || board[0][col] !== 0) return;
    if (currentPlayer !== myRole) return;

    applyMove(col, myRole!);

    if (socket && room) {
      socket.emit("spielzug", { col, player: myRole, room });
    }
  };

  const applyMove = (col: number, player: number) => {
    const newBoard = board.map((row) => [...row]);
    for (let r = rows - 1; r >= 0; r--) {
      if (newBoard[r][col] === 0) {
        newBoard[r][col] = player;
        setBoard(newBoard);

        if (checkWin(newBoard, r, col, player)) {
          setMessage(`Spieler ${player} gewinnt!`);
          setGameOver(true);
        } else {
          const nextPlayer = player === 1 ? 2 : 1;
          setCurrentPlayer(nextPlayer);
          setMessage(nextPlayer === myRole ? "Dein Zug!" : "Warte auf Gegner");
        }
        return;
      }
    }
  };

  const checkWin = (board: number[][], row: number, col: number, player: number): boolean => {
    const directions = [
      { dr: 0, dc: 1 }, // Horizontal
      { dr: 1, dc: 0 }, // Vertikal
      { dr: 1, dc: 1 }, // Diagonal rechts unten
      { dr: 1, dc: -1 }, // Diagonal links unten
    ];

    for (const { dr, dc } of directions) {
      let count = 1;

      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === player) {
          count++;
        } else {
          break;
        }
      }

      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 4) {
        return true;
      }
    }
    return false;
  };
  
  return (
    
    <IonPage>
      <Header title="VieerBeta" />
      <IonContent fullscreen className="full-page-background">
        <div id="vier-pwnd">
          <div id="game-container">
            <img src={vieerPwndLogo} alt="VieerPwnd Logo" style={{ maxWidth: "150px", height: "auto" }} />
            {!showMenu ? (
              <IonButton expand="block" onClick={() => setShowMenu(true)}>Neues Spiel</IonButton>
            ) : (
              <>
                <h2>{message}</h2>
                {isWaiting ? (
                  <div className="spinner">Warten auf Gegner...</div>
                ) : !gameMode ? (
                  <>
                    <IonButton expand="block" onClick={() => selectMode("AI")}>Solo Spieler</IonButton>
                    <IonButton expand="block" onClick={() => selectMode("Local")}>Mehr Spieler (local)</IonButton>
                    <IonButton expand="block" onClick={() => selectMode("Online")}>Mehr Spieler (online)</IonButton>
                  </>
                ) : (
                  <div id="game-board">
                    {board.map((row, rIndex) =>
                      row.map((cell, cIndex) => (
                        <div
                          key={`${rIndex}-${cIndex}`}
                          className={`cell ${cell === 1 ? "player1" : cell === 2 ? "player2" : ""}`}
                          onClick={() => makeMove(cIndex)}
                        />
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </IonContent>
            <Footer text="© 2024-2025 GloveLab" />
    </IonPage>
  );
};

export default VieerOnline;
