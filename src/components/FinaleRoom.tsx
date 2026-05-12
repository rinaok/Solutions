import React, { useEffect } from 'react';
import { useGame } from '../GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

export function FinaleRoom() {
  const { solutions, players, leaveRoom } = useGame();

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E9535E', '#000000', '#FDFCF0']
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col p-8 bg-[#FDFCF0] overflow-y-auto">
      <div className="text-center mb-16 space-y-6">
        <h1 className="text-9xl font-black uppercase tracking-tighter leading-none italic">
          FINISHED<br />WORKS
        </h1>
        <p className="text-3xl font-bold uppercase tracking-widest text-[#E9535E]">
          The Shared Sketchbook
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 mb-20">
        {solutions.map((sol, i) => {
          const player = players.find(p => p.id === sol.playerId);
          const canvasData = JSON.parse(sol.canvasData);
          
          return (
            <motion.div
              key={sol.id}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.2 }}
              className="bg-white rounded-[40px] flex flex-col group hover:-translate-y-2 transition-all shadow-xl overflow-hidden border-4 border-white"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#FDFCF0]/50 backdrop-blur-sm">
                <div className="font-black text-xl uppercase truncate">{sol.name}</div>
                <div className="text-xs font-bold uppercase opacity-40">By {player?.name}</div>
              </div>
              
              <div className="flex-1 aspect-[4/3] relative bg-white overflow-hidden p-6">
                <svg viewBox="0 0 800 600" className="w-full h-full opacity-30 group-hover:opacity-100 transition-opacity">
                  {canvasData.lines.map((line: any, j: number) => (
                    <polyline
                      key={j}
                      points={line.points.join(',')}
                      fill="none"
                      stroke={line.tool === 'eraser' ? 'white' : 'black'}
                      strokeWidth={line.tool === 'eraser' ? 20 : 3}
                      strokeLinecap="round"
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

                {sol.prize && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.2 + 0.5, type: 'spring' }}
                    className="absolute bottom-6 right-6 bg-white p-4 rounded-2xl shadow-xl z-20 flex flex-col items-center border-2 border-black/5"
                  >
                    <div className="text-3xl mb-1">🌟</div>
                    <div className="text-[10px] font-black uppercase text-center leading-tight max-w-[80px] text-[#E9535E]">
                      {sol.prize.name}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-auto flex justify-center pb-12">
        <button
          onClick={leaveRoom}
          className="group flex items-center gap-4 bg-black text-white px-12 py-6 text-3xl font-bold uppercase rounded-full hover:bg-[#E9535E] shadow-2xl transition-all active:scale-95"
        >
          <Home className="w-8 h-8" />
          Close Book
        </button>
      </div>
    </div>
  );
}
