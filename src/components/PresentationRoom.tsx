import React from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Play, SkipForward, Mic2, Megaphone } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS } from '../constants';

export function PresentationRoom() {
  const { room, players, solutions, user } = useGame();
  const isHost = room?.hostId === user?.uid;
  const currentPresenterId = room?.presentingPlayerId;
  const presenter = players.find(p => p.id === currentPresenterId);
  const solution = solutions.find(s => s.playerId === currentPresenterId);
  const character = CHARACTERS.find(c => c.id === presenter?.avatar);
  const brandColor = character?.color.replace('bg-[', '').replace(']', '') || '#ED5F69';

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
    <div className="h-full flex flex-col bg-[#DFDFDF] overflow-hidden relative p-8">
      {/* Avatar Section */}
      <div className="absolute top-8 left-8 z-10 flex flex-col items-center">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl border-8 border-white overflow-hidden">
          <img src={character?.src} className="w-24 h-24 object-contain" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto w-full pt-20">
        {/* Presenter Text */}
        <div className="text-center">
          <p className="text-[#A1A1A1] font-black uppercase text-sm tracking-tight mb-2">
            {presenter?.name}'s Solution
          </p>
        </div>

        {/* Title Card */}
        <div className="bg-white py-3 px-10 rounded-sm shadow-xl mb-4">
          <h2 className="text-3xl font-black uppercase tracking-tight" style={{ color: brandColor }}>
            {solution?.name || 'Untitled'}
          </h2>
        </div>

        {/* Drawing Card */}
        <div className="w-full aspect-[3/4] bg-white rounded-lg shadow-2xl overflow-hidden relative p-4 border-2 border-white">
          <svg viewBox="0 0 340 450" className="w-full h-full">
            {canvasData.lines.map((line: any, i: number) => (
              <polyline
                key={i}
                points={line.points.join(',')}
                fill="none"
                stroke={line.tool === 'eraser' ? 'white' : (line.color || 'black')}
                strokeWidth={line.tool === 'eraser' ? 30 : 5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  mixBlendMode: line.tool === 'eraser' ? 'destination-out' : 'normal'
                } as any}
              />
            ))}
            {canvasData.stickers.map((s: any) => (
              <text
                key={s.id}
                x={s.x}
                y={s.y + 40}
                fontSize="60"
              >
                {s.emoji}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Progress Bar & Host Controls */}
      <div className="mt-auto w-full max-w-md mx-auto space-y-6 pb-8">
        <div className="w-full h-5 bg-white rounded-none p-0 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: '70%', 
              backgroundColor: brandColor 
            }}
          />
        </div>

        {isHost && (
          <button
            onClick={nextPresenter}
            className="w-full flex items-center justify-center gap-3 bg-black text-white p-4 font-bold uppercase rounded-xl hover:opacity-90 transition-all shadow-xl active:scale-95"
          >
            <SkipForward className="w-5 h-5" />
            {players.findIndex(p => p.id === currentPresenterId) === players.length - 1 ? 'Finish Showcase' : 'Next Entry'}
          </button>
        )}
      </div>
    </div>
  );
}
