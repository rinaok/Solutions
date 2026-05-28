import React, { useEffect } from 'react';
import { useGame } from '../GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CHARACTERS } from '../constants';

export function FinaleRoom() {
  const { solutions, players, leaveRoom } = useGame();

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E9535E', '#000000', '#DFDFDF']
    });
  }, []);

  return (
    <div className="h-full flex flex-col items-center bg-[#DFDFDF] overflow-y-auto relative p-8">
      <div className="flex-1 w-full max-w-sm flex flex-col pt-12 pb-24">
        {solutions.filter(s => s.prize).map((sol, i) => {
          const player = players.find(p => p.id === sol.playerId);
          const canvasData = JSON.parse(sol.canvasData);
          const character = CHARACTERS.find(c => c.id === player?.avatar);
          
          return (
            <motion.div
              key={sol.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.3 }}
              className="flex flex-col relative mb-12"
            >
              {/* Player Avatar Header */}
              <div className="flex flex-col items-center self-start mb-6 -ml-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white overflow-hidden relative z-10">
                   <img src={character?.src} className="w-12 h-12 object-contain" />
                </div>
                <span className="text-[#8E8E8E] font-black uppercase text-xs mt-1">{player?.name}</span>
              </div>

              {/* Drawing Card */}
              <div className="relative">
                <div className="bg-white rounded-sm shadow-2xl p-4 aspect-[3/4] flex flex-col border-2 border-white overflow-hidden">
                  <svg viewBox="0 0 340 450" className="w-full h-full">
                    {canvasData.lines.map((line: any, j: number) => (
                      <polyline
                        key={j}
                        points={line.points.join(',')}
                        fill="none"
                        stroke={line.tool === 'eraser' ? 'white' : 'black'}
                        strokeWidth={line.tool === 'eraser' ? 30 : 4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
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

                {/* Trophy Reward Overlay */}
                <div className="absolute -top-12 -right-8 z-20">
                   <div className="relative">
                      <div className="w-24 h-24 flex items-center justify-center transform scale-150">
                         <div className="relative">
                            {/* Brushes peaking out */}
                            <div className="absolute -top-10 left-4 w-4 h-16 bg-[#F4A7C1] rounded-full border-2 border-white transform rotate-[15deg] shadow-sm" />
                            <div className="absolute -top-12 left-8 w-4 h-18 bg-[#E9535E] rounded-full border-2 border-white transform rotate-[35deg] shadow-sm" />
                            
                            {/* The Trophy */}
                            <div className="relative z-10">
                               <Trophy className="w-20 h-20 text-[#D4AF37] fill-[#FFD700]" />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>

              {/* Solution Name Tag */}
              <div className="bg-white py-3 px-10 rounded-sm shadow-xl mt-4 self-center min-w-[240px] text-center border-b-4 border-[#E9535E]/20">
                <h3 className="text-[#E9535E] text-2xl font-black uppercase tracking-tight">
                  {sol.name}
                </h3>
              </div>
            </motion.div>
          );
        })}

        {/* New Game Button sitting under the winner content */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 self-start"
        >
          <button
            onClick={leaveRoom}
            className="bg-white text-[#333] px-8 py-3 text-2xl font-black uppercase rounded-sm shadow-xl hover:brightness-95 active:scale-95 transition-all"
          >
            New Game
          </button>
        </motion.div>
      </div>

      <div className="fixed bottom-4 left-4 text-[#8E8E8E] font-black text-xs opacity-50">
        14
      </div>
    </div>
  );
}
