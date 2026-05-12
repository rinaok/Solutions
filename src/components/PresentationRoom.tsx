import React from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Play, SkipForward, Mic2, Megaphone } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';

export function PresentationRoom() {
  const { room, players, solutions, user } = useGame();
  const isHost = room?.hostId === user?.uid;
  const currentPresenterId = room?.presentingPlayerId;
  const presenter = players.find(p => p.id === currentPresenterId);
  const solution = solutions.find(s => s.playerId === currentPresenterId);

  const canvasData = solution ? JSON.parse(solution.canvasData) : { lines: [], stickers: [] };

  const nextPresenter = async () => {
    if (!room) return;
    const currentIndex = players.findIndex(p => p.id === currentPresenterId);
    if (currentIndex < players.length - 1) {
      const nextId = players[currentIndex + 1].id;
      await updateDoc(doc(db, 'rooms', room.id), {
        presentingPlayerId: nextId
      });
    } else {
      await updateDoc(doc(db, 'rooms', room.id), {
        status: 'awarding'
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-8 bg-[#FDFCF0]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-bold uppercase bg-[#E9535E]/10 text-[#E9535E] px-3 py-1 rounded-full">Now Reading</span>
          <h1 className="text-5xl font-black uppercase tracking-tight">{solution?.name || 'Loading...'}</h1>
        </div>
        <div className="flex items-center gap-4 bg-[#E9535E] text-white p-4 rounded-3xl shadow-xl">
           <Megaphone className="w-8 h-8" />
           <div className="text-right">
              <div className="text-[10px] font-bold uppercase opacity-60">Author</div>
              <div className="text-2xl font-black uppercase">{presenter?.name}</div>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8">
         <div className="flex-1 bg-white rounded-[40px] relative overflow-hidden h-[600px] shadow-2xl border-4 border-white">
            {/* Displaying lines as SVG paths for simplicity in display view */}
            <svg viewBox="0 0 800 600" className="w-full h-full">
               {canvasData.lines.map((line: any, i: number) => (
                 <polyline
                   key={i}
                   points={line.points.join(',')}
                   fill="none"
                   stroke={line.tool === 'eraser' ? 'white' : 'black'}
                   strokeWidth={line.tool === 'eraser' ? 20 : 3}
                   strokeLinecap="round"
                   strokeLinejoin="round"
                 />
               ))}
               {canvasData.stickers.map((s: any) => (
                 <text
                   key={s.id}
                   x={s.x}
                   y={s.y + 40}
                   fontSize="50"
                 >
                   {s.emoji}
                 </text>
               ))}
            </svg>
         </div>

          <div className="w-full lg:w-80 space-y-6">
            <div className="bg-white rounded-3xl p-6 space-y-4 shadow-sm">
               <h3 className="text-xl font-black uppercase flex items-center gap-2 text-[#E9535E]">
                 <Mic2 /> Floor is yours
               </h3>
               <p className="font-bold opacity-60">
                 {presenter?.name}, please explain your work to the group. Tell us about the inspiration for your entry: "{room?.selectedPrompt}".
               </p>
            </div>

            <div className="space-y-4">
               <h4 className="text-xs font-bold uppercase opacity-40 px-2">Next Authors</h4>
               <div className="space-y-2">
                  {players.map(p => (
                    <div key={p.id} className={`p-4 rounded-2xl font-bold uppercase flex justify-between transition-all ${p.id === currentPresenterId ? 'bg-[#E9535E] text-white shadow-lg' : 'bg-white opacity-40 shadow-sm'}`}>
                      <span>{p.name}</span>
                      {p.id === currentPresenterId && <span className="text-xs animate-pulse">LIVE</span>}
                    </div>
                  ))}
               </div>
            </div>

            {isHost && (
              <button
                onClick={nextPresenter}
                className="w-full flex items-center justify-center gap-3 bg-black text-white p-6 font-bold uppercase rounded-full hover:opacity-90 transition-all shadow-xl active:scale-95"
              >
                <SkipForward />
                {players.findIndex(p => p.id === currentPresenterId) === players.length - 1 ? 'Finish Readings' : 'Next Entry'}
              </button>
            )}
         </div>
      </div>
    </div>
  );
}
