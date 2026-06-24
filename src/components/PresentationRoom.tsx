import React, { useState, useEffect } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Play, SkipForward, Mic2, Megaphone } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS, AWARDS } from '../constants';
import { playSwipe } from '../utils/sounds';

function SVGSticker({ src, x, y }: { src: string; x: number; y: number }) {
  const [dimensions, setDimensions] = useState({ width: 70, height: 70 });

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      const maxSide = 70;
      let w = img.width;
      let h = img.height;
      if (w > 0 && h > 0) {
        if (w > h) {
          h = (h / w) * maxSide;
          w = maxSide;
        } else {
          w = (w / h) * maxSide;
          h = maxSide;
        }
      }
      setDimensions({ width: w, height: h });
    };
  }, [src]);

  return (
    <image
      href={src}
      x={x - dimensions.width / 2}
      y={y - dimensions.height / 2}
      width={dimensions.width}
      height={dimensions.height}
    />
  );
}

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
    playSwipe();
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
    <div className="min-h-screen flex flex-col justify-between bg-transparent overflow-hidden relative py-4 px-6">
      {/* Progress Bar & Character & Name Info */}
      <div className="w-full flex flex-col">
        {/* Progress Bar Header */}
        <div className="w-full max-w-md mx-auto h-[18px] bg-white rounded-full p-[3px] border border-black/10 overflow-hidden shadow-inner mt-2">
          <motion.div 
            className="h-full rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 120) * 100}%` }}
            transition={{ ease: 'linear' }}
            style={{ 
              backgroundColor: brandColor 
            }}
          />
        </div>

        {/* Avatar Section - Character outside the circle and name right under it */}
        <div className="w-full max-w-md mx-auto flex flex-col items-start gap-1 mt-4 px-2">
          <img src={character?.src} className="w-[84px] h-[84px] object-contain drop-shadow-md animate-bounce" style={{ animationDuration: '3s' }} />
          <p className="text-[#433D34] font-black uppercase text-xs tracking-tight text-center leading-none">
            {presenter?.name}'s Solution
          </p>
        </div>
      </div>

      {/* Main Drawing Area */}
      <div className="flex-1 flex items-center justify-center py-2 w-full">
        {/* Drawing Card */}
        <div 
          className="w-full max-w-[350px] aspect-[3/4] max-h-[58vh] rounded-[12px] shadow-2xl overflow-hidden relative border-2 border-white bg-cover bg-center"
          style={{ backgroundImage: "url('/backgrounds/notebook.png')" }}
        >
          {/* Title Card Inside the Notebook */}
          <div className="absolute top-5 left-1/2 -translate-x-[54%] w-[68%] bg-white py-2 px-4 rounded-[4px] shadow-md z-10 text-center border border-black/5">
            <h2 className="text-lg font-black uppercase tracking-tight leading-none truncate" style={{ color: brandColor }}>
              {solution?.name || 'Untitled'}
            </h2>
          </div>

          {/* SVG Drawing Covering entire Notebook Width & Height */}
          <svg viewBox="0 0 340 450" className="w-full h-full absolute inset-0 z-0 pointer-events-none">
            <defs>
              <mask id={`eraser-mask-${currentPresenterId || 'pres'}`}>
                {/* Everything is visible by default */}
                <rect x="0" y="0" width="340" height="450" fill="white" />
                {/* Eraser lines are drawn in black to mask out parts of normal lines */}
                {canvasData.lines
                  .filter((line: any) => line.tool === 'eraser' || line.color === '#FFFBFB')
                  .map((line: any, idx: number) => (
                    <polyline
                      key={`eraser-${idx}`}
                      points={line.points.join(',')}
                      fill="none"
                      stroke="black"
                      strokeWidth={line.tool === 'eraser' ? 30 : 30}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
              </mask>
            </defs>

            {/* Render normal drawing lines with the mask applied */}
            <g mask={`url(#eraser-mask-${currentPresenterId || 'pres'})`}>
              {canvasData.lines
                .filter((line: any) => line.tool !== 'eraser' && line.color !== '#FFFBFB')
                .map((line: any, i: number) => (
                  <polyline
                    key={i}
                    points={line.points.join(',')}
                    fill="none"
                    stroke={line.color || 'black'}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
            </g>
            {canvasData.stickers.map((s: any) => {
              if (s.src) {
                return (
                  <SVGSticker
                    key={s.id}
                    src={s.src}
                    x={s.x}
                    y={s.y}
                  />
                );
              }
              return (
                <text
                  key={s.id}
                  x={s.x}
                  y={s.y + 40}
                  fontSize="60"
                >
                  {s.emoji}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Host Controls */}
      <div className="w-full flex justify-center pb-2">
        {isHost ? (
          <button
            onClick={nextPresenter}
            className="bg-[#433D34] text-white py-3 px-14 text-xl font-black uppercase rounded-[4px] shadow-xl hover:brightness-110 active:scale-95 transition-all min-w-[180px] text-center"
          >
            {players.findIndex(p => p.id === currentPresenterId) === players.length - 1 ? 'Finish' : 'Skip'}
          </button>
        ) : (
          /* Invisible placeholder of the same size to keep layout aligned */
          <div className="h-12 w-full max-w-[180px]" />
        )}
      </div>
    </div>
  );
}
