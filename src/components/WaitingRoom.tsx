import React from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Users, Play, Copy, ArrowLeft } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS } from '../constants';

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
    <div className="min-h-screen flex flex-col p-8 bg-[#FDFCF0]">
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-4">
          <button onClick={handleExit} className="flex items-center gap-2 font-bold uppercase hover:opacity-60 transition-opacity">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <div className="flex items-center gap-4">
             <span className="text-xs font-bold uppercase bg-[#E9535E] text-white px-3 py-1 rounded-full">Page</span>
             <h2 className="text-6xl font-black uppercase tracking-widest">{room?.roomCode}</h2>
             <button onClick={copyCode} className="p-3 bg-white hover:bg-[#E9535E]/10 rounded-full transition-colors">
               <Copy className="w-6 h-6" />
             </button>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase opacity-60">Status</div>
          <div className="text-xl font-black uppercase text-[#E9535E]">Opening Notebook...</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-3xl font-black uppercase flex items-center gap-3">
            <Users className="w-8 h-8" />
            Contributors ({players.length})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 bg-white rounded-3xl p-4 relative overflow-hidden shadow-sm"
              >
                <div className="w-12 h-12 bg-[#FDFCF0] flex items-center justify-center rounded-2xl overflow-hidden relative">
                  {p.avatar ? (
                    <>
                      <img 
                        src={CHARACTERS.find(c => c.id === p.avatar)?.src} 
                        className="w-10 h-10 object-contain relative z-10"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.mini-fallback');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                      <div className="mini-fallback hidden text-2xl">
                        {CHARACTERS.find(c => c.id === p.avatar)?.emoji}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-black text-white flex items-center justify-center font-black text-2xl">
                      {p.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 font-bold text-xl uppercase truncate">{p.name}</div>
                {room?.hostId === p.id && (
                  <span className="absolute top-0 right-0 bg-[#E9535E] text-white text-[10px] font-bold uppercase px-3 py-1 rounded-bl-2xl">EDITOR</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-8 bg-white rounded-[40px] p-8 flex flex-col justify-between shadow-xl">
          <div className="space-y-6">
             <h3 className="text-2xl font-black uppercase text-[#E9535E]">Notebook Rules</h3>
             <ul className="space-y-4 font-bold uppercase text-sm">
               <li className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-[#E9535E] rounded-full" />
                 Wait for the group to assemble
               </li>
               <li className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-[#E9535E] rounded-full" />
                 Editor starts the session
               </li>
               <li className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-[#E9535E] rounded-full" />
                 Sketch unconventional solutions
               </li>
               <li className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-[#E9535E] rounded-full" />
                 Award the best ideas
               </li>
             </ul>
          </div>
          
          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className="w-full flex items-center justify-center gap-3 bg-[#E9535E] text-white p-6 font-bold uppercase rounded-full hover:opacity-90 transition-all group active:scale-95 disabled:opacity-30"
            >
              <Play className="w-6 h-6 fill-current" />
              START WRITING
            </button>
          ) : (
            <div className="bg-black text-white p-6 text-center font-bold uppercase animate-pulse rounded-full">
              Waiting for Editor...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
