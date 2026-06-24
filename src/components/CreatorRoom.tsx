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

function ToolButton({ 
  type, 
  color, 
  leadColor, 
  imgSrc, 
  alt, 
  isActive, 
  onClick, 
  className 
}: { 
  type: 'pencil' | 'eraser'; 
  color?: string; 
  leadColor?: string; 
  imgSrc: string; 
  alt: string; 
  isActive: boolean; 
  onClick: () => void; 
  className: string; 
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`${className} transition-all duration-300 focus:outline-none cursor-pointer ${
        isActive 
          ? 'scale-110 drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)] brightness-110 z-10' 
          : 'opacity-70 hover:opacity-100 hover:scale-105'
      }`}
    >
      {hasError || !imgSrc ? (
        type === 'eraser' ? (
          <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full pointer-events-none">
            <rect x="5" y="10" width="70" height="40" rx="8" fill="#F48FB1" />
            <rect x="40" y="10" width="35" height="40" rx="8" fill="#F06292" />
            <rect x="35" y="10" width="10" height="40" fill="#E91E63" opacity="0.3" />
          </svg>
        ) : (
          <svg viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full pointer-events-none">
            <rect x="5" y="10" width="15" height="20" rx="3" fill="#F48FB1" />
            <rect x="18" y="10" width="10" height="20" fill="#B0BEC5" />
            <rect x="28" y="10" width="90" height="20" fill={color || '#FFD54F'} />
            <rect x="28" y="10" width="90" height="5" fill="#FFFFFF" opacity={isActive ? 0.35 : 0.2} />
            <rect x="28" y="25" width="90" height="5" fill="#000000" opacity={isActive ? 0.2 : 0.1} />
            <path d="M118 10 L143 20 L118 30 Z" fill="#FFE082" />
            <path d="M135 16.8 L143 20 L135 23.2 Z" fill={leadColor || '#433D34'} />
          </svg>
        )
      ) : (
        <img 
          src={imgSrc} 
          onError={() => setHasError(true)} 
          className="w-full h-full object-contain pointer-events-none" 
          alt={alt} 
        />
      )}
    </button>
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
          
          {/* Peeking Paper Corner on the left of the drawing/notebook */}
          <AnimatePresence>
            {!isPaperOpen && (
              <motion.div
                key="paper-corner"
                initial={{ opacity: 0, x: -30, rotate: -8 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                exit={{ opacity: 0, x: -40, rotate: -15 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                onClick={() => setIsPaperOpen(true)}
                className="absolute left-[-55px] top-[100px] w-20 h-44 cursor-pointer z-20 hover:scale-105 active:scale-95 transition-all flex items-center justify-start"
              >
                <img 
                  src="/drawing/paper_corner.png" 
                  className="w-full h-full object-contain drop-shadow-[2px_6px_12px_rgba(0,0,0,0.15)]" 
                  alt="Paper sticker drawer corner" 
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full Centered Paper with Stickers */}
          <AnimatePresence>
            {isPaperOpen && (
              <motion.div
                key="paper-full"
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                className="absolute inset-0 z-40 flex items-center justify-center p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="w-[320px] h-[430px] p-6 flex flex-col items-center relative rounded-2xl shadow-2xl border border-black/5"
                  style={{
                    backgroundImage: "url('/drawing/paper.png')",
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {/* Hand-drawn style title */}
                  <h3 className="text-[#433D34] text-2xl font-black uppercase tracking-tight mb-6 mt-4 italic text-center select-none">Choose Stickers</h3>
                  
                  {/* Grid of stickers */}
                  <div className="grid grid-cols-2 gap-6 w-full justify-items-center max-h-[250px] overflow-y-auto px-2">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const stickerSrc = `/drawing/sticker_${num}.png`;
                      return (
                        <motion.button
                          key={num}
                          whileHover={{ scale: 1.1, rotate: 3 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setStickers([
                              ...stickers,
                              {
                                id: Date.now().toString() + '_' + num,
                                src: stickerSrc,
                                x: 142, 
                                y: 192  
                              }
                            ]);
                            setIsPaperOpen(false);
                          }}
                          className="w-20 h-20 p-3 rounded-2xl bg-white/60 border border-[#433D34]/10 shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer relative group overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <img src={stickerSrc} className="w-full h-full object-contain relative z-10" alt={`Sticker ${num}`} />
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Close button at the bottom of the paper sheet */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsPaperOpen(false)}
                    className="mt-auto bg-[#433D34] text-white py-2 px-8 rounded-full text-xs font-black uppercase shadow-md hover:bg-[#342f28] transition-colors cursor-pointer"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Standard Pencil */}
          <ToolButton
            type="pencil"
            color="#FFD54F"
            leadColor="#433D34"
            imgSrc="/drawing/pencil.png"
            alt="Pencil tool"
            isActive={tool === 'pencil' && color === '#433D34'}
            onClick={() => {
              setTool('pencil');
              setColor('#433D34');
            }}
            className="absolute left-[-8px] bottom-4 w-28 h-10 transform -rotate-12"
          />

          {/* Green Pencil */}
          <ToolButton
            type="pencil"
            color="#4CAF50"
            leadColor="#2E7D32"
            imgSrc="/drawing/pencil_green.png"
            alt="Green pencil tool"
            isActive={tool === 'pencil' && color === '#4CAF50'}
            onClick={() => {
              setTool('pencil');
              setColor('#4CAF50');
            }}
            className="absolute left-[80px] bottom-5 w-28 h-10 transform -rotate-4"
          />

          {/* Red Pencil */}
          <ToolButton
            type="pencil"
            color="#ED5F69"
            leadColor="#C62828"
            imgSrc="/drawing/pencil_red.png"
            alt="Red pencil tool"
            isActive={tool === 'pencil' && color === '#ED5F69'}
            onClick={() => {
              setTool('pencil');
              setColor('#ED5F69');
            }}
            className="absolute left-[168px] bottom-3 w-28 h-10 transform rotate-6"
          />

          {/* Eraser */}
          <ToolButton
            type="eraser"
            imgSrc="/drawing/eraser.png"
            alt="Eraser tool"
            isActive={tool === 'eraser'}
            onClick={() => {
              setTool('eraser');
            }}
            className="absolute right-[-8px] bottom-1 w-16 h-12 transform rotate-12"
          />
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

      {/* Backdrop dimming overlay */}
      <AnimatePresence>
        {isPaperOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-25 backdrop-blur-[2px] pointer-events-auto"
            onClick={() => setIsPaperOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
