import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Stage, Layer, Line, Text, Image as KonvaImage } from 'react-konva';
import { motion, AnimatePresence } from 'motion/react';
import { Eraser, Pencil, Save, CheckCircle, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';
import { CHARACTERS, DEFAULT_PROMPTS, PROMPT_IMAGES } from '../constants';

const STICKERS = [
  '🚀', '💡', '🛠️', '🧬', '⚡', '🌈', '🧠', '🤖', '🌍', '🔥', '💎', '🎨'
];

function StickerImage({ src, x, y, isDone, onDragEnd }: any) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setImage(img);
    };
  }, [src]);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={70}
      height={70}
      offsetX={35}
      offsetY={35}
      draggable={!isDone}
      onDragEnd={onDragEnd}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'default';
      }}
    />
  );
}

export function CreatorRoom() {
  const { room, players, user } = useGame();
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState('#433D34');
  const [lines, setLines] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isPrep, setIsPrep] = useState(true);
  const [isPaperOpen, setIsPaperOpen] = useState(false);
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
    const scaleX = 284 / 340;
    const scaleY = 384 / 450;
    const x = pos.x / scaleX;
    const y = pos.y / scaleY;
    setLines([...lines, { tool, points: [x, y], color: tool === 'eraser' ? '#FFFBFB' : color }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || isDone) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const scaleX = 284 / 340;
    const scaleY = 384 / 450;
    const x = point.x / scaleX;
    const y = point.y / scaleY;
    
    if (lines.length === 0) return;

    let lastLine = { ...lines[lines.length - 1] };
    lastLine.points = lastLine.points.concat([x, y]);
    
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
      const remaining = Math.max(0, 120 - elapsed);
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

  if (isPrep) {
    const promptText = room?.selectedPrompt || "My house is full of idiots";
    const promptIndex = DEFAULT_PROMPTS.indexOf(promptText);
    const promptImage = promptIndex !== -1 ? PROMPT_IMAGES[promptIndex] : PROMPT_IMAGES[0];

    // Split the prompt dynamically: first half is smaller/subtle, second half is massive and bold
    const splitPrompt = (text: string) => {
      const words = text.split(' ');
      if (words.length <= 2) {
        return { part1: words[0] || '', part2: words.slice(1).join(' ') };
      }
      const mid = Math.max(1, Math.floor(words.length * 0.5));
      return {
        part1: words.slice(0, mid).join(' '),
        part2: words.slice(mid).join(' ')
      };
    };

    const { part1, part2 } = splitPrompt(promptText);

    return (
      <div 
        onClick={() => setIsPrep(false)}
        className="h-full min-h-screen flex flex-col items-center justify-between py-12 px-4 bg-transparent text-center overflow-hidden cursor-pointer select-none"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center w-full max-w-sm space-y-8"
        >
          {/* Elegant Polaroid card with shadow and subtle border */}
          <div className="w-full max-w-[280px] aspect-square bg-white rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.18)] p-4 flex flex-col border border-black/5 transform rotate-1">
            <div className="flex-1 bg-[#D1D1D1] rounded-xl overflow-hidden relative">
              <img 
                src={promptImage} 
                className="w-full h-full object-cover"
                alt="Selected problem illustration"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Prompt text below the card */}
          <div className="text-center max-w-[280px] space-y-1">
            <p className="text-[#433D34]/70 text-lg font-bold font-sans">
              {part1}
            </p>
            <p className="text-[#433D34] text-[32px] md:text-[36px] font-black leading-tight tracking-tight lowercase">
              {part2}!
            </p>
          </div>
        </motion.div>

        {/* Action button at the bottom */}
        <div className="w-full flex justify-center pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPrep(false);
            }}
            className="bg-[#ED5F69] text-white py-3 px-8 text-xl font-black uppercase rounded-[4px] shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Get ready to create
          </button>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="h-full flex flex-col bg-transparent overflow-hidden">
        {/* Progress Bar Header */}
        <div className="w-full h-8 bg-white p-2">
          <div className="h-full bg-[#ED5F69]/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#ED5F69]" 
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 120) * 100}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center p-8 space-y-12">
          <h2 className="text-[#433D34] text-xl font-black uppercase text-center max-w-[280px] leading-tight">
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
                  <div className={`w-24 h-24 flex items-center justify-center relative transition-all duration-300 ${p.isReady ? 'scale-110 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] opacity-100' : 'opacity-40 grayscale'}`}>
                    <img 
                      src={CHARACTERS.find(c => c.id === p.avatar)?.src} 
                      className="w-24 h-24 object-contain relative z-10" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextSibling) {
                          (target.nextSibling as HTMLElement).classList.remove('hidden');
                        }
                      }}
                    />
                    <div className="mini-fallback hidden text-5xl">
                      {CHARACTERS.find(c => c.id === p.avatar)?.emoji}
                    </div>
                  </div>
                  <span className={`font-extrabold uppercase text-xs tracking-wider px-2 py-0.5 rounded-sm shadow-sm transition-all duration-300 ${p.isReady ? 'bg-[#FFFBFB]/25 text-[#433D34]' : 'bg-[#FFFBFB]/10 text-[#433D34]/50'}`}>
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

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      {/* Progress Bar Header */}
      <div className="w-full flex flex-col items-center pt-4 px-4 gap-1">
        <div className="w-[80%] max-w-[280px] h-4 bg-white rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-[#ED5F69]" 
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / 120) * 100}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>
        
        {/* Prompt Header */}
        <p className="text-white/80 text-[13px] font-black uppercase tracking-widest text-center mt-1">
          PROMPT: {room?.selectedPrompt}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between p-4 gap-2 max-w-4xl mx-auto w-full overflow-y-auto">
        
        {/* Editable Solution Title inside White Banner */}
        <div className="bg-white px-6 py-2 rounded-[8px] shadow-md max-w-[280px] w-full border border-black/5 mt-1">
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            placeholder="NAME YOUR SOLUTION"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full text-[#ED5F69] text-xl font-black uppercase tracking-tight text-center outline-none border-none bg-transparent placeholder:text-[#ED5F69]/40"
            maxLength={18}
          />
        </div>

        {/* Central Creation Area */}
        <div className="relative w-[340px] h-[480px] mx-auto flex flex-col items-center justify-start mt-2 select-none">
          
          {/* Paper with Stickers trigger (Corner) */}
          <div 
            onClick={() => setIsPaperOpen(true)}
            className="absolute left-[-22px] top-[100px] w-14 h-40 cursor-pointer z-20 hover:scale-105 active:scale-95 transition-transform"
          >
            <img src="/drawing/paper.png" className="w-full h-full object-contain" alt="Paper sticker drawer" />
          </div>

          {/* Canvas Card (Notebook) */}
          <div 
            className="w-[300px] h-[400px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden touch-none relative p-2 bg-cover bg-center bg-white"
            style={{ backgroundImage: "url('/backgrounds/notebook.png')" }}
          >
            <Stage
              width={284}
              height={384}
              scaleX={284 / 340}
              scaleY={384 / 450}
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
                    stroke={line.color || '#433D34'}
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
                {stickers.map((s, i) => {
                  if (s.src) {
                    return (
                      <StickerImage
                        key={s.id}
                        src={s.src}
                        x={s.x}
                        y={s.y}
                        isDone={isDone}
                        onDragEnd={(e: any) => {
                          const newStickers = stickers.slice();
                          newStickers[i] = { ...s, x: e.target.x(), y: e.target.y() };
                          setStickers(newStickers);
                        }}
                      />
                    );
                  }
                  return (
                    <Text
                      key={s.id}
                      text={s.emoji}
                      x={s.x}
                      y={s.y}
                      fontSize={40}
                      draggable={!isDone}
                      onDragEnd={(e) => {
                        const newStickers = stickers.slice();
                        newStickers[i] = { ...s, x: e.target.x(), y: e.target.y() };
                        setStickers(newStickers);
                      }}
                    />
                  );
                })}
              </Layer>
            </Stage>

            {isDone && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center p-8 text-center backdrop-blur-sm z-50">
                <div className="bg-[#ED5F69] text-white p-6 rounded-2xl shadow-2xl space-y-4 max-w-[180px]">
                  <CheckCircle className="w-12 h-12 mx-auto animate-bounce" />
                  <p className="font-black uppercase text-lg italic leading-none">Ready for present!</p>
                </div>
              </div>
            )}
          </div>

          {/* Pencil Button lying diagonally */}
          <button
            onClick={() => setTool('pencil')}
            className={`absolute left-0 bottom-4 w-44 h-12 transform -rotate-6 transition-all duration-300 focus:outline-none cursor-pointer ${tool === 'pencil' ? 'scale-110 drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)] brightness-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
          >
            <img src="/drawing/pencil.png" className="w-full h-full object-contain pointer-events-none" alt="Pencil tool" />
          </button>

          {/* Eraser Button lying diagonally */}
          <button
            onClick={() => setTool('eraser')}
            className={`absolute right-2 bottom-0 w-20 h-16 transform rotate-12 transition-all duration-300 focus:outline-none cursor-pointer ${tool === 'eraser' ? 'scale-115 drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)] brightness-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
          >
            <img src="/drawing/eraser.png" className="w-full h-full object-contain pointer-events-none" alt="Eraser tool" />
          </button>
        </div>

        {/* Footer Submit Button */}
        {!isDone && (
          <div className="pb-4 w-full flex justify-center mt-auto z-10">
            <button
              onClick={() => handleSave()}
              disabled={isSaving || lines.length === 0 || !name.trim()}
              className="bg-[#ED5F69] text-white py-3 px-12 text-xl font-black uppercase rounded-[4px] shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : 'Submit'}
            </button>
          </div>
        )}
      </div>

      {/* Paper Overlay modal for stickers */}
      <AnimatePresence>
        {isPaperOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsPaperOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-black/5 flex flex-col items-center relative"
              onClick={(e) => e.stopPropagation()}
              style={{ 
                backgroundImage: "radial-gradient(circle, #ffffff 0%, #f4f4f4 100%)"
              }}
            >
              <h3 className="text-[#433D34] text-2xl font-black uppercase tracking-tight mb-4">Choose Stickers</h3>
              
              <div className="grid grid-cols-3 gap-4 w-full justify-items-center mb-6">
                {[1, 2, 3, 4, 5].map((num) => {
                  const stickerSrc = `/drawing/sticker_${num}.png`;
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        // Add image sticker to canvas and close
                        setStickers([
                          ...stickers,
                          {
                            id: Date.now().toString() + '_' + num,
                            src: stickerSrc,
                            x: 140, // Centered inside the 284 stage width
                            y: 192  // Centered inside the 384 stage height
                          }
                        ]);
                        setIsPaperOpen(false);
                      }}
                      className="w-16 h-16 p-2 rounded-2xl hover:scale-110 active:scale-90 transition-transform bg-white/50 border border-black/5 shadow-sm hover:shadow-md flex items-center justify-center cursor-pointer"
                    >
                      <img src={stickerSrc} className="w-full h-full object-contain" alt={`Sticker ${num}`} />
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setIsPaperOpen(false)}
                className="bg-[#433D34] text-white py-2 px-6 rounded-lg text-sm font-black uppercase shadow-md hover:bg-[#342f28] transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
