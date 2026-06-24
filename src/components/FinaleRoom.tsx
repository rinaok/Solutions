import React, { useEffect, useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Award, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CHARACTERS, AWARDS } from '../constants';

function AwardImage({ src, fallback, className }: { src: string; fallback: React.ReactNode; className?: string }) {
  const [hasError, setHasError] = useState(false);
  if (hasError || !src) {
    return <>{fallback}</>;
  }
  return (
    <img
      src={src}
      onError={() => setHasError(true)}
      className={className}
      referrerPolicy="no-referrer"
      alt="Award Photo"
    />
  );
}

export function FinaleRoom() {
  const { room, solutions, players, user, leaveRoom } = useGame();
  const isHost = room?.hostId === user?.uid;

  const prizes = room?.prizes || AWARDS;
  const revealIndex = room?.revealIndex !== undefined ? room.revealIndex : 0;

  // Trigger confetti burst on load and every time a new award is revealed!
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#E9535E', '#433D34', '#AE8166']
    });
  }, [revealIndex]);

  const handleNextReveal = async () => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      revealIndex: revealIndex + 1
    });
  };

  // If we haven't revealed all prizes, show them one after another
  const showSingleReveal = revealIndex < prizes.length;

  if (showSingleReveal) {
    const currentPrize = prizes[revealIndex] || AWARDS[0];
    const sol = solutions.find(
      s => s.prizes?.some((p: any) => p.id === currentPrize.id) || s.prize?.id === currentPrize.id
    );

    if (!sol) {
      // Graceful fallback if no solution is found for this prize
      return (
        <div className="min-h-screen flex flex-col justify-between bg-transparent overflow-hidden relative py-4 px-6">
          <div className="text-center pt-2 pb-1 space-y-1">
            <span className="text-[#433D34]/60 font-black uppercase text-xs tracking-widest block">
              Award Reveal {revealIndex + 1} of {prizes.length}
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic text-[#433D34]">
              {currentPrize.name}
            </h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center p-8 bg-white/20 backdrop-blur-sm rounded-lg border border-black/5 max-w-sm">
              <Trophy className="w-16 h-16 text-amber-500/40 mx-auto mb-4" />
              <h3 className="text-lg font-black text-[#433D34] uppercase tracking-tight">No Winner for this award</h3>
              <p className="text-xs text-[#433D34]/60 mt-1 uppercase font-bold">Everyone passed on voting or skipped.</p>
            </div>
          </div>
          {/* Navigation buttons */}
          <div className="w-full flex justify-between pb-2">
            <button 
              onClick={leaveRoom} 
              className="bg-[#433D34] text-white py-3 px-8 text-xl font-black uppercase rounded-[4px] shadow-xl hover:brightness-110 active:scale-95 transition-all"
            >
              New Game
            </button>
            {isHost && (
              <button 
                onClick={handleNextReveal} 
                className="bg-[#ED5F69] text-white py-3 px-8 text-xl font-black uppercase rounded-[4px] shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                Next
              </button>
            )}
          </div>
        </div>
      );
    }

    const player = players.find(p => p.id === sol.playerId);
    const canvasData = JSON.parse(sol.canvasData || '{"lines":[],"stickers":[]}');
    const character = CHARACTERS.find(c => c.id === player?.avatar);
    
    const characterColor = character?.color?.match(/#([a-fA-F0-9]{6})/)?.[1] 
      ? `#${character.color.match(/#([a-fA-F0-9]{6})/)?.[1]}` 
      : '#E9535E';

    return (
      <div className="min-h-screen flex flex-col justify-between bg-transparent overflow-hidden relative py-4 px-6">
        <div className="text-center pt-2 pb-1 space-y-1">
          <span className="text-[#433D34]/60 font-black uppercase text-xs tracking-widest block">
            Award Reveal {revealIndex + 1} of {prizes.length}
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic text-[#433D34]">
            {currentPrize.name}
          </h1>
        </div>

        {/* Centered winner single display */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={revealIndex}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col relative w-full max-w-[320px]"
            >
              {/* Header: Avatar, Trophy, Player Name */}
              <div className="flex flex-col items-start gap-1 mb-3 pl-2">
                <div className="flex items-end gap-3 h-[90px]">
                  {/* Avatar */}
                  <img src={character?.src} className="w-20 h-20 object-contain drop-shadow-md animate-bounce" style={{ animationDuration: '3.5s' }} alt="Winner Avatar" />
                  
                  {/* Trophy & Brushes/Rulers decoration */}
                  <div className="relative w-16 h-20 flex items-end justify-center pb-1">
                    <div className="absolute top-1 left-2 w-3 h-14 bg-[#F4A7C1] rounded-full border border-white transform rotate-[15deg] shadow-sm" />
                    <div className="absolute top-0 left-6 w-3 h-16 bg-[#E9535E] rounded-full border border-white transform rotate-[35deg] shadow-sm" />
                    
                    <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                      <AwardImage 
                        src={currentPrize.src || "/awards/award_1.png"}
                        fallback={<Trophy className="w-10 h-10 text-amber-500" />}
                        className="w-12 h-12 object-contain drop-shadow-md"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Presenter Name */}
                <span className="text-[#433D34] font-black uppercase text-xs tracking-tight mt-1">
                  {player?.name}'s Solution
                </span>

                {/* Won Prize Badge */}
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="bg-[#433D34]/10 text-[#433D34] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-[#433D34]/15">
                    🏆 {currentPrize.name}
                  </span>
                </div>
              </div>

              {/* Drawing Card */}
              <div 
                className="w-full aspect-[3/4] rounded-[12px] shadow-2xl overflow-hidden relative border-2 border-white bg-cover bg-center"
                style={{ backgroundImage: "url('/backgrounds/notebook.png')" }}
              >
                {/* Title Card Inside the Notebook */}
                <div className="absolute top-5 left-1/2 -translate-x-[54%] w-[68%] bg-white py-2 px-4 rounded-[4px] shadow-md z-10 text-center border border-black/5">
                  <h2 className="text-lg font-black uppercase tracking-tight leading-none truncate" style={{ color: characterColor }}>
                    {sol.name || 'Untitled'}
                  </h2>
                </div>

                {/* SVG Drawing Covering entire Notebook Width & Height */}
                <svg viewBox="0 0 340 450" preserveAspectRatio="none" className="w-full h-full absolute inset-0 z-0 pointer-events-none">
                  {canvasData.lines.map((line: any, j: number) => (
                    <polyline
                      key={j}
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation panel */}
        <div className="w-full flex justify-between items-center pb-2">
          <button
            onClick={leaveRoom}
            className="bg-[#433D34] text-white py-3 px-8 text-xl font-black uppercase rounded-[4px] shadow-xl hover:brightness-110 active:scale-95 transition-all"
          >
            New Game
          </button>
          
          {isHost && (
            <button
              onClick={handleNextReveal}
              className="bg-[#ED5F69] text-white py-3 px-8 text-xl font-black uppercase rounded-[4px] shadow-xl hover:brightness-110 active:scale-95 transition-all animate-pulse"
            >
              {revealIndex + 1 === prizes.length ? 'Show All Winners' : 'Next'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grand summary overview (all winners listed scrollable)
  return (
    <div className="min-h-screen flex flex-col justify-between bg-transparent overflow-hidden relative py-4 px-6">
      <div className="text-center pt-2 pb-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-[#433D34]">
          Winner Showcase!
        </h1>
      </div>

      {/* Scrollable Winners Container */}
      <div className="flex-1 flex flex-col items-center py-4 w-full overflow-y-auto max-h-[70vh]">
        <div className="w-full max-w-sm flex flex-col items-center">
          {solutions.filter(s => s.prize || (s.prizes && s.prizes.length > 0)).map((sol, i) => {
            const player = players.find(p => p.id === sol.playerId);
            const canvasData = JSON.parse(sol.canvasData || '{"lines":[],"stickers":[]}');
            const character = CHARACTERS.find(c => c.id === player?.avatar);
            const wonPrizes = sol.prizes || (sol.prize ? [sol.prize] : []);
            const primaryPrize = wonPrizes[0];
            
            const characterColor = character?.color?.match(/#([a-fA-F0-9]{6})/)?.[1] 
              ? `#${character.color.match(/#([a-fA-F0-9]{6})/)?.[1]}` 
              : '#E9535E';

            return (
              <motion.div
                key={sol.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col relative mb-12 w-full max-w-[320px]"
              >
                {/* Header: Avatar, Trophy, Player Name */}
                <div className="flex flex-col items-start gap-1 mb-3 pl-2">
                  <div className="flex items-end gap-3 h-[90px]">
                    <img src={character?.src} className="w-20 h-20 object-contain drop-shadow-md animate-bounce" style={{ animationDuration: '3.5s' }} alt="Avatar" />
                    
                    <div className="relative w-16 h-20 flex items-end justify-center pb-1">
                      <div className="absolute top-1 left-2 w-3 h-14 bg-[#F4A7C1] rounded-full border border-white transform rotate-[15deg] shadow-sm" />
                      <div className="absolute top-0 left-6 w-3 h-16 bg-[#E9535E] rounded-full border border-white transform rotate-[35deg] shadow-sm" />
                      
                      <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <AwardImage 
                          src={primaryPrize?.src || "/awards/award_1.png"}
                          fallback={<Trophy className="w-10 h-10 text-amber-500" />}
                          className="w-12 h-12 object-contain drop-shadow-md"
                        />
                        {wonPrizes.length > 1 && (
                          <div className="absolute -top-1 -right-1 bg-[#ED5F69] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow-sm z-20">
                            +{wonPrizes.length - 1}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <span className="text-[#433D34] font-black uppercase text-xs tracking-tight mt-1">
                    {player?.name}'s Solution
                  </span>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {wonPrizes.map((p: any, idx: number) => (
                      <span 
                        key={idx} 
                        className="bg-[#433D34]/10 text-[#433D34] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-[#433D34]/15"
                      >
                        🏆 {p.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Drawing Card */}
                <div 
                  className="w-full aspect-[3/4] rounded-[12px] shadow-2xl overflow-hidden relative border-2 border-white bg-cover bg-center"
                  style={{ backgroundImage: "url('/backgrounds/notebook.png')" }}
                >
                  <div className="absolute top-5 left-1/2 -translate-x-[54%] w-[68%] bg-white py-2 px-4 rounded-[4px] shadow-md z-10 text-center border border-black/5">
                    <h2 className="text-lg font-black uppercase tracking-tight leading-none truncate" style={{ color: characterColor }}>
                      {sol.name || 'Untitled'}
                    </h2>
                  </div>

                  <svg viewBox="0 0 340 450" preserveAspectRatio="none" className="w-full h-full absolute inset-0 z-0 pointer-events-none">
                    {canvasData.lines.map((line: any, j: number) => (
                      <polyline
                        key={j}
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
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="w-full flex justify-start pb-2">
        <button
          onClick={leaveRoom}
          className="bg-[#433D34] text-white py-3 px-8 text-xl font-black uppercase rounded-[4px] shadow-xl hover:brightness-110 active:scale-95 transition-all"
        >
          New Game
        </button>
      </div>
    </div>
  );
}
