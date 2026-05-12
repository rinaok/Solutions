import React from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Users, Play, Copy, ArrowLeft } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';

export function WaitingRoom() {
  const { room, players, user, leaveRoom } = useGame();
  const isHost = room?.hostId === user?.uid;

  const startGame = async () => {
    if (!room) return;
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        status: 'voting',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room?.roomCode || '');
  };

  const handleExit = async () => {
    if (!room || !user) return;
    try {
      await deleteDoc(doc(db, 'rooms', room.id, 'players', user.uid));
      leaveRoom();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col p-8 border-8 border-black">
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-4">
          <button onClick={handleExit} className="flex items-center gap-2 font-black uppercase hover:underline">
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
          <div className="flex items-center gap-4">
             <span className="text-xs font-black uppercase bg-black text-white px-2 py-1">Code</span>
             <h2 className="text-6xl font-black uppercase tracking-widest">{room?.roomCode}</h2>
             <button onClick={copyCode} className="p-2 border-2 border-black hover:bg-[#00FF00] transition-colors">
               <Copy className="w-6 h-6" />
             </button>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black uppercase opacity-60">Status</div>
          <div className="text-xl font-black uppercase">Assembling Team...</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-3xl font-black uppercase flex items-center gap-3">
            <Users className="w-8 h-8" />
            Active Researchers ({players.length})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 bg-[#E4E3E0] border-4 border-black p-4 relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-2xl">
                  {p.name[0]}
                </div>
                <div className="flex-1 font-black text-xl uppercase truncate">{p.name}</div>
                {room?.hostId === p.id && (
                  <span className="absolute top-0 right-0 bg-[#00FF00] text-[8px] font-black uppercase px-2 py-0.5 border-b-2 border-l-2 border-black">HOST</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-8 bg-[#00FF00] border-4 border-black p-8 flex flex-col justify-between">
          <div className="space-y-4">
             <h3 className="text-2xl font-black uppercase">In Lab Instructions</h3>
             <ul className="space-y-2 font-bold uppercase text-sm list-disc pl-4">
               <li>Wait for everyone to join</li>
               <li>Host starts the protocol</li>
               <li>Brainstorm unconventional solutions</li>
               <li>Earn prestigious awards</li>
             </ul>
          </div>
          
          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className="w-full flex items-center justify-center gap-3 bg-black text-white p-6 font-black uppercase hover:bg-white hover:text-black transition-all group active:scale-95"
            >
              <Play className="w-6 h-6 fill-current" />
              START PROTOCOL
            </button>
          ) : (
            <div className="bg-black text-[#00FF00] p-4 text-center font-black uppercase animate-pulse">
              Waiting for Lead Researcher...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
