import React from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Users, Play, Copy, ArrowLeft } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS } from '../constants';
import { playClick, playSwipe } from '../utils/sounds';

export function WaitingRoom() {
  const { room, players, user, leaveRoom } = useGame();
  const isHost = room?.hostId === user?.uid;

  const startGame = async () => {
    if (!room) return;
    playSwipe();
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        status: 'voting',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const copyCode = () => {
    playClick();
    navigator.clipboard.writeText(room?.roomCode || '');
  };

  const handleExit = async () => {
    if (!room || !user) return;
    playClick();
    try {
      await deleteDoc(doc(db, 'rooms', room.id, 'players', user.uid));
      leaveRoom();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 bg-transparent overflow-y-auto">
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-4">
          <button onClick={handleExit} className="flex items-center gap-2 font-black uppercase hover:opacity-60 transition-opacity">
            <ArrowLeft className="w-5 h-5" /> Go Back
          </button>
          <div className="flex items-center gap-4">
             <h2 className="text-6xl font-black uppercase tracking-widest">{room?.roomCode}</h2>
             <button onClick={copyCode} className="p-[10px] bg-white hover:shadow-md rounded-[4px] transition-all active:scale-90">
               <Copy className="w-6 h-6" />
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="flex flex-wrap gap-8">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-24 h-24 flex items-center justify-center relative transition-all duration-300 hover:scale-115">
                  {p.avatar ? (
                    <>
                      <img 
                        src={CHARACTERS.find(c => c.id === p.avatar)?.src} 
                        className="w-24 h-24 object-contain relative z-10"
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
                      <div className="mini-fallback hidden text-5xl">
                        {CHARACTERS.find(c => c.id === p.avatar)?.emoji}
                      </div>
                    </>
                  ) : (
                    <div className="w-20 h-20 bg-[#433D34] text-white flex items-center justify-center font-black text-3xl rounded-xl">
                      {p.name[0]}
                    </div>
                  )}
                </div>
                <span className="text-sm font-extrabold uppercase text-[#433D34] tracking-wider bg-white/25 px-3 py-1 rounded-sm shadow-sm">{p.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-end">
          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className="w-full flex items-center justify-center gap-[10px] bg-[#E9535E] text-white p-[10px] font-black uppercase rounded-[4px] hover:opacity-90 transition-all group active:scale-95 disabled:opacity-30"
            >
              <Play className="w-6 h-6 fill-current" />
              Everyone is in!
            </button>
          ) : (
            <div className="bg-black text-white p-6 text-center font-black uppercase animate-pulse rounded-full">
              Waiting for Editor...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
