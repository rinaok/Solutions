import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Stage, Layer, Line, Image as KonvaImage } from 'react-konva';
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
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || isDone) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
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
        createdAt: new Date().toISOString()
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
    <div className="min-h-screen flex flex-col p-8 border-8 border-black">
      <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
        <div className="space-y-2">
          <span className="text-xs font-black uppercase bg-[#00FF00] px-2 py-1 border-2 border-black">The Protocol</span>
          <h2 className="text-4xl font-black uppercase tracking-tight max-w-2xl">{room?.selectedPrompt}</h2>
        </div>
        
        <div className="space-y-4">
           <label className="text-xs font-black uppercase block">Solution Title</label>
           <input 
             type="text" 
             value={name} 
             onChange={(e) => setName(e.target.value)} 
             disabled={isDone}
             placeholder="THE X-PROJECT"
             className="bg-white border-4 border-black p-4 text-xl font-bold uppercase focus:bg-[#00FF00] outline-none disabled:opacity-50"
           />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
         <div className="space-y-4">
            <h3 className="text-xl font-black uppercase bg-black text-white p-2">Tools</h3>
            <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => setTool('pencil')}
                 className={`p-4 border-4 border-black flex flex-col items-center gap-2 font-bold uppercase ${tool === 'pencil' ? 'bg-[#00FF00]' : 'bg-white'}`}
               >
                 <Pencil /> Draw
               </button>
               <button 
                 onClick={() => setTool('eraser')}
                 className={`p-4 border-4 border-black flex flex-col items-center gap-2 font-bold uppercase ${tool === 'eraser' ? 'bg-[#00FF00]' : 'bg-white'}`}
               >
                 <Eraser /> Erase
               </button>
            </div>
            
            <h3 className="text-xl font-black uppercase bg-black text-white p-2 mt-8">Stickers</h3>
            <div className="grid grid-cols-4 gap-2">
               {STICKERS.map(s => (
                 <button 
                   key={s} 
                   onClick={() => addSticker(s)}
                   className="p-3 border-2 border-black hover:bg-[#00FF00] text-2xl"
                 >
                   {s}
                 </button>
               ))}
            </div>
         </div>

         <div className="lg:col-span-2 bg-[#E4E3E0] border-8 border-black relative overflow-hidden cursor-crosshair h-[600px]">
             <Stage
               width={800}
               height={600}
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               ref={stageRef}
             >
                <Layer>
                   {lines.map((line, i) => (
                     <Line
                       key={i}
                       points={line.points}
                       stroke="#000000"
                       strokeWidth={line.tool === 'eraser' ? 20 : 5}
                       tension={0.5}
                       lineCap="round"
                       globalCompositeOperation={
                         line.tool === 'eraser' ? 'destination-out' : 'source-over'
                       }
                     />
                   ))}
                </Layer>
                <Layer>
                   {/* Stickers are rendered via DOM overlay for simplicity */}
                </Layer>
             </Stage>
             {/* Sticker Overlay (pure DOM for simplicity in this demo or use proper Konva Text) */}
             <div className="absolute inset-0 pointer-events-none">
                {stickers.map(s => (
                  <div key={s.id} className="absolute text-5xl" style={{ left: s.x, top: s.y }}>{s.emoji}</div>
                ))}
             </div>

             {isDone && (
               <div className="absolute inset-0 bg-white/60 flex items-center justify-center p-8 text-center">
                  <div className="bg-black text-[#00FF00] p-12 border-4 border-[#00FF00] space-y-4">
                     <CheckCircle className="w-16 h-16 mx-auto" />
                     <h2 className="text-4xl font-black uppercase">Solution Logged</h2>
                     <p className="font-bold uppercase">Waiting for other researchers...</p>
                  </div>
               </div>
             )}
         </div>

         <div className="space-y-6">
            <h3 className="text-xl font-black uppercase bg-black text-white p-2">Status</h3>
            <div className="space-y-2">
               {players.map(p => (
                 <div key={p.id} className={`p-3 border-2 border-black flex justify-between uppercase font-black ${p.isReady ? 'bg-[#00FF00]' : 'bg-white opacity-50'}`}>
                    <span>{p.name}</span>
                    <span>{p.isReady ? 'READY' : 'WORKING'}</span>
                 </div>
               ))}
            </div>

            {!isDone && (
              <button 
                onClick={handleSave}
                disabled={!name || lines.length === 0}
                className="w-full flex items-center justify-center gap-3 bg-black text-[#00FF00] p-6 font-black uppercase hover:bg-[#00FF00] hover:text-black transition-all border-4 border-black disabled:opacity-30"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                PUBLISH SOLUTION
              </button>
            )}
         </div>
      </div>
    </div>
  );
}
