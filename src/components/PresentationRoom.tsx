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
    <div className="min-h-screen flex flex-col p-8 border-8 border-black">
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-black uppercase bg-black text-white px-2 py-1">Presentation Stage</span>
          <h1 className="text-5xl font-black uppercase tracking-tight">{solution?.name || 'Loading...'}</h1>
        </div>
        <div className="flex items-center gap-4 bg-[#00FF00] border-4 border-black p-4">
           <Megaphone className="w-8 h-8" />
           <div className="text-right">
              <div className="text-[10px] font-black uppercase opacity-60">Now Presenting</div>
              <div className="text-2xl font-black uppercase">{presenter?.name}</div>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8">
         <div className="flex-1 bg-white border-8 border-black relative overflow-hidden h-[600px]">
            {/* Displaying lines as SVG paths for simplicity in display view */}
            <svg viewBox="0 0 800 600" className="w-full h-full">
               {canvasData.lines.map((line: any, i: number) => (
                 <polyline
                   key={i}
                   points={line.points.join(',')}
                   fill="none"
                   stroke={line.tool === 'eraser' ? 'white' : 'black'}
                   strokeWidth={line.tool === 'eraser' ? 20 : 5}
                   strokeLinecap="round"
                   strokeLinejoin="round"
                 />
               ))}
            </svg>
            <div className="absolute inset-0 pointer-events-none">
                {canvasData.stickers.map((s: any) => (
                  <div key={s.id} className="absolute text-7xl" style={{ left: s.x, top: s.y }}>{s.emoji}</div>
                ))}
             </div>
         </div>

         <div className="w-full lg:w-80 space-y-6">
            <div className="bg-[#E4E3E0] border-4 border-black p-6 space-y-4">
               <h3 className="text-xl font-black uppercase flex items-center gap-2">
                 <Mic2 /> Floor is yours
               </h3>
               <p className="font-bold text-sm uppercase leading-relaxed">
                 {presenter?.name}, please explain your solution to the group. Tell us about your vision and how it solves the mystery of "{room?.selectedPrompt}".
               </p>
            </div>

            <div className="border-4 border-black p-6 space-y-4">
               <h4 className="text-xs font-black uppercase opacity-60">Queue</h4>
               <div className="space-y-2">
                  {players.map(p => (
                    <div key={p.id} className={`p-2 font-black uppercase flex justify-between ${p.id === currentPresenterId ? 'bg-[#00FF00]' : 'opacity-40'}`}>
                      <span>{p.name}</span>
                      {p.id === currentPresenterId && <span className="animate-pulse">LIVE</span>}
                    </div>
                  ))}
               </div>
            </div>

            {isHost && (
              <button
                onClick={nextPresenter}
                className="w-full flex items-center justify-center gap-3 bg-black text-[#00FF00] p-6 font-black uppercase hover:bg-[#00FF00] hover:text-black transition-all border-4 border-black"
              >
                <SkipForward />
                {players.findIndex(p => p.id === currentPresenterId) === players.length - 1 ? 'End Presentations' : 'Next Presenter'}
              </button>
            )}
         </div>
      </div>
    </div>
  );
}
