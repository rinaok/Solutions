import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, setDoc, arrayUnion } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trophy, Gift, Star, Award, Heart, Zap, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../errorHandlers';

const PRIZES = [
  { id: 'p1', name: 'Most Audacious', icon: <Zap className="text-yellow-500" /> },
  { id: 'p2', name: 'Genius Design', icon: <Trophy className="text-amber-500" /> },
  { id: 'p3', name: 'Pure Magic', icon: <Sparkles className="text-purple-500" /> },
  { id: 'p4', name: 'Most Helpful', icon: <Heart className="text-red-500" /> },
  { id: 'p5', name: 'Sticker Mastery', icon: <Star className="text-blue-500" /> },
  { id: 'p6', name: 'X-Factor Award', icon: <Award className="text-emerald-500" /> }
];

export function AwardRoom() {
  const { room, players, solutions, user } = useGame();
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [selectedPrize, setSelectedPrize] = useState<any | null>(null);
  const [isAwarded, setIsAwarded] = useState(false);
  const isHost = room?.hostId === user?.uid;

  const handleAward = async () => {
    if (!user || !room || !selectedSolution || !selectedPrize) return;
    
    try {
      // Award the solution
      await updateDoc(doc(db, 'rooms', room.id, 'solutions', selectedSolution), {
        prize: {
          id: selectedPrize.id,
          name: selectedPrize.name,
          from: user.displayName || 'Researcher'
        }
      });

      // Mark self as ready (finished awarding)
      await updateDoc(doc(db, 'rooms', room.id, 'players', user.uid), {
        status: 'awarded'
      });

      setIsAwarded(true);
    } catch (error) {
      console.error(error);
    }
  };

  const finishAwards = async () => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      status: 'finale'
    });
  };

  const everyoneAwarded = players.every(p => p.status === 'awarded');

  return (
    <div className="min-h-screen flex flex-col p-8 bg-[#FDFCF0]">
      <div className="mb-12">
        <h1 className="text-6xl font-black uppercase tracking-tighter mb-2">Peer Review</h1>
        <p className="text-xl font-bold uppercase opacity-60">Give a gold seal to your favorite entry.</p>
      </div>

      {!isAwarded ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-6">
            <h3 className="text-2xl font-black uppercase text-[#E9535E]">1. Best Entry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solutions.filter(s => s.playerId !== user?.uid).map(s => (
                <div 
                  key={s.id}
                  onClick={() => setSelectedSolution(s.id)}
                  className={`cursor-pointer p-6 rounded-[32px] transition-all relative overflow-hidden ${
                    selectedSolution === s.id ? 'bg-[#E9535E] text-white shadow-xl translate-y-[-4px]' : 'bg-white hover:bg-[#E4E3E0] shadow-sm'
                  }`}
                >
                  <div className="text-2xl font-black uppercase">{s.name}</div>
                  <div className={`text-sm font-bold uppercase opacity-60 ${selectedSolution === s.id ? 'text-white' : 'text-black'}`}>By {players.find(p => p.id === s.playerId)?.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-6">
             <h3 className="text-2xl font-black uppercase text-[#E9535E]">2. Select Seal</h3>
             <div className="grid grid-cols-2 gap-4">
               {PRIZES.map(prize => (
                 <div 
                   key={prize.id}
                   onClick={() => setSelectedPrize(prize)}
                   className={`cursor-pointer p-6 rounded-[32px] flex items-center gap-4 transition-all relative overflow-hidden ${
                     selectedPrize?.id === prize.id ? 'bg-[#E9535E] text-white shadow-xl translate-y-[-4px]' : 'bg-white hover:bg-[#E4E3E0] shadow-sm'
                   }`}
                 >
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm">
                     {prize.icon}
                   </div>
                   <div className="text-xl font-black uppercase leading-tight">{prize.name}</div>
                 </div>
               ))}
             </div>
          </div>

          <div className="w-full lg:w-72 space-y-8 flex flex-col justify-end">
             <button
               onClick={handleAward}
               disabled={!selectedSolution || !selectedPrize}
               className="w-full bg-black text-white p-8 font-bold uppercase rounded-full hover:opacity-90 transition-all disabled:opacity-20 shadow-xl"
             >
               Apply Seal
             </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
           <div className="bg-white p-16 text-center rounded-[60px] shadow-2xl space-y-8 max-w-2xl w-full border-4 border-white">
              <div className="w-32 h-32 bg-[#E9535E]/10 rounded-full flex items-center justify-center mx-auto">
                <Gift className="w-16 h-16 text-[#E9535E]" />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-black uppercase text-[#E9535E]">Seal Applied</h2>
                <p className="text-xl font-bold uppercase opacity-60">Waiting for other writers to finish their reviews...</p>
              </div>
              
              <div className="flex justify-center gap-4">
                {players.map(p => (
                  <div key={p.id} className={`w-4 h-4 rounded-full transition-colors ${p.status === 'awarded' ? 'bg-[#E9535E]' : 'bg-black/10'}`} />
                ))}
              </div>
           </div>
        </div>
      )}

      {isHost && everyoneAwarded && !isAwarded && (
        <div className="mt-12 flex justify-end">
           <button
             onClick={finishAwards}
             className="bg-[#E9535E] text-white px-12 py-4 font-bold uppercase rounded-full shadow-xl hover:opacity-90 transition-all active:scale-95"
           >
             Finish Notebook
           </button>
        </div>
      )}
      
      {isHost && isAwarded && (
        <div className="mt-12 flex justify-end">
           <button
             onClick={finishAwards}
             disabled={!everyoneAwarded}
             className="bg-black text-white px-12 py-4 font-bold uppercase rounded-full shadow-xl hover:opacity-90 transition-all disabled:opacity-30 active:scale-95"
           >
             Go to Finale
           </button>
        </div>
      )}
    </div>
  );
}
