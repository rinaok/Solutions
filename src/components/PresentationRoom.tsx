import React, { useState, useEffect } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Play, SkipForward, Mic2, Megaphone } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS, AWARDS } from '../constants';

export function PresentationRoom() {
  const { room, players, solutions, user } = useGame();
  const isHost = room?.hostId === user?.uid;
  const currentPresenterId = room?.presentingPlayerId;
  const presenter = players.find(p => p.id === currentPresenterId);
  const solution = solutions.find(s => s.playerId === currentPresenterId);
  const character = CHARACTERS.find(c => c.id === presenter?.avatar);
  const brandColor = character?.color.replace('bg-[', '').replace(']', '') || '#ED5F69';
  const [timeLeft, setTimeLeft] = useState(120);

  const canvasData = solution ? JSON.parse(solution.canvasData) : { lines: [], stickers: [] };

  useEffect(() => {
    if (!room?.timerStartedAt) return;
    
    const interval = setInterval(() => {
      const startedAt = room.timerStartedAt.toDate ? room.timerStartedAt.toDate().getTime() : new Date(room.timerStartedAt).getTime();
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, 120 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0 && isHost) {
        nextPresenter();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [room?.timerStartedAt, currentPresenterId, isHost]);

  const generatePrizes = (numPlayers: number) => {
    const shuffled = [...AWARDS].sort(() => 0.5 - Math.random());
    if (numPlayers <= AWARDS.length) {
      return shuffled.slice(0, numPlayers);
    } else {
      const result = [...shuffled];
      while (result.length < numPlayers) {
        const extra = AWARDS[Math.floor(Math.random() * AWARDS.length)];
        result.push(extra);
      }
      return result;
    }
  };

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
      const selectedPrizes = generatePrizes(players.length);
      await updateDoc(doc(db, 'rooms', room.id), {
        status: 'awarding',
        prizes: selectedPrizes,
        currentPrizeIndex: 0
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden relative pt-12 p-8">
      {/* Progress Bar Header */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-white overflow-hidden z-20">
        <motion.div 
          className="h-full"
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / 120) * 100}%` }}
          transition={{ ease: 'linear' }}
          style={{ 
            backgroundColor: brandColor 
          }}
        />
      </div>

      {/* Avatar Section - Character outside the circle */}
      <div className="absolute top-8 left-6 z-10 flex flex-col items-center">
        <img src={character?.src} className="w-20 h-20 object-contain drop-shadow-lg" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 max-w-xl mx-auto w-full pt-20">
        {/* Presenter Text */}
        <div className="text-center">
          <p className="text-[#433D34]/70 font-black uppercase text-xs tracking-tight mb-1">
            {presenter?.name}'s Solution
          </p>
        </div>

        {/* Title Card */}
        <div className="bg-white py-2 px-8 rounded-sm shadow-xl mb-2">
          <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: brandColor }}>
            {solution?.name || 'Untitled'}
          </h2>
        </div>

        {/* Drawing Card */}
        <div 
          className="w-full max-w-[440px] aspect-[3/4] max-h-[58vh] rounded-lg shadow-2xl overflow-hidden relative p-0 border-2 border-white bg-cover bg-center"
          style={{ backgroundImage: "url('/backgrounds/notebook.png')" }}
        >
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

      {/* Host Controls */}
      {isHost && (
        <div className="mt-auto w-full max-w-md mx-auto pb-8 flex justify-center z-10">
          <button
            onClick={nextPresenter}
            style={{ backgroundColor: brandColor }}
            className="text-white p-[10px] text-2xl font-black uppercase rounded-[4px] shadow-xl hover:brightness-105 active:scale-95 transition-all"
          >
            {players.findIndex(p => p.id === currentPresenterId) === players.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
