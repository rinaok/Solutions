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
      colors: ['#00FF00', '#000000', '#FFFFFF']
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col p-8 border-8 border-black bg-[#00FF00]/5 overflow-y-auto">
      <div className="text-center mb-16 space-y-6">
        <h1 className="text-9xl font-black uppercase tracking-tighter leading-none italic">
          GRAND<br />FINALE
        </h1>
        <p className="text-3xl font-bold uppercase tracking-widest bg-black text-white inline-block px-8 py-2">
          Innovation Showcase
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
              className="bg-white border-8 border-black flex flex-col group hover:-rotate-1 transition-transform"
            >
              <div className="p-4 border-b-4 border-black flex justify-between items-center bg-[#E4E3E0]">
                <div className="font-black uppercase truncate">{sol.name}</div>
                <div className="text-[10px] font-black uppercase opacity-60">By {player?.name}</div>
              </div>
              
              <div className="flex-1 aspect-[4/3] relative bg-[#FFFFFF] overflow-hidden">
                <svg viewBox="0 0 800 600" className="w-full h-full opacity-30 group-hover:opacity-100 transition-opacity">
                  {canvasData.lines.map((line: any, j: number) => (
                    <polyline
                      key={j}
                      points={line.points.join(',')}
                      fill="none"
                      stroke={line.tool === 'eraser' ? 'white' : 'black'}
                      strokeWidth={line.tool === 'eraser' ? 20 : 5}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-100">
                  {canvasData.stickers.map((s: any) => (
                    <div key={s.id} className="absolute text-5xl" style={{ left: s.x, top: s.y }}>{s.emoji}</div>
                  ))}
                </div>

                {sol.prize && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.2 + 0.5, type: 'spring' }}
                    className="absolute -bottom-4 -right-4 bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 flex flex-col items-center"
                  >
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-xs font-black uppercase text-center leading-none max-w-[80px]">
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
          className="group flex items-center gap-4 bg-black text-white px-12 py-6 text-3xl font-black uppercase hover:bg-[#00FF00] hover:text-black transition-all border-4 border-black active:scale-95"
        >
          <Home className="w-8 h-8" />
          End Mission
        </button>
      </div>
    </div>
  );
}
