import React, { useState, useEffect } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  const [timeLeft, setTimeLeft] = useState(10);

  const canvasData = solution ? JSON.parse(solution.canvasData) : { lines: [], stickers: [] };

  useEffect(() => {
    if (!room?.timerStartedAt) return;
    
    const interval = setInterval(() => {
      const startedAt = room.timerStartedAt.toDate ? room.timerStartedAt.toDate().getTime() : new Date(room.timerStartedAt).getTime();
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, 10 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0 && isHost) {
        nextPresenter();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [room?.timerStartedAt, currentPresenterId, isHost]);

  const nextPresenter = async () => {
    if (!room) return;
    const currentIndex = players.findIndex(p => p.id === currentPresenterId);
    if (currentIndex < players.length - 1) {
      const nextId = players[currentIndex + 1].id;
      await updateDoc(doc(db, 'rooms', room.id), {
        presentingPlayerId: nextId,
        timerStartedAt: serverTimestamp()
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
      <div className="absolute top-4 left-4 z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white overflow-hidden">
          <img src={character?.src} className="w-14 h-14 object-contain" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 max-w-md mx-auto w-full pt-20">
        {/* Presenter Text */}
        <div className="text-center translate-x-4">
          <p className="text-[#A1A1A1] font-black uppercase text-xs tracking-tight mb-1">
            {presenter?.name}'s Solution
          </p>
        </div>

        {/* Title Card */}
        <div className="bg-white py-2 px-8 rounded-sm shadow-xl mb-2 translate-x-4">
          <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: brandColor }}>
            {solution?.name || 'Untitled'}
          </h2>
        </div>

        {/* Drawing Card */}
        <div className="w-[85%] aspect-[3/4] max-h-[50vh] bg-white rounded-lg shadow-2xl overflow-hidden relative p-4 border-2 border-white">
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
          <motion.div 
            className="h-full"
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 10) * 100}%` }}
            transition={{ ease: 'linear' }}
            style={{ 
              backgroundColor: brandColor 
            }}
          />
        </div>

        {isHost && (
          <div className="flex justify-center">
            <button
              onClick={nextPresenter}
              style={{ backgroundColor: brandColor }}
              className="text-white px-12 py-3 text-2xl font-black uppercase rounded-lg shadow-xl hover:brightness-105 active:scale-95 transition-all"
            >
              {players.findIndex(p => p.id === currentPresenterId) === players.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
