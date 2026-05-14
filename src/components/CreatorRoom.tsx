import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Stage, Layer, Line, Text } from 'react-konva';
import { motion } from 'motion/react';
import { Eraser, Pencil, Save, CheckCircle, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS } from '../constants';

const STICKERS = [
  '🚀', '💡', '🛠️', '🧬', '⚡', '🌈', '🧠', '🤖', '🌍', '🔥', '💎', '🎨'
];

export function CreatorRoom() {
  const { room, players, user } = useGame();
  const [phase, setPhase] = useState<'naming' | 'sketching'>('naming');
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState('#ED5F69');
  const [lines, setLines] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const isDrawing = useRef(false);
  const stageRef = useRef<any>(null);
  const nameRef = useRef(name);
  const linesRef = useRef(lines);
  const stickersRef = useRef(stickers);

  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { stickersRef.current = stickers; }, [stickers]);

  const handleMouseDown = (e: any) => {
    if (isDone) return;
    
    // If we clicked on an object (not the stage background), don't start drawing
    // In Konva, e.target is the specific node clicked
    if (e.target !== e.target.getStage()) {
      return;
    }

    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y], color: tool === 'eraser' ? '#ffffff' : color }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || isDone) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    if (lines.length === 0) return;

    let lastLine = { ...lines[lines.length - 1] };
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    
    const newLines = lines.slice(0, -1);
    newLines.push(lastLine);
    setLines(newLines);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const addSticker = (emoji: string) => {
    if (isDone) return;
    // Center it roughly on 340x450 canvas
    const x = 140;
    const y = 200;
    setStickers([...stickers, { emoji, x, y, id: Date.now().toString() }]);
  };

  const handleSave = async (forcedName?: string) => {
    const finalName = forcedName || nameRef.current;
    if (!user || !room || !finalName) return;
    setIsSaving(true);
    
    try {
      await setDoc(doc(db, 'rooms', room.id, 'solutions', user.uid), {
        playerId: user.uid,
        name: finalName,
        canvasData: JSON.stringify({ lines: linesRef.current, stickers: stickersRef.current }),
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'rooms', room.id, 'players', user.uid), {
        isReady: true
      });

      setIsDone(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${room.id}/solutions/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!room?.timerStartedAt) return;
    
    const interval = setInterval(() => {
      const startedAt = room.timerStartedAt.toDate ? room.timerStartedAt.toDate().getTime() : new Date(room.timerStartedAt).getTime();
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0 && !isSaving && !isDone) {
        handleSave(nameRef.current || "UNNAMED SOLUTION");
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [room?.timerStartedAt, isDone, isSaving]);

  const everyoneReady = players.every(p => p.isReady);

  useEffect(() => {
    if (everyoneReady && room?.hostId === user?.uid && room?.status === 'creating') {
      const waitAndMove = async () => {
        await new Promise(r => setTimeout(r, 2000));
        await updateDoc(doc(db, 'rooms', room.id), {
          status: 'presenting',
          presentingPlayerId: players[0].id,
          timerStartedAt: serverTimestamp()
        });
      };
      waitAndMove();
    }
  }, [everyoneReady, room?.id, room?.hostId, user?.uid, room?.status, players]);

  if (isDone) {
    return (
      <div className="h-full flex flex-col bg-[#DFDFDF] overflow-hidden">
        {/* Progress Bar Header */}
        <div className="w-full h-8 bg-white p-2">
          <div className="h-full bg-[#ED5F69]/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#ED5F69]" 
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 60) * 100}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center p-8 space-y-12">
          <h2 className="text-[#A1A1A1] text-xl font-black uppercase text-center max-w-[280px] leading-tight">
            Waiting for everyone to submit their solution
          </h2>

          <div className="relative w-full max-w-xs aspect-square">
            {players.map((p, i) => {
              // Create a organic cluster layout
              const angle = (i * (360 / Math.max(1, players.length)) + 20) * (Math.PI / 180);
              const radius = 90 + (i % 2 === 0 ? 15 : -15); // Reduced radius to fit on small screens
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  style={{ 
                    left: `calc(50% + ${x}px)`, 
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)' 
                  }}
                  className="absolute flex flex-col items-center gap-2"
                >
                  <div className={`w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-xl border-4 ${p.isReady ? 'border-white' : 'border-transparent opacity-30 shadow-none'}`}>
                    <img 
                      src={CHARACTERS.find(c => c.id === p.avatar)?.src} 
                      className={`w-16 h-16 object-contain ${!p.isReady && 'grayscale'}`} 
                    />
                  </div>
                  <span className={`font-black uppercase text-sm ${p.isReady ? 'text-[#ED5F69]' : 'text-[#A1A1A1]'}`}>
                    {p.name}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'naming') {
    return (
      <div className="h-full flex flex-col bg-[#DFDFDF] overflow-hidden">
        {/* Progress Bar Header */}
        <div className="w-full h-8 bg-white p-2">
          <div className="h-full bg-[#ED5F69]/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#ED5F69]" 
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 60) * 100}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-md w-full space-y-12 text-center"
          >
            <h1 className="text-[30px] leading-[74px] mb-5 font-black uppercase tracking-tighter italic text-[#333] text-center">
              {room?.selectedPrompt}
            </h1>
            
            <div className="space-y-6">
               <p className="text-[#A1A1A1] font-bold uppercase tracking-tight text-sm">
                 Name your great solution
               </p>
               <div className="bg-white rounded-lg shadow-sm border-2 border-white">
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="Solution name"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full p-4 text-3xl font-black text-[#ED5F69] text-center placeholder:text-[#ED5F69]/40 outline-none"
                  />
               </div>
            </div>
            
            <button
              onClick={() => name && setPhase('sketching')}
              disabled={!name}
              className="bg-[#ED5F69] text-white px-16 py-4 text-3xl font-black uppercase rounded-lg shadow-xl hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
            >
              Ready!
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#DFDFDF] overflow-hidden">
      {/* Progress Bar Header */}
      <div className="w-full h-8 bg-white p-2">
        <div className="h-full bg-[#ED5F69]/20 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#ED5F69]" 
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 60) * 100}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 gap-6 max-w-4xl mx-auto w-full">
        {/* Solution Title */}
        <div className="bg-white py-2 px-8 rounded-sm shadow-sm">
          <h2 className="text-[#ED5F69] text-2xl font-black uppercase tracking-tight">
            {name}
          </h2>
        </div>

        {/* Labels Row */}
        <div className="w-full flex justify-between px-4">
          <span className="text-[#ED5F69] font-black uppercase text-sm tracking-widest">Drawing</span>
          <span className="text-[#ED5F69] font-black uppercase text-sm tracking-widest">Stickers</span>
        </div>

        {/* Main Creation Area */}
        <div className="w-full flex items-start justify-center gap-4 relative">
          {/* Left Toolbar - Drawing */}
          <div className="flex flex-col gap-4 bg-white p-2 rounded-lg shadow-md self-start">
             <button 
               onClick={() => setTool('pencil')}
               className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${tool === 'pencil' ? 'bg-[#DFDFDF] ring-4 ring-[#ED5F69]' : 'bg-[#DFDFDF]'}`}
             >
               <div className="w-4 h-4 rounded-full bg-[#ED5F69]" />
             </button>
             <button 
               onClick={() => setTool('eraser')}
               className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${tool === 'eraser' ? 'bg-[#ED5F69] text-white' : 'bg-[#DFDFDF] text-black/20'}`}
             >
               <Eraser className="w-6 h-6 rotate-12" />
             </button>

             <div className="h-[2px] bg-black/5 my-2" />

             <button onClick={() => { setTool('pencil'); setColor('#ED5F69'); }} className={`w-12 h-12 rounded-sm bg-[#ED5F69] transition-transform ${color === '#ED5F69' && tool === 'pencil' ? 'scale-110 shadow-lg' : 'opacity-80'}`} />
             <button onClick={() => { setTool('pencil'); setColor('#F28C94'); }} className={`w-12 h-12 rounded-sm bg-[#F28C94] transition-transform ${color === '#F28C94' && tool === 'pencil' ? 'scale-110 shadow-lg' : 'opacity-80'}`} />
             <button onClick={() => { setTool('pencil'); setColor('#4CAF50'); }} className={`w-12 h-12 rounded-sm bg-[#4CAF50] transition-transform ${color === '#4CAF50' && tool === 'pencil' ? 'scale-110 shadow-lg' : 'opacity-80'}`} />
          </div>

          {/* Canvas Card */}
          <div 
            className="flex-1 max-w-[340px] aspect-[3/4] bg-white rounded-lg shadow-2xl overflow-hidden touch-none relative p-2 border-2 border-white"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              stageRef.current.setPointersPositions(e);
              const emoji = e.dataTransfer.getData('emoji');
              if (emoji) {
                const pos = stageRef.current.getPointerPosition();
                setStickers([
                  ...stickers,
                  {
                    x: pos.x - 30, // Offset for font size
                    y: pos.y - 30,
                    emoji,
                    id: Date.now().toString()
                  },
                ]);
              }
            }}
          >
            <Stage
              width={340}
              height={450}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color || '#000000'}
                    strokeWidth={line.tool === 'eraser' ? 30 : 5}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      line.tool === 'eraser' ? 'destination-out' : 'source-over'
                    }
                  />
                ))}
              </Layer>
              <Layer>
                {stickers.map((s, i) => (
                  <Text
                    key={s.id}
                    text={s.emoji}
                    x={s.x}
                    y={s.y}
                    fontSize={60}
                    draggable={!isDone}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                    }}
                    onDragEnd={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                      const newStickers = stickers.slice();
                      newStickers[i] = { ...s, x: e.target.x(), y: e.target.y() };
                      setStickers(newStickers);
                    }}
                  />
                ))}
              </Layer>
            </Stage>

            {isDone && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center p-8 text-center backdrop-blur-sm z-50">
                <div className="bg-[#ED5F69] text-white p-10 rounded-2xl shadow-2xl space-y-4 max-w-[200px]">
                  <CheckCircle className="w-12 h-12 mx-auto" />
                  <p className="font-black uppercase text-xl italic leading-none">Ready for present!</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Toolbar - Stickers */}
          <div className="flex flex-col gap-4 bg-white p-2 rounded-lg shadow-md self-start min-h-[300px]">
             {['💥', '📱', '🌭', '💡', '🧪', '🔥'].map(s => (
               <button 
                 key={s} 
                 onClick={() => addSticker(s)}
                 draggable
                 onDragStart={(e) => {
                   e.dataTransfer.setData('emoji', s);
                 }}
                 className="p-1 text-4xl hover:scale-110 active:scale-125 transition-transform cursor-grab active:cursor-grabbing"
               >
                 {s}
               </button>
             ))}
          </div>
        </div>

        {/* Footer Submit Button */}
        {!isDone && (
          <div className="mt-auto pb-8 w-full flex justify-center">
            <button
              onClick={() => handleSave()}
              disabled={isSaving || lines.length === 0}
              className="bg-[#ED5F69] text-white px-12 py-3 text-2xl font-black uppercase rounded-lg shadow-xl hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
