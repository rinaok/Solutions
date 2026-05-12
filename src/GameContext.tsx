import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, onSnapshot, collection, query, where, Unsubscribe } from 'firebase/firestore';

interface GameState {
  room: any | null;
  players: any[];
  solutions: any[];
  loading: boolean;
  error: string | null;
  user: User | null;
  roomId: string | null;
  joinRoom: (id: string) => void;
  leaveRoom: () => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!roomId || !user) {
      setRoom(null);
      setPlayers([]);
      setSolutions([]);
      return;
    }

    const unsubRoom = onSnapshot(doc(db, 'rooms', roomId), (doc) => {
      if (doc.exists()) {
        setRoom({ id: doc.id, ...doc.data() });
      } else {
        setError('Room not found');
        setRoomId(null);
      }
    }, (err) => {
      console.error('Room snapshot error:', err);
      setError('Permission denied or room error');
    });

    const unsubPlayers = onSnapshot(collection(db, 'rooms', roomId, 'players'), (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(p);
    });

    const unsubSolutions = onSnapshot(collection(db, 'rooms', roomId, 'solutions'), (snapshot) => {
      const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSolutions(s);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubSolutions();
    };
  }, [roomId, user]);

  const joinRoom = (id: string) => setRoomId(id);
  const leaveRoom = () => setRoomId(null);

  return (
    <GameContext.Provider value={{ room, players, solutions, loading, error, user, roomId, joinRoom, leaveRoom }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
