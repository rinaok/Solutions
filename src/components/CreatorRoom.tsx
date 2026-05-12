import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Stage, Layer, Line, Text } from 'react-konva';
import { motion } from 'motion/react';
import { Eraser, Pencil, Save, CheckCircle, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';

const STICKERS = [
  '🚀', '💡', '🛠️', '🧬', '⚡', '🌈', '🧠', '🤖', '🌍', '🔥', '💎', '🎨'
];

export function CreatorRoom() {
  const { room, players, user } = useGame();
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [lines, setLines] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const isDrawing = useRef(false);
  const stageRef = useRef<any>(null);

  const handleMouseDown = (e: any) => {
    if (isDone) return;
    // Prevent default to avoid scrolling on touch
    if (e.evt && e.evt.preventDefault) {
      // Only prevent default if it's a touch event to avoid blocking clicks
      if (e.evt.type.startsWith('touch')) {
        // e.evt.preventDefault(); // This might block other interactions, be careful
      }
    }
    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || isDone) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Check if we have lines
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
    const x = Math.random() * 400 + 100;
    const y = Math.random() * 300 + 100;
    setStickers([...stickers, { emoji, x, y, id: Date.now().toString() }]);
  };

  const handleSave = async () => {
    if (!user || !room || !name) return;
    setIsSaving(true);
    
    try {
      const stageData = stageRef.current.toJSON();
      await setDoc(doc(db, 'rooms', room.id, 'solutions', user.uid), {
        playerId: user.uid,
        name,
        canvasData: JSON.stringify({ lines, stickers }),
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

  const everyoneReady = players.every(p => p.isReady);

  useEffect(() => {
    if (everyoneReady && room?.hostId === user?.uid && room?.status === 'creating') {
      const waitAndMove = async () => {
        await new Promise(r => setTimeout(r, 2000));
        await updateDoc(doc(db, 'rooms', room.id), {
          status: 'presenting',
          presentingPlayerId: players[0].id
        });
      };
      waitAndMove();
    }
  }, [everyoneReady, room?.id, room?.hostId, user?.uid, room?.status, players]);

  return (
    <div className="min-h-screen flex flex-col p-8 bg-[#FDFCF0]">
      <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase bg-[#E9535E]/10 text-[#E9535E] px-3 py-1 rounded-full">The Prompt</span>
          <h2 className="text-4xl font-black uppercase tracking-tight max-w-2xl">{room?.selectedPrompt}</h2>
        </div>
        
        <div className="w-full md:w-80 space-y-2">
           <label className="text-xs font-bold uppercase block opacity-60">Entry Title</label>
           <input 
             type="text" 
             value={name} 
             onChange={(e) => setName(e.target.value.toUpperCase())} 
             disabled={isDone}
             placeholder="UNTITLED WORK"
             className="w-full bg-white rounded-2xl p-4 text-xl font-bold uppercase focus:ring-4 focus:ring-[#E9535E]/20 outline-none disabled:opacity-50 transition-all shadow-sm"
           />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
         <div className="space-y-4">
            <h3 className="text-xl font-black uppercase text-[#E9535E]">Pencils</h3>
            <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => setTool('pencil')}
                 className={`p-4 rounded-2xl flex flex-col items-center gap-2 font-bold uppercase transition-all ${tool === 'pencil' ? 'bg-[#E9535E] text-white shadow-lg' : 'bg-white text-black/40 hover:text-black shadow-sm'}`}
               >
                 <Pencil /> Sketch
               </button>
               <button 
                 onClick={() => setTool('eraser')}
                 className={`p-4 rounded-2xl flex flex-col items-center gap-2 font-bold uppercase transition-all ${tool === 'eraser' ? 'bg-[#E9535E] text-white shadow-lg' : 'bg-white text-black/40 hover:text-black shadow-sm'}`}
               >
                 <Eraser /> Erase
               </button>
            </div>
            
            <h3 className="text-xl font-black uppercase text-[#E9535E] mt-8">Scrapbook</h3>
            <div className="grid grid-cols-4 gap-2">
               {STICKERS.map(s => (
                 <button 
                   key={s} 
                   onClick={() => addSticker(s)}
                   className="p-3 bg-white rounded-xl hover:bg-[#E9535E]/10 text-2xl transition-colors shadow-sm"
                 >
                   {s}
                 </button>
               ))}
            </div>
         </div>

         <div className="lg:col-span-2 bg-white rounded-[40px] relative overflow-hidden cursor-crosshair h-[600px] touch-none shadow-2xl border-4 border-white">
             <Stage
               width={800}
               height={600}
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
                       stroke="#000000"
                       strokeWidth={line.tool === 'eraser' ? 20 : 3}
                       tension={0.5}
                       lineCap="round"
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
                        fontSize={50}
                        draggable={!isDone}
                        onDragEnd={(e) => {
                           const newStickers = stickers.slice();
                           newStickers[i] = { ...s, x: e.target.x(), y: e.target.y() };
                           setStickers(newStickers);
                        }}
                     />
                   ))}
                </Layer>
             </Stage>

             {isDone && (
               <div className="absolute inset-0 bg-white/80 flex items-center justify-center p-8 text-center backdrop-blur-sm rounded-[40px]">
                  <div className="bg-[#E9535E] text-white p-12 rounded-[40px] shadow-2xl space-y-4">
                     <CheckCircle className="w-16 h-16 mx-auto" />
                     <h2 className="text-4xl font-black uppercase">Work Saved</h2>
                     <p className="font-bold uppercase opacity-80">Waiting for other writers...</p>
                  </div>
               </div>
             )}
         </div>

         <div className="space-y-6">
            <h3 className="text-xl font-black uppercase text-[#E9535E]">Authors</h3>
            <div className="space-y-2">
               {players.map(p => (
                 <div key={p.id} className={`p-4 rounded-2xl flex justify-between uppercase font-bold transition-all shadow-sm ${p.isReady ? 'bg-[#E9535E] text-white' : 'bg-white opacity-50'}`}>
                    <span>{p.name}</span>
                    <span className="text-xs">{p.isReady ? 'DONE' : 'SKETCHING'}</span>
                 </div>
               ))}
            </div>

            {!isDone && (
              <button 
                onClick={handleSave}
                disabled={!name || lines.length === 0}
                className="w-full flex items-center justify-center gap-3 bg-black text-white p-6 font-bold uppercase rounded-full hover:opacity-90 transition-all disabled:opacity-30 shadow-xl"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                FINISH SKETCH
              </button>
            )}
         </div>
      </div>
    </div>
  );
}
