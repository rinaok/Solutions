import React, { useState } from 'react';
import { signIn, db, auth } from '../firebase';
import { useGame } from '../GameContext';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, Plus, Users, Zap } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';

export function Landing() {
  const { user, joinRoom } = useGame();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = async () => {
    if (!user || !name) return;
    setIsCreating(true);
    const roomCode = generateCode();
    const roomId = roomCode; // Simple for demo, usually use UUID and store code as field
    
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await setDoc(roomRef, {
        roomCode,
        status: 'waiting',
        hostId: user.uid,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'rooms', roomId, 'players', user.uid), {
        name,
        isReady: false,
        joinedAt: serverTimestamp(),
      });

      joinRoom(roomId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !code || !name) return;
    setIsJoining(true);
    const roomId = code.toUpperCase();
    
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        alert('Room not found!');
        return;
      }

      await setDoc(doc(db, 'rooms', roomId, 'players', user.uid), {
        name,
        isReady: false,
        joinedAt: serverTimestamp(),
      });

      joinRoom(roomId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}/players/${user.uid}`);
    } finally {
      setIsJoining(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white border-8 border-black">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-8"
        >
          <h1 className="text-8xl font-black uppercase tracking-tighter leading-none">
            SOLU<br />TIONS
          </h1>
          <p className="text-xl font-bold italic opacity-60">Multiplayer Creative Workshop</p>
          <button
            onClick={() => signIn()}
            className="group relative flex items-center gap-3 bg-[#00FF00] border-4 border-black px-8 py-4 text-2xl font-black uppercase hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            <Zap className="w-8 h-8 fill-black" />
            Enter the Lab
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white border-8 border-black">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-12"
      >
        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest block">Your Alias</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.G. PROFESSOR X"
            className="w-full bg-[#E4E3E0] border-4 border-black p-4 text-xl font-bold uppercase focus:bg-[#00FF00] outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase">Create Room</h2>
            <button
              onClick={handleCreate}
              disabled={!name || isCreating}
              className="w-full flex items-center justify-center gap-2 bg-[#00FF00] border-4 border-black p-6 font-black uppercase hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
            >
              <Plus className="w-6 h-6" />
              {isCreating ? 'BUILDING...' : 'NEW GAME'}
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase">Join Room</h2>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LAB CODE"
                className="w-full bg-[#E4E3E0] border-4 border-black p-4 text-xl font-bold uppercase focus:bg-[#00FF00] outline-none"
              />
              <button
                onClick={handleJoin}
                disabled={!name || !code || isJoining}
                className="w-full flex items-center justify-center gap-2 bg-black text-white border-4 border-black p-4 font-black uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
              >
                <Users className="w-6 h-6" />
                {isJoining ? 'JOINING...' : 'ENTER'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
